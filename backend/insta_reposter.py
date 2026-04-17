# backend/insta_reposter.py  (SaaS Instagram Reel Reposter Daemon)
# Runs as a long-lived daemon managed by listener.py.
# Polls Firestore for active reposter jobs and processes them on schedule.

import warnings
warnings.simplefilter("ignore", FutureWarning)

import sys
import time
import os
import base64
import random
import traceback
import socket
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from tenacity import retry, wait_exponential, stop_after_attempt
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
import google.generativeai as genai
from google.api_core.exceptions import ServiceUnavailable, DeadlineExceeded
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from selenium.webdriver.common.action_chains import ActionChains

import cv2
import yt_dlp

# Shared Termux/ARM Chrome utilities
from termux_utils import find_chromedriver, build_chrome_options, STEALTH_SCRIPT

# ── Configuration ────────────────────────────────────────────────────────────
load_dotenv()

GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY")
WORKER_ID       = f"Reposter-{socket.gethostname()}-{os.getpid()}"
OUTPUT_FOLDER   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_reels_download")

# Instagram upload selectors
SELECTORS = {
    "navigation": {
        "sidebar_create_btn":     "//a[.//svg[@aria-label='New post']]",
        "sidebar_create_btn_alt": "//span[text()='Create']/ancestor::a",
        "create_menu_post":       "//span[text()='Post']",
        "file_input":             "//input[@type='file']",
        "notification_not_now":   "//button[text()='Not Now']",
    },
    "upload_flow": {
        "crop_select_btn":    "//button[@type='button'][.//svg[@aria-label='Select crop']]",
        "crop_original":      "//span[contains(text(), 'Original')]/ancestor::div[@role='button']",
        "next_btn":           "//div[@role='button' and text()='Next']",
        "caption_area":       "//div[@role='textbox' and @aria-label='Write a caption...']",
        "share_btn":          "//div[@role='button' and text()='Share']",
        "upload_confirm":     "//span[contains(text(), 'shared')] | //img[contains(@alt, 'checkmark')]",
        "close_modal_btn":    "//div[@role='button']//svg[@aria-label='Close']",
    },
}

# ── Initialise Firebase & Gemini ─────────────────────────────────────────────
try:
    try:
        firebase_admin.initialize_app()
    except ValueError:
        pass  # already initialised
    db_id = os.getenv("FIRESTORE_DATABASE_ID")
    db    = firestore.client(database_id=db_id) if db_id else firestore.client()
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"[{WORKER_ID}] SaaS Reposter Engine initialised.")
except Exception as e:
    print(f"FATAL: Initialisation failed: {e}")
    sys.exit(1)

# ── Gemini helpers ────────────────────────────────────────────────────────────
def file_to_base64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def extract_frames(video_path: str, num_frames: int = 6) -> List[str]:
    """Extract evenly-spaced frames from a video for AI analysis."""
    frames = []
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return []
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total <= 0:
            return []
        interval  = max(total // num_frames, 1)
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        out_dir   = os.path.dirname(video_path)
        for i in range(num_frames):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i * interval)
            ret, frame = cap.read()
            if ret:
                fp = os.path.join(out_dir, f"{base_name}_frame_{i}.jpg")
                cv2.imwrite(fp, frame)
                frames.append(fp)
        cap.release()
    except Exception as e:
        print(f"[{WORKER_ID}] Frame extraction warning: {e}")
    return frames

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def generate_viral_caption(video_path: str, niche: str, tone: str, cta: str) -> str:
    """Generate a niche-specific viral caption using Gemini vision."""
    print(f"[{WORKER_ID}] Generating caption — niche={niche}, tone={tone}…")

    prompt = (
        f"You are a professional social media manager specialising in '{niche}'.\n\n"
        f"**Goal:** Write a viral Instagram Reel caption based on the images (video frames).\n"
        f"**Target audience:** People interested in {niche}.\n"
        f"**Tone:** {tone}.\n"
        f"**Mandatory CTA:** \"{cta}\"\n\n"
        f"**Instructions:**\n"
        f"1. Write a scroll-stopping hook as the first line.\n"
        f"2. Add value or context related to {niche}.\n"
        f"3. End with: \"{cta}\"\n"
        f"4. Add 15-20 relevant hashtags at the bottom.\n\n"
        f"**Output:** ONLY the caption text. No preamble."
    )

    content_parts: List[Any] = [prompt]
    frames = extract_frames(video_path)
    if frames:
        for fp in frames:
            content_parts.append({
                "inline_data": {"mime_type": "image/jpeg", "data": file_to_base64(fp)}
            })
            try:
                os.remove(fp)
            except Exception:
                pass
    else:
        print(f"[{WORKER_ID}] Warning: no frames extracted — caption will be generic.")

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        generation_config={"temperature": 0.8, "top_p": 0.95, "max_output_tokens": 1000},
    )
    try:
        resp = model.generate_content(content_parts)
        return resp.text.strip()
    except Exception as e:
        print(f"[{WORKER_ID}] Caption generation failed: {e}")
        return f"Check this out! #{niche.replace(' ', '')} \n\n{cta} #viral #trending"

