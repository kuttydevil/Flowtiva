
import warnings
# Suppress noisy deprecation warnings from the legacy SDK
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")

import os
import time
import json
import shutil
import random
import requests
import datetime
import zipfile
import stat
import threading
import socket
import base64
import traceback
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from tenacity import retry, wait_exponential, stop_after_attempt
from dotenv import load_dotenv

# Firebase & Generative AI
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter
import google.generativeai as genai
from google.api_core.exceptions import ServiceUnavailable, DeadlineExceeded
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Selenium & Media Processing
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager
import cv2
import yt_dlp
import pyperclip

# --- CONFIGURATION (SaaS Mode) ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 

WORKER_ID = f"Reposter-{socket.gethostname()}-{os.getpid()}"
OUTPUT_FOLDER = "temp_reels_download"

# Hardcoded Selectors (Based on your successful local test)
SELECTORS = {
    "navigation": {
        "sidebar_create_btn": "//a[.//svg[@aria-label='New post']]",
        "sidebar_create_btn_alt": "//span[text()='Create']/ancestor::a",
        "create_menu_post": "//span[text()='Post']",
        "file_input": "//input[@type='file']",
        "notification_not_now": "//button[text()='Not Now']"
    },
    "upload_flow": {
        "crop_select_btn": "//button[@type='button'][.//svg[@aria-label='Select crop']]",
        "crop_original_option": "//span[contains(text(), 'Original')]/ancestor::div[@role='button']",
        "next_btn": "//div[@role='button' and text()='Next']",
        "caption_area": "//div[@role='textbox' and @aria-label='Write a caption...']",
        "share_btn": "//div[@role='button' and text()='Share']",
        "upload_confirm": "//span[contains(text(), 'shared')] | //img[contains(@alt, 'checkmark')]",
        "close_modal_btn": "//div[@role='button']//svg[@aria-label='Close']"
    }
}

# Initialize Clients
try:
    load_dotenv()
    try:
        firebase_admin.initialize_app()
    except ValueError:
        pass
    import os
    db_id = os.getenv("FIRESTORE_DATABASE_ID")
    db = firestore.client(database_id=db_id) if db_id else firestore.client()
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"[{WORKER_ID}] SaaS Reposter Engine initialized.")
except Exception as e:
    print(f"FATAL: Initialization failed: {e}")
    exit(1)

# --- GEMINI HELPERS ---
def file_to_base64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')

def extract_frames(video_path, num_frames=6):
    """Extracts frames for AI analysis."""
    frames = []
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened(): return []
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0: return []
        interval = total_frames // num_frames
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        
        for i in range(num_frames):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i * interval)
            ret, frame = cap.read()
            if ret:
                frame_path = os.path.join(os.path.dirname(video_path), f"{base_name}_frame_{i}.jpg")
                cv2.imwrite(frame_path, frame)
                frames.append(frame_path)
        cap.release()
    except Exception as e:
        print(f"[{WORKER_ID}] Frame extraction warning: {e}")
    return frames

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def generate_viral_caption(video_path, niche, tone, cta):
    """
    Generates a dynamic caption using gemma-3-27b-it.
    Uses Base64 frames as requested.
    """
    print(f"[{WORKER_ID}] Generating caption for Niche: {niche}, Tone: {tone}...")
    
    content_parts = []
    
    prompt_text = f"""
    You are a professional social media manager specializing in the '{niche}' industry.
    
    **Goal:** Write a viral Instagram Reel caption based on the images provided (frames from a video).
    **Target Audience:** People interested in {niche}.
    **Tone:** {tone}.
    **Mandatory Call to Action (CTA):** "{cta}"

    **Instructions:**
    1. Analyze the visual content from the provided images.
    2. Write a 'Hook' (first line) that stops the scroll. Use the {tone} tone.
    3. Provide value or context related to {niche}.
    4. End with the specific CTA: "{cta}".
    5. Add 15-20 relevant hashtags for {niche} at the bottom.

    **Output:** Provide ONLY the caption text. No "Here is the caption" preambles.
    """
    content_parts.append(prompt_text)

    frames = extract_frames(video_path)
    if frames:
        for f_path in frames:
            b64_data = file_to_base64(f_path)
            content_parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": b64_data
                }
            })
            try: os.remove(f_path)
            except: pass
    else:
        print(f"[{WORKER_ID}] Warning: No frames extracted. Caption will be generic.")

    model = genai.GenerativeModel(
        model_name="gemma-3-27b-it", 
        generation_config={
            "temperature": 0.8,
            "top_p": 0.95,
            "max_output_tokens": 1000,
        }
    )

    for attempt in range(3):
        try:
            response = model.generate_content(content_parts)
            return response.text.strip()
        except (ServiceUnavailable, DeadlineExceeded) as e:
             print(f"[{WORKER_ID}] Gemini API error (attempt {attempt+1}): {e}")
             time.sleep(5)
        except Exception as e:
             print(f"[{WORKER_ID}] Unexpected Gemini error: {e}")
             break
             
    return f"Check this out! {niche} \n\n{cta} #viral #trending"

