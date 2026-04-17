# backend/insta_multi.py  (State-aware Instagram DM Worker)
# Controlled by listener.py orchestrator.

import warnings
warnings.simplefilter("ignore", FutureWarning)

import sys
import time
import json
import os
import re
import random
import traceback
import signal
import socket
import threading
from typing import Optional, Dict, List
from tenacity import retry, wait_exponential, stop_after_attempt
from dotenv import load_dotenv

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import (
    NoSuchElementException, WebDriverException,
    StaleElementReferenceException, TimeoutException,
)
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from bs4 import BeautifulSoup

import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

# Shared Termux/ARM Chrome utilities
from termux_utils import find_chromedriver, build_chrome_options, STEALTH_SCRIPT

# ── Script initialisation ────────────────────────────────────────────────────
if len(sys.argv) < 2:
    print("❌ FATAL: This script requires an instance_id argument.")
    sys.exit(1)

instance_id     = sys.argv[1]
WORKER_PID      = os.getpid()
WORKER_HOSTNAME = socket.gethostname()
WORKER_ID       = f"InstaWorker-{instance_id[:6]}-{WORKER_PID}"

# ── Firebase / env ───────────────────────────────────────────────────────────
load_dotenv()

try:
    firebase_admin.initialize_app()
except ValueError:
    pass

db_id = os.getenv("FIRESTORE_DATABASE_ID")
db    = firestore.client(database_id=db_id) if db_id else firestore.client()