# ── Selenium / browser helpers ────────────────────────────────────────────────
def get_driver(session_label: str = "default") -> Optional[webdriver.Chrome]:
    """Create and return a headless Chrome driver for the reposter."""
    session_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "reposter_sessions",
        session_label,
    )
    os.makedirs(session_path, exist_ok=True)

    # Remove stale lock if present
    lock = os.path.join(session_path, "SingletonLock")
    if os.path.exists(lock):
        try:
            os.remove(lock)
        except Exception:
            pass

    log_path = os.path.join(session_path, "chromedriver.log")

    chromedriver_path = find_chromedriver(log_fn=print)
    if not chromedriver_path:
        print(f"[{WORKER_ID}] FATAL: ChromeDriver not found.")
        return None

    chrome_options = build_chrome_options(
        session_path=session_path,
        proxy_server=os.getenv("PROXY_SERVER", ""),
        block_images=True,
    )

    for attempt in range(1, 4):
        try:
            print(f"[{WORKER_ID}] WebDriver init attempt {attempt}…")
            service = Service(
                executable_path=chromedriver_path,
                service_args=["--verbose", f"--log-path={log_path}"],
            )
            driver = webdriver.Chrome(service=service, options=chrome_options)
            driver.set_window_size(1280, 800)
            driver.execute_cdp_cmd(
                "Page.addScriptToEvaluateOnNewDocument", {"source": STEALTH_SCRIPT}
            )
            print(f"[{WORKER_ID}] WebDriver ready.")
            return driver
        except Exception as e:
            print(f"[{WORKER_ID}] Attempt {attempt} failed: {e}")
            if os.path.exists(log_path):
                try:
                    with open(log_path) as lf:
                        for line in lf.readlines()[-10:]:
                            print(f"    CDLOG: {line.strip()}")
                except Exception:
                    pass
            if attempt < 3:
                time.sleep(5)
    return None

def instagram_login(driver, username: str, password: str) -> bool:
    """Log in to Instagram; returns True on success."""
    driver.get("https://www.instagram.com/")
    time.sleep(5)
    try:
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//a[@href='/direct/inbox/']"))
        )
        print(f"[{WORKER_ID}] Already logged in as {username}.")
        return True
    except TimeoutException:
        pass

    print(f"[{WORKER_ID}] Logging in as {username}…")
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "username"))
        ).send_keys(username)
        driver.find_element(By.NAME, "password").send_keys(password)
        driver.find_element(By.XPATH, "//button[@type='submit']").click()
        time.sleep(10)

        # Dismiss "Save Info" / notifications popups
        for _ in range(2):
            try:
                WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable(
                        (By.XPATH, SELECTORS["navigation"]["notification_not_now"])
                    )
                ).click()
                time.sleep(2)
            except TimeoutException:
                break

        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//a[@href='/direct/inbox/']"))
        )
        print(f"[{WORKER_ID}] Login successful.")
        return True
    except Exception as e:
        print(f"[{WORKER_ID}] Login failed: {e}")
        return False