# --- SELENIUM HELPERS ---
def get_driver():
    try:
        chrome_options = webdriver.ChromeOptions()
        chrome_options.add_argument('--headless=new')
        
        # IMPROVEMENT 2: Anti-Ban IP Proxy Configuration
        proxy_server = os.getenv("PROXY_SERVER", "")
        if proxy_server:
            chrome_options.add_argument(f'--proxy-server={proxy_server}')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument("--disable-software-rasterizer")
        chrome_options.add_argument("--metrics-recording-only")
        chrome_options.add_argument("--mute-audio")
        chrome_options.add_argument("--no-first-run")
        chrome_options.add_argument("--no-default-browser-check")
        chrome_options.add_argument("--disable-application-cache")
        # Block images and heavy media
        chrome_options.add_experimental_option("prefs", {"profile.managed_default_content_settings.images": 2})
        chrome_options.page_load_strategy = "eager"
        # Persistent session
        chrome_options.add_argument(f"--user-data-dir={os.path.join(os.getcwd(), 'selenium_reposter_session')}")
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        return driver
    except Exception as e:
        print(f"Driver Error: {e}")
        return None

def download_reel(url, output_folder):
    os.makedirs(output_folder, exist_ok=True)
    ydl_opts = {
        'outtmpl': os.path.join(output_folder, '%(id)s.%(ext)s'),
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'quiet': True,
        'no_warnings': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            return filename
    except Exception as e:
        print(f"Download error for {url}: {e}")
        return None

# --- CORE UPLOAD FUNCTION (Based on your Log) ---
def upload_reel_selenium(driver, video_path, caption):
    """
    Performs the upload process using the robust selectors and flow from your local test.
    Flow: Create -> Post -> Upload -> Crop(Original) -> Next -> Edit -> Next -> Caption(Clipboard) -> Share
    """
    print(f"[{WORKER_ID}] Starting upload sequence for {os.path.basename(video_path)}")
    
    # 1. Click Create
    try:
        try:
            create_btn = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, SELECTORS["navigation"]["sidebar_create_btn"])))
            create_btn.click()
        except TimeoutException:
            print("Trying alternate Create button selector...")
            create_btn = driver.find_element(By.XPATH, SELECTORS["navigation"]["sidebar_create_btn_alt"])
            create_btn.click()
        
        time.sleep(2)

        # 2. Check for "Post" menu item (if Create opens a menu)
        try:
            post_menu = WebDriverWait(driver, 3).until(EC.element_to_be_clickable((By.XPATH, SELECTORS["navigation"]["create_menu_post"])))
            post_menu.click()
            print("Clicked 'Post' from Create menu.")
        except TimeoutException:
            print("Direct upload modal likely open.")

        # 3. Upload File (Hidden Input)
        time.sleep(2)
        file_input = driver.find_element(By.XPATH, SELECTORS["navigation"]["file_input"])
        file_input.send_keys(os.path.abspath(video_path))
        print(f"File {os.path.basename(video_path)} sent to input.")

        # 4. Crop to Original
        print("Waiting for Crop screen...")
        crop_btn = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.XPATH, SELECTORS["upload_flow"]["crop_select_btn"])))
        crop_btn.click()
        time.sleep(1)
        
        original_option = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.XPATH, SELECTORS["upload_flow"]["crop_original_option"])))
        original_option.click()
        print("Selected 'Original' crop.")
        time.sleep(1)

        # 5. Navigate Next (Crop -> Edit)
        next_btn = driver.find_element(By.XPATH, SELECTORS["upload_flow"]["next_btn"])
        next_btn.click()
        time.sleep(2)

        # 6. Navigate Next (Edit -> Caption)
        next_btn = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, SELECTORS["upload_flow"]["next_btn"])))
        next_btn.click()
        time.sleep(2)

        # 7. Enter Caption via Clipboard (Crucial Fix)
        print("Entering caption via Clipboard...")
        caption_area = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, SELECTORS["upload_flow"]["caption_area"])))
        caption_area.click()
        time.sleep(1)
        
        pyperclip.copy(caption)
        actions = ActionChains(driver)
        # Use Control+V for Windows/Linux, Command+V logic could be added for Mac if running locally
        actions.key_down(Keys.CONTROL).send_keys('v').key_up(Keys.CONTROL).perform()
        time.sleep(2)
        print("Caption pasted.")

        # 8. Share
        share_btn = driver.find_element(By.XPATH, SELECTORS["upload_flow"]["share_btn"])
        share_btn.click()
        print("Clicked Share. Waiting for confirmation...")

        # 9. Confirm Upload
        WebDriverWait(driver, 60).until(EC.presence_of_element_located((By.XPATH, SELECTORS["upload_flow"]["upload_confirm"])))
        print("Upload confirmed!")

        # 10. Close Modal
        try:
            close_btn = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.XPATH, SELECTORS["upload_flow"]["close_modal_btn"])))
            close_btn.click()
        except TimeoutException:
            print("Could not close modal via button. Reloading page.")
            driver.get("https://www.instagram.com/")

        return True

    except Exception as e:
        print(f"Upload failed: {e}")
        # Save screenshot for debugging
        try:
            driver.save_screenshot(f"error_{WORKFLOW_ID}_{time.time()}.png")
        except: pass
        return False

