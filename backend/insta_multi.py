
# backend/insta_multi.py.txt
# This worker is controlled by an external orchestrator (listener.py).
import warnings
# Suppress noisy deprecation warnings from the legacy SDK
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")

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
import requests
import zipfile
import stat
from dotenv import load_dotenv

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import (
    NoSuchElementException, WebDriverException, StaleElementReferenceException, TimeoutException
)
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

import pyperclip
from bs4 import BeautifulSoup

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter

# --- SCRIPT INITIALIZATION ---
if len(sys.argv) < 2:
    print("❌ FATAL: This script requires an instance_id to run.")
    sys.exit(1)

instance_id = sys.argv[1]
WORKER_PID = os.getpid()
WORKER_HOSTNAME = socket.gethostname()
WORKER_ID = f"InstaWorker-{instance_id[:6]}-{WORKER_PID}"

# --- FIREBASE CONFIG ---
from dotenv import load_dotenv
load_dotenv()

try:
    firebase_admin.initialize_app()
except ValueError:
    pass

import os
db_id = os.getenv("FIRESTORE_DATABASE_ID")
db = firestore.client(database_id=db_id) if db_id else firestore.client()

# --- DATABASE LOGGING ---
def log_to_db(level: str, message: str):
    """Logs a message to the Firestore instance_logs collection."""
    try:
        db.collection('instance_logs').add({
            "instance_id": instance_id,
            "level": level.upper(),
            "message": str(message)[:4096],
            "timestamp": firestore.SERVER_TIMESTAMP
        })
    except Exception as e:
        print(f"[DB_LOG_FAIL] Original: [{level.upper()}] {message} | Error: {e}")

print(f"🤖 [{WORKER_ID}] Booting up on host {WORKER_HOSTNAME}...")
log_to_db('INFO', f"Worker process {WORKER_PID} booting up for Instagram.")

# --- BEHAVIORAL CONFIGURATION ---
HEARTBEAT_INTERVAL = 30
MAIN_LOOP_SLEEP = 30

# --- GRACEFUL SHUTDOWN & HEARTBEAT (similar to aiwa_multi.py) ---
shutdown_requested = False
def handle_shutdown_signal(signum, frame):
    global shutdown_requested
    if not shutdown_requested:
        log_to_db("INFO", "Shutdown signal received. Initiating graceful shutdown...")
        shutdown_requested = True