def download_reel(url: str, output_folder: str) -> Optional[str]:
    """Download a reel via yt-dlp and return the local file path."""
    os.makedirs(output_folder, exist_ok=True)
    ydl_opts = {
        "outtmpl":    os.path.join(output_folder, "%(id)s.%(ext)s"),
        "format":     "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "quiet":      True,
        "no_warnings": True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info     = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            return filename
    except Exception as e:
        print(f"[{WORKER_ID}] Download error for {url}: {e}")
        return None

def upload_reel_selenium(driver, video_path: str, caption: str, job_id: str) -> bool:
    """
    Perform the full Instagram upload flow:
    Create → Post → Upload file → Crop (Original) → Next → Edit → Next → Caption → Share
    """
    print(f"[{WORKER_ID}] Uploading {os.path.basename(video_path)}…")
    try:
        # 1. Click Create
        try:
            WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable(
                    (By.XPATH, SELECTORS["navigation"]["sidebar_create_btn"])
                )
            ).click()
        except TimeoutException:
            print(f"[{WORKER_ID}] Trying alternate Create selector…")
            driver.find_element(
                By.XPATH, SELECTORS["navigation"]["sidebar_create_btn_alt"]
            ).click()
        time.sleep(2)

        # 2. Select "Post" from the Create menu (if shown)
        try:
            WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable(
                    (By.XPATH, SELECTORS["navigation"]["create_menu_post"])
                )
            ).click()
            print(f"[{WORKER_ID}] Clicked 'Post' from Create menu.")
        except TimeoutException:
            print(f"[{WORKER_ID}] Direct upload modal assumed open.")
        time.sleep(2)

        # 3. Upload file via hidden input
        file_input = driver.find_element(By.XPATH, SELECTORS["navigation"]["file_input"])
        file_input.send_keys(os.path.abspath(video_path))
        print(f"[{WORKER_ID}] File sent to input.")

        # 4. Select Original crop
        print(f"[{WORKER_ID}] Waiting for Crop screen…")
        WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.XPATH, SELECTORS["upload_flow"]["crop_select_btn"]))
        ).click()
        time.sleep(1)
        WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, SELECTORS["upload_flow"]["crop_original"]))
        ).click()
        print(f"[{WORKER_ID}] Selected Original crop.")
        time.sleep(1)

        # 5. Next (Crop → Edit)
        WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, SELECTORS["upload_flow"]["next_btn"]))
        ).click()
        time.sleep(2)

        # 6. Next (Edit → Caption)
        WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, SELECTORS["upload_flow"]["next_btn"]))
        ).click()
        time.sleep(2)

        # 7. Enter caption — type char by char (more reliable than clipboard on ARM)
        print(f"[{WORKER_ID}] Entering caption…")
        caption_area = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, SELECTORS["upload_flow"]["caption_area"]))
        )
        caption_area.click()
        time.sleep(1)
        for char in caption:
            caption_area.send_keys(char)
            time.sleep(random.uniform(0.02, 0.06))
        print(f"[{WORKER_ID}] Caption entered.")
        time.sleep(1)

        # 8. Share
        driver.find_element(By.XPATH, SELECTORS["upload_flow"]["share_btn"]).click()
        print(f"[{WORKER_ID}] Share clicked. Waiting for confirmation…")

        # 9. Confirm upload
        WebDriverWait(driver, 90).until(
            EC.presence_of_element_located((By.XPATH, SELECTORS["upload_flow"]["upload_confirm"]))
        )
        print(f"[{WORKER_ID}] Upload confirmed!")

        # 10. Close modal
        try:
            WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable(
                    (By.XPATH, SELECTORS["upload_flow"]["close_modal_btn"])
                )
            ).click()
        except TimeoutException:
            driver.get("https://www.instagram.com/")

        return True

    except Exception as e:
        print(f"[{WORKER_ID}] Upload failed: {e}")
        try:
            driver.save_screenshot(f"error_{job_id}_{int(time.time())}.png")
        except Exception:
            pass
        return False