# --- JOB PROCESSOR ---

def process_job(job):
    print(f"[{WORKER_ID}] Starting Job {job['id']} (Target: @{job['target_username']})")
    
    driver = None
    try:
        # 1. Fetch Credentials
        doc = db.collection("instagram_instances").document(job['instance_id']).get()
        if not doc.exists:
            print("Instance not found.")
            return
        
        instance_creds = doc.to_dict()
        
        # 2. Init Browser
        driver = get_driver()
        if not driver: return
        driver.set_window_size(1280, 800)
        
        # 3. Login
        driver.get("https://www.instagram.com/")
        time.sleep(5)
        
        try:
            WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.XPATH, "//a[@href='/direct/inbox/']")))
            print("Already logged in.")
        except TimeoutException:
            print(f"Logging in as {instance_creds['username']}...")
            try:
                WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.NAME, "username"))).send_keys(instance_creds['username'])
                driver.find_element(By.NAME, "password").send_keys(instance_creds['password'])
                driver.find_element(By.XPATH, "//button[@type='submit']").click()
                time.sleep(10)
                # Dismiss "Save Info" or "Notifications"
                try:
                    not_now = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.XPATH, SELECTORS["navigation"]["notification_not_now"])))
                    not_now.click()
                except: pass
            except Exception as e:
                print(f"Login failed: {e}")
                db.collection("instagram_reposter_jobs").document(job['id']).update({"status": "failed"})
                return

        # 4. Scrape
        target_url = f"https://www.instagram.com/{job['target_username']}/reels/"
        driver.get(target_url)
        time.sleep(5)
        
        anchors = driver.find_elements(By.XPATH, "//a[contains(@href, '/reel/')]")
        found_links = [a.get_attribute("href") for a in anchors][:job['max_reels']]
        print(f"Found {len(found_links)} reels.")
        
        for link in found_links:
            try:
                # 5. Deduplicate
                reel_id = link.rstrip('/').split('/')[-1]
                ledger_ref = db.collection("instagram_reposter_ledger")
                query = ledger_ref.where(filter=FieldFilter("job_id", "==", job['id'])).where(filter=FieldFilter("reel_id", "==", reel_id)).limit(1)
                existing = query.get()
                
                if existing:
                    print(f"Skipping {reel_id} (Already reposted).")
                    continue
                
                print(f"Processing new reel: {reel_id}")
                
                # 6. Download
                video_path = download_reel(link, OUTPUT_FOLDER)
                if not video_path: continue
                
                # 7. Generate Caption
                caption = generate_viral_caption(
                    video_path, 
                    niche=job.get('niche', 'General'), 
                    tone=job.get('tone', 'Professional'), 
                    cta=job.get('custom_cta', 'Check bio!')
                )
                
                # 8. Upload (REAL)
                success = upload_reel_selenium(driver, video_path, caption)
                
                if success:
                    db.collection("instagram_reposter_ledger").add({
                        "job_id": job['id'],
                        "reel_id": reel_id,
                        "original_url": link,
                        "caption_generated": caption,
                        "timestamp": firestore.SERVER_TIMESTAMP
                    })
                    
                    # Cleanup
                    try: os.remove(video_path)
                    except: pass
                    
                    # Rate Limit
                    print("Processed 1 reel. Yielding to prevent ban.")
                    break 

            except Exception as inner_e:
                print(f"Error processing reel {link}: {inner_e}")
                continue

        # Update Last Run
        db.collection("instagram_reposter_jobs").document(job['id']).update({"last_run_at": firestore.SERVER_TIMESTAMP})
        
    except Exception as e:
        print(f"Job failed: {e}")
        traceback.print_exc()
    finally:
        if driver: 
            try: driver.quit()
            except: pass