def heartbeat_thread(stop_event: threading.Event):
    while not stop_event.is_set():
        try:
            db.collection("instagram_instances").document(instance_id).update({
                "last_heartbeat": firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            log_to_db("ERROR", f"CRITICAL: Could not send heartbeat: {e}.")
        stop_event.wait(HEARTBEAT_INTERVAL)
    log_to_db("DEBUG", "Heartbeat thread stopped.")

# --- FETCH CONFIG FROM DB & CLAIM INSTANCE ---
try:
    log_to_db("INFO", "Fetching configuration from database.")
    doc_ref = db.collection("instagram_instances").document(instance_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise Exception("No configuration found for this instance ID.")
    
    config = doc.to_dict()
    
    username = config['username']
    password = config['password'] # Assumes password is in plaintext in DB
    user_prompt = config['custom_prompt']
    user_context = config.get('context')
    system_prompt = f"ADDITIONAL CONTEXT:\n---\n{user_context.strip()}\n---\n\nSYSTEM PROMPT:\n---\n{user_prompt}" if user_context else user_prompt
        
    if not config['is_active']:
        log_to_db("INFO", "Instance is disabled (is_active=false). Exiting.")
        sys.exit(0)

    log_to_db("INFO", f"Attempting to claim instance for username: {username}")
    doc_ref.update({
        "status": "linking",
        "worker_hostname": WORKER_HOSTNAME,
        "worker_pid": WORKER_PID,
        "last_heartbeat": firestore.SERVER_TIMESTAMP,
        "last_error": None
    })

except Exception as e:
    error_message = f"Failed during startup/claim: {e}"
    log_to_db("FATAL", error_message)
    sys.exit(1)

# --- GEMINI CONFIGURATION ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
try:
    genai.configure(api_key=GEMINI_API_KEY)
    generation_config = {"temperature": 0.7, "top_p": 1.0, "top_k": 32, "max_output_tokens": 8192, "response_mime_type": "text/plain"}
    
    safety_settings = {
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }
    extraction_model = genai.GenerativeModel(model_name="gemma-3-27b-it", generation_config=generation_config, safety_settings=safety_settings)
    reply_model = genai.GenerativeModel(model_name="gemma-3-27b-it", system_instruction=system_prompt, generation_config=generation_config, safety_settings=safety_settings)
    log_to_db("INFO", "Gemini AI models configured successfully.")
except Exception as e:
    error_message = f"Failed to configure Gemini: {e}"
    log_to_db("FATAL", error_message)
    db.collection("instagram_instances").document(instance_id).update({"status": "failed", "is_active": False, "last_error": str(error_message)})
    sys.exit(1)


# --- DATABASE HELPERS ---
@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def get_history_from_db(contact_username: str) -> List[Dict]:
    try:
        res = db.collection("instagram_messages") \
            .where(filter=FieldFilter("instance_id", "==", instance_id)) \
            .where(filter=FieldFilter("contact_username", "==", contact_username)) \
            .order_by("timestamp", direction=firestore.Query.ASCENDING) \
            .get()
        history = []
        for doc in res:
            row = doc.to_dict()
            role = "model" if row['sender'] in ['ai', 'agent'] else "user"
            history.append({"role": role, "parts": [row['message_text']]})
        return history
    except Exception as e:
        log_to_db("ERROR", f"Error fetching history for {contact_username}: {e}")
        return []

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def save_message_to_db(contact_username: str, sender: str, text: str):
    try:
        db_sender = 'ai' if sender == 'model' else sender
        db.collection("instagram_messages").add({
            "instance_id": instance_id,
            "contact_username": contact_username,
            "sender": db_sender,
            "message_text": text,
            "is_read": db_sender != 'user',
            "timestamp": firestore.SERVER_TIMESTAMP
        })
    except Exception as e:
        log_to_db("ERROR", f"FAILED to save message to DB for {contact_username}: {e}")


# --- SELENIUM & HELPER FUNCTIONS ---
def find_or_download_chromedriver(worker_id):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    local_chromedriver_path = os.path.join(script_dir, "chromedriver-linux64", "chromedriver")
    possible_paths = [
        "/usr/bin/chromedriver",
        "/data/data/com.termux/files/usr/bin/chromedriver",
        "chromedriver.exe",
        local_chromedriver_path
    ]
    for path in possible_paths:
        if os.path.exists(path):
            log_to_db("INFO", f"Found existing ChromeDriver at: {path}")
            return path
    log_to_db("WARN", f"ChromeDriver not found. Attempting to download...")
    CHROMEDRIVER_VERSION = "127.0.6533.72"
    CHROMEDRIVER_URL = f"https://storage.googleapis.com/chrome-for-testing-public/{CHROMEDRIVER_VERSION}/linux64/chromedriver-linux64.zip"
    zip_path = os.path.join(script_dir, "chromedriver-linux64.zip")
    try:
        log_to_db("INFO", f"Downloading from {CHROMEDRIVER_URL}...")
        response = requests.get(CHROMEDRIVER_URL, stream=True)
        response.raise_for_status()
        with open(zip_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192): f.write(chunk)
        log_to_db("INFO", "Download complete. Extracting...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref: zip_ref.extractall(script_dir)
        os.remove(zip_path)
        st = os.stat(local_chromedriver_path)
        os.chmod(local_chromedriver_path, st.st_mode | stat.S_IEXEC)
        log_to_db("INFO", f"ChromeDriver is ready at: {local_chromedriver_path}")
        return local_chromedriver_path
    except Exception as e:
        log_to_db("FATAL", f"Failed to download or set up ChromeDriver: {e}")
        return None

# --- MAIN AUTOMATION LOGIC ---
def run_instagram_automation():
    driver = None
    unhandled_exception = None
    
    stop_heartbeat = threading.Event()
    heartbeat = threading.Thread(target=heartbeat_thread, args=(stop_heartbeat,))
    heartbeat.daemon = True
    heartbeat.start()

    try:
        chromedriver_path = find_or_download_chromedriver(WORKER_ID)
        if not chromedriver_path:
            raise Exception("ChromeDriver setup failed.")

        service = Service(executable_path=chromedriver_path)

        chrome_options = webdriver.ChromeOptions()
        chrome_options.add_argument('--headless=new')
        
        # IMPROVEMENT 2: Anti-Ban IP Proxy Configuration
        proxy_server = os.getenv("PROXY_SERVER", "")
        if proxy_server:
            chrome_options.add_argument(f'--proxy-server={proxy_server}')
            log_to_db("INFO", "Masking traffic through proxy...")
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument("--disable-software-rasterizer")
        chrome_options.add_argument("--metrics-recording-only")
        chrome_options.add_argument("--mute-audio")
        chrome_options.add_argument("--no-first-run")
        chrome_options.add_argument("--no-default-browser-check")
        chrome_options.add_argument("--disable-application-cache")
        # Block images and heavy media to conserve RAM on termux
        chrome_options.add_experimental_option("prefs", {"profile.managed_default_content_settings.images": 2})
        chrome_options.page_load_strategy = "eager"
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36")
        
        session_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "instagram_sessions", instance_id)
        os.makedirs(session_path, exist_ok=True)
        chrome_options.add_argument(f"--user-data-dir={session_path}")
        
        driver = webdriver.Chrome(service=service, options=chrome_options)
        log_to_db("INFO", f"WebDriver initialized with driver at {chromedriver_path}. Session path: {session_path}")

        # --- LOGIN ---
        driver.get("https://www.instagram.com/")
        time.sleep(10)
        
        # Check if already logged in by looking for the inbox icon
        try:
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//a[@href='/direct/inbox/']")))
            log_to_db("INFO", "Existing session found. Already logged in.")
        except TimeoutException:
            log_to_db("INFO", "No active session. Attempting to log in...")
            try:
                WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.NAME, "username"))).send_keys(username)
                driver.find_element(By.NAME, "password").send_keys(password)
                driver.find_element(By.XPATH, "//button[@type='submit']").click()
                time.sleep(15)
                # Check for login success
                WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.XPATH, "//a[@href='/direct/inbox/']")))
                log_to_db("INFO", "Login successful.")
            except Exception as login_err:
                raise Exception(f"Failed during login process: {login_err}")

        supabase_update = db.collection("instagram_instances").document(instance_id).update({"status": "running"})
        log_to_db("INFO", "Instance status set to 'running'. Entering main loop.")
        # --- MAIN LOOP ---
        # Navigate to inbox once to start, and handle initial popup.
        driver.get("https://www.instagram.com/direct/inbox/")
        log_to_db("INFO", "Navigated to inbox.")
        time.sleep(15)
        try:
            not_now_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[text()='Not Now']"))
            )
            not_now_button.click()
            log_to_db("INFO", "Dismissed 'Turn on Notifications' popup.")
            time.sleep(2)
        except (NoSuchElementException, TimeoutException):
            pass # Popup wasn't there, continue

        while not shutdown_requested:
            try:
                # 1. Check if instance is still active in DB before processing
                doc = db.collection("instagram_instances").document(instance_id).get()
                if not doc.exists or not doc.to_dict().get('is_active'):
                    log_to_db("INFO", "Instance is_active=false in DB. Shutting down.")
                    break

                # 2. Look for an unread message
                # This is now the primary action of the loop.
                unread_indicator = driver.find_element(By.XPATH, "//div[text()='Unread']")
                log_to_db("INFO", "New unread message found. Processing...")

                # Click the clickable parent element
                message_container = unread_indicator.find_element(By.XPATH, "./ancestor::div[@role='button']")
                message_container.click()
                time.sleep(5) # Wait for chat to load

                contact_username = driver.current_url.split('/')[-2]
                log_to_db("INFO", f"Opened chat with: {contact_username}")

                # Scrape message texts from the page
                soup = BeautifulSoup(driver.page_source, 'html.parser')
                message_elements = soup.select("div[dir='auto'].html-div")
                html_div_data = [msg.get_text(strip=True) for msg in message_elements]

                # Use the detailed extraction prompt from the user's script
                extraction_prompt = f"""
You are a data extraction expert. Your task is to convert raw text snippets from an Instagram DM into a clean JSON chat history.

**CRITICAL INSTRUCTIONS:**
1.  **Merge Consecutive Messages:** If there are multiple messages in a row from the same role ("user" or "model"), you MUST merge them into a single entry.
2.  **Identify Roles:** Correctly identify if a message is from the "user" (the person messaging the AI) or the "model" (the AI's own messages).
3.  **Strict Schema:** The output must be a valid JSON array following the specified schema. Do not add any extra text.

**EXAMPLE:**
*Input Text Snippets:*
```
["Hey!", "How are you?", "I'm good, thanks! Just exploring.", "Cool!", "Where are you?", "What are you doing"]
```

*Correct Output JSON:*
```json
[
  {{
    "role": "user",
    "parts": [
      "Hey! How are you?"
    ]
  }},
  {{
    "role": "model",
    "parts": [
      "I'm good, thanks! Just exploring."
    ]
  }},
  {{
    "role": "user",
    "parts": [
      "Cool! Where are you? What are you doing"
    ]
  }}
]
```

**Now, process the following input text snippets:**
```
{html_div_data}
```
"""
                # Generate structured data from message texts
                extraction_res = extraction_model.generate_content(extraction_prompt)
                cleaned_response = extraction_res.text.replace("```json\n", "").replace("```", "").strip()
                structured_data = json.loads(cleaned_response)

                # Get existing history and save new messages
                db_history = get_history_from_db(contact_username)
                new_messages_from_user = []
                for msg_data in structured_data:
                    # Check if message already exists in DB history
                    is_new = not any(h['parts'][0] == msg_data['parts'][0] and h['role'] == msg_data['role'] for h in db_history)
                    if is_new:
                        log_to_db("DEBUG", f"Saving new message from '{msg_data['role']}' to DB.")
                        save_message_to_db(contact_username, msg_data['role'], msg_data['parts'][0])
                        if msg_data['role'] == 'user':
                            new_messages_from_user.append(msg_data)

                # Check if a reply is warranted
                if not new_messages_from_user:
                    log_to_db("INFO", "No new messages from the user. No reply needed.")
                else:
                    # Generate reply using the full, updated history
                    full_history = get_history_from_db(contact_username)
                    if full_history and full_history[-1]['role'] == 'user':
                        log_to_db("INFO", "Generating AI reply...")
                        # Use start_chat for conversation context
                        reply_chat_session = reply_model.start_chat(history=full_history[:-1])
                        reply_res = reply_chat_session.send_message(full_history[-1]['parts'][0])
                        reply_text = reply_res.text

                        log_to_db("INFO", f"Sending AI reply to {contact_username}: '{reply_text[:60].strip()}'...")
                        
                        # Human-like typing simulation
                        message_input = driver.find_element(By.XPATH, "//div[contains(@class, 'notranslate') and @role='textbox']")
                        message_input.click()
                        time.sleep(random.uniform(0.5, 1.2))

                        for char in reply_text:
                            pyperclip.copy(char)
                            ActionChains(driver).key_down(Keys.CONTROL).send_keys('v').key_up(Keys.CONTROL).perform()
                            time.sleep(random.uniform(0.07, 0.22))
                        
                        message_input.send_keys(Keys.RETURN)
                        save_message_to_db(contact_username, 'model', reply_text)
                        log_to_db("INFO", "Reply sent and saved successfully.")
                        time.sleep(random.randint(3, 6))

                # After processing, always go back to the inbox to check for the next message
                driver.get("https://www.instagram.com/direct/inbox/")
                time.sleep(10)
                continue # Immediately loop to check for another unread message

            except NoSuchElementException:
                # This is the expected state when no unread messages are found.
                log_to_db("INFO", f"No new messages found. Sleeping for {MAIN_LOOP_SLEEP} seconds.")
                time.sleep(MAIN_LOOP_SLEEP)
                
                # After sleeping, refresh the inbox to check for new messages.
                log_to_db("INFO", "Refreshing inbox...")
                driver.get("https://www.instagram.com/direct/inbox/")
                time.sleep(10)
                continue

            except StaleElementReferenceException:
                log_to_db("WARN", "Stale element reference, re-navigating to inbox to rescan.")
                driver.get("https://www.instagram.com/direct/inbox/")
                time.sleep(10)
                continue # Restart the loop
            
            except WebDriverException as wde:
                raise Exception(f"WebDriverException in main loop: {wde}") # Escalate to main error handler

            except Exception as loop_err:
                log_to_db("ERROR", f"An unexpected error occurred in the main loop: {loop_err}\n{traceback.format_exc()}")
                log_to_db("INFO", f"Sleeping for {MAIN_LOOP_SLEEP * 2}s due to error and retrying.")
                time.sleep(MAIN_LOOP_SLEEP * 2)
                # Attempt to recover by going back to the inbox
                driver.get("https://www.instagram.com/direct/inbox/")
                time.sleep(10)
                continue

            
    except Exception as e:
        error_message = f"{type(e).__name__}: {e}"
        tb_str = traceback.format_exc()
        log_to_db("FATAL", f"Unhandled Error: {error_message}\nTraceback:\n{tb_str}")
        unhandled_exception = error_message
    finally:
        log_to_db("INFO", "Shutdown initiated. Cleaning up...")
        stop_heartbeat.set()
        heartbeat.join()
        
        update_payload = {"worker_pid": None, "worker_hostname": None, "last_heartbeat": None}
        if unhandled_exception:
            update_payload["status"] = "failed"
            update_payload["last_error"] = str(unhandled_exception)[:1024]
        else:
            update_payload["status"] = "inactive"

        try:
            db.collection("instagram_instances").document(instance_id).update(update_payload)
        except Exception as db_err:
            log_to_db("WARN", f"Could not release instance lock in DB: {db_err}")

        if driver:
            try: driver.quit()
            except: pass
        
        log_to_db("INFO", "Cleanup complete. Worker exiting.")

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, handle_shutdown_signal)
    signal.signal(signal.SIGINT, handle_shutdown_signal)
    run_instagram_automation()