# ── Logging ──────────────────────────────────────────────────────────────────
def log_to_db(level: str, message: str):
    try:
        db.collection("instance_logs").add({
            "instance_id": instance_id,
            "level":       level.upper(),
            "message":     str(message)[:4096],
            "timestamp":   firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        print(f"[DB_LOG_FAIL] [{level.upper()}] {message} | err={e}")

print(f"🤖 [{WORKER_ID}] Booting on {WORKER_HOSTNAME}…")
log_to_db("INFO", f"Worker PID {WORKER_PID} booting for Instagram.")

# ── Behavioural constants ────────────────────────────────────────────────────
HEARTBEAT_INTERVAL = 30   # seconds
MAIN_LOOP_SLEEP    = 30   # seconds when idle

# ── Shutdown handler ─────────────────────────────────────────────────────────
shutdown_requested = False

def handle_shutdown_signal(signum, frame):
    global shutdown_requested
    if not shutdown_requested:
        log_to_db("INFO", "Shutdown signal received.")
        shutdown_requested = True

# ── Heartbeat thread ─────────────────────────────────────────────────────────
def heartbeat_thread(stop_event: threading.Event):
    while not stop_event.is_set():
        try:
            db.collection("instagram_instances").document(instance_id).update({
                "last_heartbeat": firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            log_to_db("ERROR", f"Heartbeat failed: {e}")
        stop_event.wait(HEARTBEAT_INTERVAL)
    log_to_db("DEBUG", "Heartbeat thread stopped.")

# ── Fetch config & claim instance ────────────────────────────────────────────
try:
    log_to_db("INFO", "Fetching config from DB.")
    doc_ref = db.collection("instagram_instances").document(instance_id)
    doc     = doc_ref.get()
    if not doc.exists:
        raise Exception("No configuration found for this instance ID.")

    config = doc.to_dict()

    if not config.get("is_active"):
        log_to_db("INFO", "Instance is disabled. Exiting.")
        sys.exit(0)

    username     = config["username"]
    password     = config["password"]
    user_prompt  = config["custom_prompt"]
    user_context = config.get("context", "").strip()
    system_prompt = (
        f"ADDITIONAL CONTEXT:\n---\n{user_context}\n---\n\nSYSTEM PROMPT:\n---\n{user_prompt}"
        if user_context else user_prompt
    )

    log_to_db("INFO", f"Claiming instance for username: {username}")
    doc_ref.update({
        "status":          "linking",
        "worker_hostname": WORKER_HOSTNAME,
        "worker_pid":      WORKER_PID,
        "last_heartbeat":  firestore.SERVER_TIMESTAMP,
        "last_error":      None,
    })
except Exception as e:
    log_to_db("FATAL", f"Startup/claim failed: {e}")
    sys.exit(1)

# ── Gemini configuration ─────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
try:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set.")
    genai.configure(api_key=GEMINI_API_KEY)

    safety_settings = {
        HarmCategory.HARM_CATEGORY_HATE_SPEECH:       HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HARASSMENT:        HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }
    gen_cfg = {
        "temperature": 0.7, "top_p": 1.0, "top_k": 32,
        "max_output_tokens": 8192, "response_mime_type": "text/plain",
    }
    extraction_model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        generation_config=gen_cfg,
        safety_settings=safety_settings,
    )
    reply_model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=system_prompt,
        generation_config=gen_cfg,
        safety_settings=safety_settings,
    )
    log_to_db("INFO", "Gemini models configured.")
except Exception as e:
    msg = f"Gemini config failed: {e}"
    log_to_db("FATAL", msg)
    db.collection("instagram_instances").document(instance_id).update({
        "status": "failed", "is_active": False, "last_error": str(msg)[:1024]
    })
    sys.exit(1)

# ── Database helpers ─────────────────────────────────────────────────────────
@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def get_history_from_db(contact_username: str) -> List[Dict]:
    try:
        docs = (
            db.collection("instagram_messages")
            .where(filter=FieldFilter("instance_id",      "==", instance_id))
            .where(filter=FieldFilter("contact_username", "==", contact_username))
            .order_by("timestamp", direction=firestore.Query.ASCENDING)
            .get()
        )
        history = []
        for doc in docs:
            row  = doc.to_dict()
            role = "model" if row["sender"] in ("ai", "agent") else "user"
            history.append({"role": role, "parts": [row["message_text"]]})
        return history
    except Exception as e:
        log_to_db("ERROR", f"History fetch for {contact_username}: {e}")
        return []

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def save_message_to_db(contact_username: str, sender: str, text: str):
    try:
        db.collection("instagram_messages").add({
            "instance_id":      instance_id,
            "contact_username": contact_username,
            "sender":           "ai" if sender == "model" else sender,
            "message_text":     text,
            "is_read":          sender != "user",
            "timestamp":        firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        log_to_db("ERROR", f"Save message failed for {contact_username}: {e}")

# ── Human-like character-by-character typing ─────────────────────────────────
def human_like_type(element, text: str):
    """Type via clipboard paste per character — avoids pyperclip issues on Termux."""
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(0.06, 0.20))

# ── Main automation entry point ──────────────────────────────────────────────
def run_instagram_automation():
    driver            = None
    unhandled_exception = None

    SESSION_BASE = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "instagram_sessions"
    )

    stop_heartbeat = threading.Event()
    hb_thread      = threading.Thread(target=heartbeat_thread, args=(stop_heartbeat,), daemon=True)
    hb_thread.start()

    try:
        # ── ChromeDriver ────────────────────────────────────────────────────
        chromedriver_path = find_chromedriver(log_fn=log_to_db)
        if not chromedriver_path:
            raise Exception(
                "ChromeDriver not found. On Termux: pkg install chromium. "
                "Do NOT use ChromeDriverManager on ARM."
            )

        # ── Chrome options ──────────────────────────────────────────────────
        session_path = os.path.join(SESSION_BASE, instance_id)
        os.makedirs(session_path, exist_ok=True)

        chrome_options = build_chrome_options(
            session_path=session_path,
            proxy_server=os.getenv("PROXY_SERVER", ""),
            block_images=True,
        )

        # ── Clean stale session lock ────────────────────────────────────────
        lock = os.path.join(session_path, "SingletonLock")
        if os.path.exists(lock):
            log_to_db("WARN", "Stale lock found — removing.")
            try:
                os.remove(lock)
            except Exception as le:
                log_to_db("ERROR", f"Could not remove lock: {le}")

        # ── WebDriver initialisation (3 attempts) ───────────────────────────
        log_path = os.path.join(session_path, "chromedriver.log")
        for attempt in range(1, 4):
            try:
                log_to_db("INFO", f"WebDriver init attempt {attempt}…")
                service = Service(
                    executable_path=chromedriver_path,
                    service_args=["--verbose", f"--log-path={log_path}"],
                )
                driver = webdriver.Chrome(service=service, options=chrome_options)
                break
            except Exception as e:
                log_to_db("ERROR", f"Attempt {attempt} failed: {e}")
                if os.path.exists(log_path):
                    try:
                        with open(log_path) as lf:
                            for line in lf.readlines()[-10:]:
                                log_to_db("DEBUG", f"  CDLOG: {line.strip()}")
                    except Exception:
                        pass
                if attempt < 3:
                    time.sleep(5)
                else:
                    raise

        # ── Stealth JS ──────────────────────────────────────────────────────
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": STEALTH_SCRIPT})
        log_to_db("INFO", f"WebDriver ready. Session: {session_path}")

        # ── Login ────────────────────────────────────────────────────────────
        driver.get("https://www.instagram.com/")
        time.sleep(10)

        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//a[@href='/direct/inbox/']"))
            )
            log_to_db("INFO", "Existing session found — already logged in.")
        except TimeoutException:
            log_to_db("INFO", "No session. Logging in…")
            try:
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.NAME, "username"))
                ).send_keys(username)
                driver.find_element(By.NAME, "password").send_keys(password)
                driver.find_element(By.XPATH, "//button[@type='submit']").click()
                time.sleep(15)
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.XPATH, "//a[@href='/direct/inbox/']"))
                )
                log_to_db("INFO", "Login successful.")
            except Exception as le:
                raise Exception(f"Login failed: {le}")

        db.collection("instagram_instances").document(instance_id).update({"status": "running"})
        log_to_db("INFO", "Status → running. Entering main loop.")

        # Navigate to inbox
        driver.get("https://www.instagram.com/direct/inbox/")
        log_to_db("INFO", "Navigated to inbox.")
        time.sleep(15)

        # Dismiss notifications popup
        try:
            WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[text()='Not Now']"))
            ).click()
            log_to_db("INFO", "Dismissed notifications popup.")
            time.sleep(2)
        except (NoSuchElementException, TimeoutException):
            pass

        # ── MAIN LOOP ────────────────────────────────────────────────────────
        while not shutdown_requested:
            try:
                # isActive guard
                snap = db.collection("instagram_instances").document(instance_id).get()
                if not snap.exists or not snap.to_dict().get("is_active"):
                    log_to_db("INFO", "is_active=false. Shutting down.")
                    break

                # Look for unread message indicator
                try:
                    unread = WebDriverWait(driver, 5).until(
                        EC.presence_of_element_located((By.XPATH, "//div[text()='Unread']"))
                    )
                except TimeoutException:
                    raise NoSuchElementException("No unread indicator found.")

                log_to_db("INFO", "Unread message found. Processing…")

                # Click into the conversation
                container = unread.find_element(
                    By.XPATH, "./ancestor::div[@role='button']"
                )
                container.click()
                time.sleep(5)

                contact_username = driver.current_url.rstrip("/").split("/")[-2]
                log_to_db("INFO", f"Opened chat: {contact_username}")

                # Scrape message texts
                soup   = BeautifulSoup(driver.page_source, "html.parser")
                texts  = [
                    m.get_text(strip=True)
                    for m in soup.select("div[dir='auto'].html-div")
                ]

                # Use Gemini to structure the raw text into chat history format
                extraction_prompt = f"""
You are a data extraction expert. Convert raw Instagram DM text snippets into a clean JSON chat history.

CRITICAL INSTRUCTIONS:
1. Merge consecutive messages from the same role into one entry.
2. Identify roles: "user" (person messaging the AI) or "model" (the AI's own replies).
3. Output ONLY a valid JSON array. No preamble, no markdown fences.

SCHEMA:
[{{"role": "user"|"model", "parts": ["merged message text"]}}]

INPUT SNIPPETS:
{json.dumps(texts, ensure_ascii=False)}
"""
                try:
                    ext_resp    = extraction_model.generate_content(extraction_prompt)
                    cleaned     = ext_resp.text.strip().lstrip("```json").rstrip("```").strip()
                    structured  = json.loads(cleaned)
                except Exception as pe:
                    log_to_db("ERROR", f"Extraction/parse failed: {pe}. Skipping chat.")
                    driver.get("https://www.instagram.com/direct/inbox/")
                    time.sleep(10)
                    continue

                # Save new messages
                db_history       = get_history_from_db(contact_username)
                new_user_msgs    = []
                for msg in structured:
                    is_new = not any(
                        h["parts"][0] == msg["parts"][0] and h["role"] == msg["role"]
                        for h in db_history
                    )
                    if is_new:
                        save_message_to_db(contact_username, msg["role"], msg["parts"][0])
                        if msg["role"] == "user":
                            new_user_msgs.append(msg)

                # Generate and send reply if warranted
                if not new_user_msgs:
                    log_to_db("INFO", "No new user messages. No reply needed.")
                else:
                    full_history = get_history_from_db(contact_username)
                    if full_history and full_history[-1]["role"] == "user":
                        log_to_db("INFO", "Generating AI reply…")
                        chat_session = reply_model.start_chat(history=full_history[:-1])
                        try:
                            reply_resp = chat_session.send_message(full_history[-1]["parts"][0])
                            reply_text = reply_resp.text.strip()
                        except Exception as re_err:
                            log_to_db("ERROR", f"Reply generation failed: {re_err}")
                            reply_text = ""

                        if reply_text:
                            log_to_db("INFO", f"Sending reply to {contact_username}…")
                            try:
                                msg_input = WebDriverWait(driver, 10).until(
                                    EC.element_to_be_clickable(
                                        (By.XPATH, "//div[contains(@class, 'notranslate') and @role='textbox']")
                                    )
                                )
                                msg_input.click()
                                time.sleep(random.uniform(0.5, 1.2))
                                human_like_type(msg_input, reply_text)
                                msg_input.send_keys(Keys.RETURN)
                                save_message_to_db(contact_username, "model", reply_text)
                                log_to_db("INFO", "Reply sent and saved.")
                                time.sleep(random.randint(3, 6))
                            except Exception as send_err:
                                log_to_db("ERROR", f"Failed to send reply: {send_err}")

                # Return to inbox for next iteration
                driver.get("https://www.instagram.com/direct/inbox/")
                time.sleep(10)
                continue

            except NoSuchElementException:
                log_to_db("INFO", f"No unread messages. Sleeping {MAIN_LOOP_SLEEP}s.")
                time.sleep(MAIN_LOOP_SLEEP)
                driver.get("https://www.instagram.com/direct/inbox/")
                time.sleep(10)
                continue

            except StaleElementReferenceException:
                log_to_db("WARN", "Stale element — re-navigating to inbox.")
                driver.get("https://www.instagram.com/direct/inbox/")
                time.sleep(10)
                continue

            except WebDriverException as wde:
                raise Exception(f"Fatal WebDriverException in main loop: {wde}")

            except Exception as loop_err:
                log_to_db("ERROR", f"Loop error: {loop_err}\n{traceback.format_exc()}")
                time.sleep(MAIN_LOOP_SLEEP * 2)
                try:
                    driver.get("https://www.instagram.com/direct/inbox/")
                    time.sleep(10)
                except Exception:
                    pass
                continue

    except Exception as e:
        tb        = traceback.format_exc()
        error_msg = f"{type(e).__name__}: {e}"
        try:
            log_path = os.path.join(SESSION_BASE, instance_id, "chromedriver.log")
            if os.path.exists(log_path):
                with open(log_path) as lf:
                    tail = lf.readlines()[-15:]
                    if tail:
                        error_msg += "\n\n--- DRIVER LOG ---\n" + "".join(tail)
        except Exception:
            pass
        log_to_db("FATAL", f"Unhandled error:\n{error_msg}\n{tb}")
        unhandled_exception = error_msg

    finally:
        log_to_db("INFO", "Cleanup started…")
        stop_heartbeat.set()
        hb_thread.join()

        payload = {"worker_pid": None, "worker_hostname": None, "last_heartbeat": None}
        if unhandled_exception:
            payload["status"]    = "failed"
            payload["last_error"] = str(unhandled_exception)[:1024]
            # Disable on fatal crash — prevents infinite respawn loop
            payload["is_active"] = False
        else:
            payload["status"] = "inactive"

        try:
            db.collection("instagram_instances").document(instance_id).update(payload)
        except Exception as dbe:
            log_to_db("WARN", f"Could not release DB lock: {dbe}")

        if driver:
            try:
                driver.quit()
            except Exception:
                pass

        log_to_db("INFO", "Cleanup complete. Worker exiting.")


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, handle_shutdown_signal)
    signal.signal(signal.SIGINT,  handle_shutdown_signal)
    run_instagram_automation()