def main_loop():
    print(f"[{WORKER_ID}] Starting SaaS Reposter Engine Loop...")
    while True:
        try:
            # 1. Update heartbeat for reposter
            try:
                db.collection("instagram_reposter_logs").document("runner_status").set({
                    "last_heartbeat": firestore.SERVER_TIMESTAMP,
                    "worker_id": WORKER_ID,
                    "status": "running"
                })
            except Exception as hb_err:
                pass
                
            jobs_ref = db.collection("instagram_reposter_jobs")
            query = jobs_ref.where(filter=FieldFilter("status", "==", "active"))
            docs = query.get()
            
            jobs = [{"id": doc.id, **doc.to_dict()} for doc in docs]
            
            jobs_processed = 0
            for job in jobs:
                try:
                    last_run = job.get('last_run_at')
                    interval_mins = job.get('repost_interval_minutes', 60)
                    should_run = False
                    if not last_run:
                        should_run = True
                    else:
                        # Firestore timestamp is a datetime object in Python
                        last_run_dt = last_run
                        if (datetime.now(timezone.utc) - last_run_dt).total_seconds() > (interval_mins * 60):
                            should_run = True
                    
                    if should_run:
                        process_job(job)
                        jobs_processed += 1
                except Exception as job_err:
                    print(f"Error checking job {job.get('id')}: {job_err}")

            if jobs_processed == 0:
                print(f"[{WORKER_ID}] No jobs due. Sleeping...")
            
            time.sleep(60) 
        except Exception as e:
            print(f"Main loop error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    main_loop()