# ── Job processor ─────────────────────────────────────────────────────────────
def process_job(job: Dict):
    job_id = job["id"]
    print(f"[{WORKER_ID}] Starting Job {job_id} (target: @{job.get('target_username')})")

    driver = None
    try:
        # Fetch instance credentials
        inst_doc = db.collection("instagram_instances").document(job["instance_id"]).get()
        if not inst_doc.exists:
            print(f"[{WORKER_ID}] Instance {job['instance_id']} not found.")
            db.collection("instagram_reposter_jobs").document(job_id).update({"status": "failed"})
            return
        creds = inst_doc.to_dict()

        # Init browser with per-instance session
        driver = get_driver(session_label=job["instance_id"])
        if not driver:
            db.collection("instagram_reposter_jobs").document(job_id).update({"status": "failed"})
            return

        # Login
        if not instagram_login(driver, creds["username"], creds["password"]):
            db.collection("instagram_reposter_jobs").document(job_id).update({"status": "failed"})
            return

        # Scrape reels from target profile
        target_url = f"https://www.instagram.com/{job['target_username']}/reels/"
        driver.get(target_url)
        time.sleep(5)

        anchors     = driver.find_elements(By.XPATH, "//a[contains(@href, '/reel/')]")
        reel_links  = list({a.get_attribute("href") for a in anchors})[:job.get("max_reels", 3)]
        print(f"[{WORKER_ID}] Found {len(reel_links)} reel(s).")

        processed = 0
        for link in reel_links:
            try:
                reel_id = link.rstrip("/").split("/")[-1]

                # Deduplication check
                existing = (
                    db.collection("instagram_reposter_ledger")
                    .where(filter=FieldFilter("job_id",  "==", job_id))
                    .where(filter=FieldFilter("reel_id", "==", reel_id))
                    .limit(1)
                    .get()
                )
                if existing:
                    print(f"[{WORKER_ID}] Skipping {reel_id} — already reposted.")
                    continue

                print(f"[{WORKER_ID}] Processing reel {reel_id}…")

                video_path = download_reel(link, OUTPUT_FOLDER)
                if not video_path:
                    continue

                caption = generate_viral_caption(
                    video_path,
                    niche=job.get("niche",      "General"),
                    tone= job.get("tone",       "Professional"),
                    cta=  job.get("custom_cta", "Check bio!"),
                )

                success = upload_reel_selenium(driver, video_path, caption, job_id)

                # Cleanup downloaded file
                try:
                    os.remove(video_path)
                except Exception:
                    pass

                if success:
                    db.collection("instagram_reposter_ledger").add({
                        "job_id":            job_id,
                        "reel_id":           reel_id,
                        "original_url":      link,
                        "caption_generated": caption,
                        "timestamp":         firestore.SERVER_TIMESTAMP,
                    })
                    processed += 1
                    # One reel per cycle — rate-limit protection
                    print(f"[{WORKER_ID}] Reposted 1 reel. Yielding to prevent ban.")
                    break

            except Exception as inner_e:
                print(f"[{WORKER_ID}] Error processing reel {link}: {inner_e}")
                continue

        # Update job last-run timestamp
        db.collection("instagram_reposter_jobs").document(job_id).update({
            "last_run_at": firestore.SERVER_TIMESTAMP
        })
        print(f"[{WORKER_ID}] Job {job_id} complete. Reposted: {processed}.")

    except Exception as e:
        print(f"[{WORKER_ID}] Job {job_id} failed: {e}")
        traceback.print_exc()
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass

# ── Main loop ─────────────────────────────────────────────────────────────────
def main_loop():
    print(f"[{WORKER_ID}] Starting SaaS Reposter Engine Loop…")
    while True:
        try:
            # Heartbeat
            try:
                db.collection("instagram_reposter_logs").document("runner_status").set({
                    "last_heartbeat": firestore.SERVER_TIMESTAMP,
                    "worker_id":      WORKER_ID,
                    "status":         "running",
                }, merge=True)
            except Exception:
                pass

            # Fetch active jobs
            docs = (
                db.collection("instagram_reposter_jobs")
                .where(filter=FieldFilter("status", "==", "active"))
                .get()
            )
            jobs = [{"id": doc.id, **doc.to_dict()} for doc in docs]

            jobs_run = 0
            for job in jobs:
                try:
                    last_run      = job.get("last_run_at")
                    interval_mins = job.get("repost_interval_minutes", 60)
                    should_run    = (
                        not last_run
                        or (datetime.now(timezone.utc) - last_run).total_seconds()
                        > interval_mins * 60
                    )
                    if should_run:
                        process_job(job)
                        jobs_run += 1
                except Exception as je:
                    print(f"[{WORKER_ID}] Error checking job {job.get('id')}: {je}")

            if jobs_run == 0:
                print(f"[{WORKER_ID}] No jobs due. Sleeping…")

            time.sleep(60)

        except Exception as e:
            print(f"[{WORKER_ID}] Main loop error: {e}")
            time.sleep(60)


if __name__ == "__main__":
    main_loop()
