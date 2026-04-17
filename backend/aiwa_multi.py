
# aiwa_multi.py (State-aware Worker)
# This worker is controlled by an external orchestrator (listener.py).
# It relies on the `is_active` flag in the database to manage its lifecycle.
# 1. On startup, it "claims" its instance by writing its PID and hostname to the DB.
# 2. It sends a periodic heartbeat to signal its health.
# 3. In its main loop, it periodically checks `is_active`. If it becomes false, it shuts down.
#
# --- Headless Setup (Termux / Kali NetHunter) ---
# To run this script in a headless environment, ensure the following are installed:
# 1. Python & Pip:
#    - Termux: `pkg install python`
#    - Kali: `sudo apt-get install python3 python3-pip`
# 2. ChromeDriver:
#    - This script will attempt to automatically download ChromeDriver if it's not found.
#    - Manual install (optional): `pkg install chromedriver` (Termux) or `sudo apt-get install chromium-chromedriver` (Kali).
# 3. Python dependencies:
#    - `pip install supabase selenium google-generativeai beautifulsoup4 Pillow requests psutil`
# 4. In some setups, you may need to run `chromedriver` in a separate session.
import warnings
warnings.simplefilter('ignore', FutureWarning)

import sys
import time
import json
import os
import base64
import re
import random
import traceback
import tempfile
import signal
import requests
import zipfile
import stat
import socket
import threading
from typing import Any, Optional, Tuple, Dict, List
from tenacity import retry, wait_exponential, stop_after_attempt
from dotenv import load_dotenv

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
WORKER_ID = f"Worker-{instance_id[:6]}-{WORKER_PID}"

# --- FIREBASE CONFIG ---
load_dotenv()

try:
    firebase_admin.initialize_app()
except ValueError:
    pass

db_id = os.getenv("FIRESTORE_DATABASE_ID")
db = firestore.client(database_id=db_id) if db_id else firestore.client()

# --- DATABASE LOGGING ---
def log_to_db(level: str, message: str, instance_id_str: str = instance_id):
    """Logs a message to the Firestore instance_logs collection."""
    try:
        db.collection('instance_logs').add({
            "instance_id": instance_id_str,
            "level": level.upper(),
            "message": str(message)[:4096],
            "timestamp": firestore.SERVER_TIMESTAMP
        })
    except Exception as e:
        print(f"[DB_LOG_FAIL] Original: [{level.upper()}] {message} | Error: {e}")

print(f"🤖 [{WORKER_ID}] Booting up on host {WORKER_HOSTNAME}...")
log_to_db('INFO', f"Worker process {WORKER_PID} booting up.")

# --- FETCH CONFIG FROM DB & CLAIM INSTANCE (FAST TRACK) ---
try:
    doc_ref = db.collection("whatsapp_instances").document(instance_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise Exception("No configuration found for this instance ID.")
    
    config = doc.to_dict()
    if not config.get('isActive'):
        print("Instance is disabled. Exiting.")
        sys.exit(0)

    # Claim IMMEDIATELY before loading heavy libraries
    doc_ref.update({
        "status": "linking",
        "worker_hostname": WORKER_HOSTNAME,
        "worker_pid": WORKER_PID,
        "last_heartbeat": firestore.SERVER_TIMESTAMP,
        "last_error": None
    })
except Exception as e:
    print(f"Failed during early claim: {e}")
    sys.exit(1)

# --- HEAVY IMPORTS (DEFERRED) ---
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import (
    NoSuchElementException, InvalidSelectorException, ElementNotInteractableException,
    WebDriverException, StaleElementReferenceException, JavascriptException, TimeoutException
)
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import google.generativeai as genai
from google.api_core.exceptions import ServiceUnavailable
from google.generativeai.types import HarmCategory, HarmBlockThreshold, generation_types

from bs4 import BeautifulSoup


# --- BEHAVIORAL CONFIGURATION ---
MIN_SHORT_INTERACTION_DELAY = 1.8
MAX_SHORT_INTERACTION_DELAY = 3.5
MIN_POST_ACTION_DELAY = 12.0
MAX_POST_ACTION_DELAY = 25.0
MIN_MAIN_LOOP_SLEEP = 8.0
MAX_MAIN_LOOP_SLEEP = 18.0
HEARTBEAT_INTERVAL = 30  # seconds
VIEWPORTS = ["1920,1080", "1600,900", "1440,900", "1366,768"]

# --- GRACEFUL SHUTDOWN HANDLER ---
shutdown_requested = False
def handle_shutdown_signal(signum, frame):
    global shutdown_requested
    if not shutdown_requested:
        signal_name = signal.Signals(signum).name if hasattr(signal, 'Signals') else f"Signal {signum}"
        log_to_db("INFO", f"Received {signal_name}. Initiating graceful shutdown...")
        shutdown_requested = True

# --- WORKER HEARTBEAT THREAD ---
def heartbeat_thread(stop_event: threading.Event):
    """Sends a heartbeat to the database at a regular interval."""
    while not stop_event.is_set():
        try:
            db.collection("whatsapp_instances").document(instance_id).update({
                "last_heartbeat": firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            log_to_db("ERROR", f"CRITICAL: Could not send heartbeat: {e}. Worker might be considered a zombie.")
        
        stop_event.wait(HEARTBEAT_INTERVAL)
    log_to_db("DEBUG", "Heartbeat thread stopped.")

# --- PREPARE RUNTIME CONFIG ---
try:
    phone_number_to_input = re.sub(r'\D', '', config['phoneNumber'])
    user_prompt = config['customPrompt']
    user_context = config.get('context')
    if user_context and user_context.strip():
        system_prompt_reply = f"ADDITIONAL CONTEXT:\n---\n{user_context.strip()}\n---\n\nSYSTEM PROMPT:\n---\n{user_prompt}"
    else:
        system_prompt_reply = user_prompt
        
    enabled_tools = config.get('enabled_tools') or []

    # Configuration is ready
except Exception as e:
    error_message = f"Failed during startup/claim: {e}"
    log_to_db("FATAL", error_message)
    sys.exit(1)

# --- GEMINI CONFIG & FUNCTION CALLING DEFINITIONS ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Tool definitions
update_crm_stage = genai.protos.FunctionDeclaration(
    name='update_crm_stage',
    description="Update the contact's stage in the CRM pipeline.",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            'stage': genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="The new CRM stage for the contact.",
                enum=['New', 'Contacted', 'Proposal', 'Won', 'Lost']
            )
        },
        required=['stage']
    )
)

add_tag = genai.protos.FunctionDeclaration(
    name='add_tag',
    description="Add a descriptive tag to the contact's profile.",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            'tag': genai.protos.Schema(type=genai.protos.Type.STRING, description="The tag to add, e.g., 'hot lead', 'follow-up needed'.")
        },
        required=['tag']
    )
)

set_due_date = genai.protos.FunctionDeclaration(
    name='set_due_date',
    description="Set a due date for a follow-up or task related to this contact.",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            'date': genai.protos.Schema(type=genai.protos.Type.STRING, description="The due date in YYYY-MM-DD format.")
        },
        required=['date']
    )
)

update_priority = genai.protos.FunctionDeclaration(
    name='update_priority',
    description="Update the contact's priority level.",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            'priority': genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="The new priority level.",
                enum=['High', 'Medium', 'Low']
            )
        },
        required=['priority']
    )
)

# A dictionary to hold all available tool definitions
ALL_TOOLS_DEFINITIONS = {
    'update_crm_stage': update_crm_stage,
    'add_tag': add_tag,
    'set_due_date': set_due_date,
    'update_priority': update_priority,
}

try:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set.")
    genai.configure(api_key=GEMINI_API_KEY)

    safety_settings = {
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }

    tools_for_this_instance = [ALL_TOOLS_DEFINITIONS[tool_name] for tool_name in enabled_tools if tool_name in ALL_TOOLS_DEFINITIONS]
    
    jayakrishnan_reply_model = genai.GenerativeModel(
        model_name="gemma-3-27b-it", # Switched to Gemma 3 27B
        system_instruction=system_prompt_reply,
        safety_settings=safety_settings,
        tools=tools_for_this_instance if tools_for_this_instance else None
    )
    log_to_db("INFO", f"Reply model initialized with {len(tools_for_this_instance)} tools enabled.")

    outreach_model = genai.GenerativeModel(
        model_name="gemma-3-27b-it", # Switched to Gemma 3 27B
        system_instruction="""
        You are a message personalization AI. Your task is to take a user-provided template and a set of variables and craft a natural, human-sounding WhatsApp message.

        **RULES:**
        1.  Use the provided template as the core of the message.
        2.  Seamlessly integrate the variables into the template.
        3.  Adjust phrasing slightly to make it sound less like a template and more like a personal message. For example, add a natural greeting if one isn't present.
        4.  Do not add any information not present in the template or variables.
        5.  Output ONLY the final message text. Do not add any extra explanations or greetings like "Here is the message:".
        """,
        safety_settings=safety_settings
    )
    log_to_db("INFO", "Gemini AI models configured successfully.")
except Exception as e:
    error_message = f"Failed to configure Gemini: {e}"
    log_to_db("FATAL", error_message)
    db.collection("whatsapp_instances").document(instance_id).update({
        "status": "failed", 
        "isActive": False, 
        "last_error": str(error_message)[:1024]
    })
    sys.exit(1)

# --- DATABASE INTERACTION REFACTOR (Functions are mostly unchanged) ---
@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def get_history_from_db(instance_id_str, contact_name_str):
    history = []
    try:
        messages_ref = db.collection("whatsapp_messages")
        query = messages_ref.where(filter=FieldFilter("instanceId", "==", instance_id_str)) \
            .where(filter=FieldFilter("contactName", "==", contact_name_str)) \
            .order_by("timestamp", direction=firestore.Query.ASCENDING)
        
        docs = query.get()
        for doc in docs:
            row = doc.to_dict()
            role = "model" if row['sender'] in ['ai', 'agent'] else "user"
            parts = []
            
            text_content = row.get('messageText') or ""
            if text_content:
                parts.append({"text": text_content})
            
            if row.get('imageUrl'):
                try:
                    header, encoded = row['imageUrl'].split(",", 1)
                    mime_type = header.split(":")[1].split(";")[0]
                    media_part = {"inline_data": {"mime_type": mime_type, "data": encoded}}
                    parts.append(media_part)
                except (ValueError, IndexError) as e:
                    log_to_db("WARN", f"Could not parse media data URL from DB for contact {contact_name_str}: {e}")
            
            if len(parts) > 1 and 'text' in parts[1] and 'text' not in parts[0]:
                 parts.reverse()

            if parts:
                history.append({"role": role, "parts": parts})

        return history
    except Exception as e:
        log_to_db("ERROR", f"Error fetching history from DB for contact {contact_name_str}: {e}")
        return []

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def save_message_to_db(instance_id_str, contact_name_str, sender_str, message_text_str=None, media_url_str=None, wa_message_id_str=None):
    db_sender = 'ai' if sender_str == 'model' else sender_str
    is_read = (db_sender != 'user')
    try:
        db.collection("whatsapp_messages").add({
            "instanceId": instance_id_str,
            "contactName": contact_name_str,
            "sender": db_sender,
            "messageText": message_text_str,
            "imageUrl": media_url_str,
            "isRead": is_read,
            "wa_message_id": wa_message_id_str,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        return True
    except Exception as e:
        log_to_db("ERROR", f"FAILED to save message to DB for contact {contact_name_str}: {e}")
        return False

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def update_contact_tags_in_db(instance_id_str, contact_name_str, new_tags_list):
    if not new_tags_list:
        return False
    try:
        profiles_ref = db.collection("whatsapp_contact_profiles")
        query = profiles_ref.where(filter=FieldFilter("instance_id", "==", instance_id_str)) \
            .where(filter=FieldFilter("contact_name", "==", contact_name_str)) \
            .limit(1)
        
        docs = query.get()
        
        existing_profile_data = docs[0].to_dict() if docs else None
        
        existing_tags = set(existing_profile_data['tags']) if existing_profile_data and existing_profile_data.get('tags') else set()
        clean_new_tags = {tag.strip().lower() for tag in new_tags_list if tag.strip()}
        updated_tags = sorted(list(existing_tags.union(clean_new_tags)))

        if sorted(list(existing_tags)) == updated_tags:
            log_to_db("DEBUG", f"Tags for {contact_name_str} are already up-to-date.")
            return True

        if existing_profile_data:
            profiles_ref.document(docs[0].id).update({"tags": updated_tags, "updated_at": firestore.SERVER_TIMESTAMP})
        else:
            profiles_ref.add({"instance_id": instance_id_str, "contact_name": contact_name_str, "tags": updated_tags, "created_at": firestore.SERVER_TIMESTAMP})

        log_to_db("INFO", f"Successfully updated tags for {contact_name_str} to: {updated_tags}")
        return True
    except Exception as e:
        log_to_db("ERROR", f"FAILED to update contact tags in DB for {contact_name_str}: {e}")
        return False

def get_gemini_response_text(response: Any) -> str:
    try:
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            text_parts = [part.text for part in response.candidates[0].content.parts if hasattr(part, 'text')]
            full_text = "".join(text_parts).strip()
            if full_text:
                return full_text
    except (IndexError, AttributeError):
        pass
    try:
        if hasattr(response, 'text') and response.text:
            return response.text.strip()
    except AttributeError:
        pass
    log_to_db("WARN", "Could not extract text from Gemini response.")
    return ""

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

def get_contact_name_with_xpath(driver):
    contact_name_xpath = "//header//div[@role='button']//span[@dir='auto' and @title]"
    fallback_xpath = "//header//div[@role='button']//span[contains(@class, '_ao3e')]"
    default_name = "UnknownContact_XPath"
    try:
        contact_element = driver.find_element(By.XPATH, contact_name_xpath)
        contact_name = contact_element.get_attribute('title').strip()
        if contact_name: return contact_name
        else: raise NoSuchElementException("Title attribute empty")
    except NoSuchElementException:
        try:
            contact_element = driver.find_element(By.XPATH, fallback_xpath)
            contact_name = contact_element.text.strip()
            if contact_name: return contact_name
            else: return default_name
        except Exception: return default_name
    except (WebDriverException, JavascriptException) as critical_error:
        log_to_db("ERROR", f"Critical WebDriver error getting contact name: {critical_error}")
        raise
    except Exception as e:
        log_to_db("ERROR", f"Error getting contact name (original method): {e}")
        return default_name

def check_and_click_unread_xpath(driver):
    xpath_unread_item = "//span[contains(@aria-label, 'unread message')]/ancestor::div[@role='row']"
    try:
        unread_chat_element = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.XPATH, xpath_unread_item)))
        time.sleep(random.uniform(1.0, 2.0)); unread_chat_element.click()
        return True
    except (NoSuchElementException, TimeoutException):
        return False
    except (WebDriverException, JavascriptException) as critical_error:
        log_to_db("ERROR", f"Critical WebDriver error during unread check: {critical_error}")
        raise
    except Exception as e:
        log_to_db("ERROR", f"Unexpected error during XPath unread check: {e}")
        return False

def filter_scraped_text(text):
    if not text or not text.strip(): return None
    text = text.strip()
    junk_patterns = [r"^\d{1,2}:\d{2}\s+(AM|PM)$", r"^tail-in$", r"^forward-chat$", r"^Select message$"]
    for pattern in junk_patterns:
        if re.match(pattern, text, re.IGNORECASE): return None
    return text

def human_like_typing(element, text: str):
    """Types text into an element one character at a time with random delays."""
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(0.04, 0.16))

def simulate_human_activity(driver):
    """Performs random mouse movements and scrolls to mimic a user reading or thinking."""
    try:
        actions = ActionChains(driver)
        window_size = driver.get_window_size()
        width, height = window_size.get('width', 1920), window_size.get('height', 1080)
        # Move mouse to a random position on the screen to start
        start_x = random.randint(100, width - 100)
        start_y = random.randint(100, height - 100)
        actions.move_by_offset(start_x, start_y).perform()
        actions.reset_actions() # Reset internal coordinates

        # Perform a few small, random movements
        for _ in range(random.randint(1, 4)):
            move_x = random.randint(-200, 200)
            move_y = random.randint(-150, 150)
            actions.move_by_offset(move_x, move_y)
            actions.pause(random.uniform(0.2, 0.6))
        
        actions.perform()
        
        # Perform a small, random scroll
        scroll_y = random.randint(-250, 250)
        driver.execute_script(f"window.scrollBy(0, {scroll_y});")
        time.sleep(random.uniform(0.5, 1.5))
        
        log_to_db("DEBUG", "Simulated human-like mouse and scroll activity.")
    except Exception as e:
        log_to_db("WARN", f"Could not simulate human activity: {e}")

def contains_emoji(text: str) -> bool:
    """Checks if a string contains any emoji characters."""
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+",
        flags=re.UNICODE,
    )
    return emoji_pattern.search(text) is not None

def type_and_send_safely(driver, element, text: str):
    """
    Sends text to a Selenium element. Uses JS for emoji/unicode reliability,
    otherwise uses human-like typing to reduce bot detection.
    """
    if contains_emoji(text):
        log_to_db("DEBUG", "Emoji detected. Using robust JavaScript injection for sending.")
        try:
            # Using JS to set content directly is more reliable for special characters.
            # We also dispatch an 'input' event to ensure rich text editors (like WhatsApp's) recognize the change.
            driver.execute_script(
                """
                const text = arguments[0];
                const el = arguments[1];
                el.focus();
                document.execCommand('insertText', false, text);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                """,
                text,
                element
            )
            time.sleep(random.uniform(0.5, 1.2))
            element.send_keys(Keys.RETURN)
            log_to_db("INFO", "Message with emoji sent via JS.")
        except Exception as js_error:
            log_to_db("ERROR", f"JavaScript injection method failed for emoji message: {js_error}")
            raise js_error
    else:
        log_to_db("DEBUG", "No emoji. Using human-like typing.")
        try:
            human_like_typing(element, text)
            time.sleep(random.uniform(0.2, 0.5)) # Pause before hitting enter
            element.send_keys(Keys.RETURN)
            log_to_db("INFO", "Plain text message sent via human-like typing.")
        except Exception as typing_error:
            log_to_db("ERROR", f"Human-like typing failed unexpectedly: {typing_error}")
            # Do not fallback here, as the problem is likely not with the text content if it's plain text.
            raise typing_error

def get_image_base64_from_blob_url(driver, blob_url):
    if not blob_url.startswith("blob:"): return None, None
    js_script = """
        async function getBase64FromBlobUrl(blobUrl) {
          try {
            const response = await fetch(blobUrl);
            if (!response.ok) return null;
            const blob = await response.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
          } catch (e) { return null; }
        }
        const callback = arguments[arguments.length - 1];
        getBase64FromBlobUrl(arguments[0]).then(dataUrl => callback(dataUrl));
        """
    try:
        data_url = driver.execute_async_script(js_script, blob_url)
        if data_url and data_url.startswith('data:'):
            header, encoded = data_url.split(',', 1)
            mime_type = header.split(';')[0].split(':')[1]
            return encoded, mime_type
        return None, None
    except Exception as e:
        log_to_db("WARN", f"Unexpected error getting base64 from blob: {e}")
        return None, None

def poll_and_send_outgoing_messages(driver, instance_id_str):
    messages_to_send = []
    try:
        messages_ref = db.collection("whatsapp_messages")
        query = messages_ref.where(filter=FieldFilter("instanceId", "==", instance_id_str)) \
            .where(filter=FieldFilter("status", "==", "sending")) \
            .order_by("timestamp", direction=firestore.Query.ASCENDING)
        
        docs = query.get()
        messages_to_send = [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        log_to_db("ERROR", f"Error polling for outgoing messages: {e}")
        return
    if not messages_to_send: return
    for msg in messages_to_send:
        if shutdown_requested: break
        msg_id, contact_name, msg_text, image_base64 = msg['id'], msg['contactName'], msg.get('messageText'), msg.get('imageUrl')
        try:
            log_to_db("INFO", f"Sending manual message to {contact_name}.")
            search_box = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Search input textbox']")))
            search_box.clear(); search_box.send_keys(contact_name)
            time.sleep(random.uniform(MIN_SHORT_INTERACTION_DELAY, MAX_SHORT_INTERACTION_DELAY))
            contact_result = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, f"//span[@title='{contact_name}']")))
            contact_result.click()
            time.sleep(random.uniform(MIN_SHORT_INTERACTION_DELAY, MAX_SHORT_INTERACTION_DELAY))
            if image_base64:
                image_path = None
                try:
                    if not image_base64.startswith("data:image"): raise ValueError("Message image_url is not a valid data URL.")
                    header, encoded = image_base64.split(",", 1); data = base64.b64decode(encoded)
                    file_extension = '.' + header.split('/')[1].split(';')[0]
                    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp: tmp.write(data); image_path = tmp.name
                    attach_button = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//span[@data-icon='attach-clip'] | //div[@role='button' and @title='Attach']")))
                    attach_button.click(); time.sleep(random.uniform(1.0, 2.0))
                    file_input = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//input[@accept='image/*,video/mp4,video/3gpp,video/quicktime']")))
                    file_input.send_keys(image_path); time.sleep(random.uniform(MIN_SHORT_INTERACTION_DELAY, MAX_SHORT_INTERACTION_DELAY))
                    send_button = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.XPATH, "//span[@data-icon='send']")))
                    if msg_text:
                        caption_box = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Add a caption' or @title='Add a caption…']")))
                        caption_box.send_keys(msg_text)
                    send_button.click()
                finally:
                    if image_path and os.path.exists(image_path): os.unlink(image_path)
            elif msg_text:
                message_box = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//div[@title='Type a message']")))
                type_and_send_safely(driver, message_box, msg_text)
            db.collection("whatsapp_messages").document(msg_id).update({"status": "sent"})
            post_send_delay = random.uniform(MIN_POST_ACTION_DELAY, MAX_POST_ACTION_DELAY)
            time.sleep(post_send_delay)
        except Exception as e:
            log_to_db("ERROR", f"FAILED to send message to {contact_name}: {e}")
            try: db.collection("whatsapp_messages").document(msg_id).update({"status": "failed"})
            except Exception as db_e: log_to_db("ERROR", f"FAILED to even update message status to 'failed': {db_e}")
        finally:
            driver.get("https://web.whatsapp.com/")
            WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Chat list']")))
            time.sleep(random.uniform(MIN_SHORT_INTERACTION_DELAY, MAX_SHORT_INTERACTION_DELAY))

def poll_and_process_outreach_contact(driver, instance_id_str):
    # Outreach logic needs a Firestore equivalent. 
    # For now, we'll just return False as outreach might need more complex migration.
    return False
        
def send_message_to_number(driver, phone_number, message):
    try:
        driver.get(f"https://web.whatsapp.com/send?phone={phone_number}&text=")
        message_box = WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.XPATH, "//div[@title='Type a message']")))
        try:
            invalid_popup = WebDriverWait(driver, 3).until(EC.presence_of_element_located((By.XPATH, "//div[contains(text(), 'Phone number shared via url is invalid.')]")))
            if invalid_popup:
                driver.find_element(By.XPATH, "//div[@role='button' and div[text()='OK']]").click()
                raise Exception(f"Invalid phone number: {phone_number}")
        except TimeoutException: pass
        type_and_send_safely(driver, message_box, message)
        time.sleep(random.uniform(MIN_SHORT_INTERACTION_DELAY, MAX_SHORT_INTERACTION_DELAY))
    except Exception as e:
        raise Exception(f"Selenium failed to send message to {phone_number}: {e}")
    finally:
        driver.get("https://web.whatsapp.com/")
        WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Chat list']")))
        time.sleep(random.uniform(MIN_SHORT_INTERACTION_DELAY, MAX_SHORT_INTERACTION_DELAY))

# ---- Main Script ----
def run_whatsapp_automation():
    driver = None
    service = None
    logged_in = False
    unhandled_exception = None
    SESSION_BASE_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "whatsapp_sessions")
    
    stop_heartbeat = threading.Event()
    heartbeat = threading.Thread(target=heartbeat_thread, args=(stop_heartbeat,))
    heartbeat.daemon = True
    heartbeat.start()

    try:
        chromedriver_path = find_or_download_chromedriver(WORKER_ID)
        if not chromedriver_path:
            raise Exception("ChromeDriver could not be found or downloaded. Please install it manually.")
        
        chrome_options = webdriver.ChromeOptions()
        
        # --- ANTI-BOT-DETECTION OPTIONS ---
        log_to_db("INFO", "Applying anti-bot detection measures to WebDriver.")
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36")
        chrome_options.add_argument("--disable-infobars")
        
        # --- MORE HUMAN-LIKE OPTIONS ---
        chrome_options.add_argument("--window-size=3840,2160")
        chrome_options.add_argument("--force-device-scale-factor=0.5")
        chrome_options.add_experimental_option('prefs', {'intl.accept_languages': 'en-US,en'})

        # IMPROVEMENT 1: Extreme Memory Optimization for Termux/Mobile
        chrome_options.add_argument("--headless=new")
        
        # IMPROVEMENT 2: Anti-Ban IP Proxy Configuration
        proxy_server = os.getenv("PROXY_SERVER", "")
        if proxy_server:
            chrome_options.add_argument(f'--proxy-server={proxy_server}')
            log_to_db("INFO", "Masking traffic through proxy...")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--remote-debugging-port=0')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument("--disable-software-rasterizer")
        chrome_options.add_argument("--metrics-recording-only")
        chrome_options.add_argument("--mute-audio")
        chrome_options.add_argument("--no-first-run")
        chrome_options.add_argument("--no-default-browser-check")
        chrome_options.add_argument("--disable-application-cache")
        # Block images and heavy media
        chrome_options.add_experimental_option("prefs", {"profile.managed_default_content_settings.images": 2})
        chrome_options.page_load_strategy = "eager"
        
        session_path = os.path.join(SESSION_BASE_FOLDER, instance_id)
        os.makedirs(session_path, exist_ok=True)
        chrome_options.add_argument(f"--user-data-dir={session_path}")

        # --- PRE-FLIGHT CHECK: Clean up stale session locks ---
        # This prevents the "SessionNotCreatedException: user data directory is already in use" error
        # that can occur after an unclean shutdown (e.g., a crash or forced kill).
        lock_file_path = os.path.join(session_path, "SingletonLock")
        if os.path.exists(lock_file_path):
            log_to_db("WARN", f"Found stale session lock file. Deleting to prevent startup error.")
            try:
                os.remove(lock_file_path)
                log_to_db("INFO", "Stale lock file deleted successfully.")
            except Exception as lock_err:
                log_to_db("ERROR", f"Could not delete stale lock file: {lock_err}. Startup may fail.")
        
        service = Service(executable_path=chromedriver_path)
        driver = webdriver.Chrome(service=service, options=chrome_options)

        # --- MORE ANTI-DETECTION: Execute JS to hide properties before page load ---
        stealth_script = """
            Object.defineProperty(navigator, 'webdriver', {
              get: () => undefined
            });
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
              parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
            );
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
                ],
            });
            // It's better not to spoof WebGL, as incorrect values are a bigger red flag.
            // Modern anti-bot systems often check for consistency between many browser properties.
        """
        driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {'source': stealth_script})

        driver.set_script_timeout(45)
        log_to_db("INFO", f"WebDriver initialized. Session path: {session_path}")

        driver.get("https://web.whatsapp.com/")
        log_to_db("INFO", "Navigated to web.whatsapp.com.")
        
        try:
            driver.execute_script('document.body.style.zoom = "25%"')
            log_to_db("INFO", "Set page zoom to 25%.")
        except Exception as zoom_err:
            log_to_db("WARN", f"Could not set page zoom: {zoom_err}")

        try:
            log_to_db("INFO", "Checking for existing login session...")
            WebDriverWait(driver, 25).until(EC.any_of(EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Chat list']")), EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Search input textbox'][@role='textbox'][@data-tab='3']"))))
            logged_in = True
            log_to_db("INFO", "Existing session found. Logged in.")
        except TimeoutException:
            log_to_db("INFO", "No active session. Starting phone linking process.")
            try:
                WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//span[contains(text(), 'Link with phone number')] | //div[contains(text(), 'Log in with phone number')]"))).click(); time.sleep(2.5)
                try:
                    country_dropdown_button = WebDriverWait(driver, 15).until(EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'xdd8jsf') and contains(@class, 'xod5an3')]/button[.//span[@data-icon='chevron']]")))
                    driver.execute_script("arguments[0].click();", country_dropdown_button); time.sleep(2.0)
                    country_search_input = WebDriverWait(driver, 10).until(EC.visibility_of_element_located((By.XPATH, "//div[@id='wa-popovers-bucket']//div[@role='textbox' and @contenteditable='true' and @data-lexical-editor='true']")))
                    country_search_input.click(); time.sleep(0.3); country_search_input.send_keys(Keys.CONTROL + "a"); country_search_input.send_keys(Keys.DELETE); time.sleep(0.3)
                    country_search_input.send_keys("qatar"); time.sleep(1.5)
                    qatar_option = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//div[@id='wa-popovers-bucket']//button[.//div[normalize-space(.)='Qatar' and contains(@class, 'x1lkfr7t')]]")))
                    driver.execute_script("arguments[0].click();", qatar_option); time.sleep(1)
                except Exception as cs_err:
                    log_to_db("WARN", f"Could not auto-select 'Qatar': {type(cs_err).__name__}. Relying on default.")
                phone_input_element = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//input[@aria-label='Type your phone number.']")))
                phone_input_element.clear(); phone_input_element.send_keys(phone_number_to_input); time.sleep(1);
                WebDriverWait(driver,10).until(EC.element_to_be_clickable((By.XPATH, "//button[.//div[normalize-space(.)='Next']]"))).click(); time.sleep(2)
                log_to_db("INFO", "Phone number submitted. Waiting for linking code...")
                code_container = WebDriverWait(driver, 20).until(EC.visibility_of_element_located((By.XPATH, "//div[@data-link-code]")))
                code_char_spans = code_container.find_elements(By.XPATH, ".//span[contains(@class, 'x2b8uid') and normalize-space(.)!='-']")
                linking_code_cleaned = "".join([span.text.strip() for span in code_char_spans if span.text.strip()])
                if linking_code_cleaned:
                    db.collection("whatsapp_linking_codes").add({"instance_id": instance_id, "code": linking_code_cleaned, "created_at": firestore.SERVER_TIMESTAMP})
                    log_to_db("INFO", f"Extracted and saved linking code: {linking_code_cleaned[:4]}-****")
                else:
                    raise Exception("Could not extract linking code characters from page.")
                
                log_to_db("INFO", "Waiting for user to link phone (120s timeout)...")
                WebDriverWait(driver, 120).until(EC.any_of(EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Chat list']")), EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Search input textbox'][@role='textbox'][@data-tab='3']"))))
                logged_in = True
                log_to_db("INFO", "Phone linked successfully. Login complete.")
            except Exception as login_err:
                 raise Exception(f"Fatal: Failed during phone linking process: {login_err}")

        # --- Main Loop ---
        if logged_in:
            try:
                # Check for and dismiss the "Continue" popup if it appears
                continue_button = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//div[@role='dialog']//button[.//div[normalize-space()='Continue']]")))
                continue_button.click(); time.sleep(3)
                log_to_db("INFO", "Dismissed 'Continue' popup.")
            except TimeoutException: pass
            except Exception as popup_err: log_to_db("WARN", f"An error occurred while checking for pop-ups: {popup_err}")

            db.collection("whatsapp_instances").document(instance_id).update({"status": "running"})
            log_to_db("INFO", "Instance status set to 'running'. Entering main loop.")
            
            while not shutdown_requested:
                try:
                    doc = db.collection("whatsapp_instances").document(instance_id).get()
                    if not doc.exists or not doc.to_dict().get('isActive'):
                        log_to_db("INFO", "Detected isActive = FALSE from database. Shutting down.")
                        break
                except Exception as e:
                    log_to_db("WARN", f"Could not verify active status, continuing loop: {e}")

                poll_and_send_outgoing_messages(driver, instance_id)

                if check_and_click_unread_xpath(driver):
                    log_to_db("INFO", "Unread message found. Processing...")
                    time.sleep(random.uniform(6.0, 9.0))
                    contact_name = get_contact_name_with_xpath(driver)
                    if not contact_name or "UnknownContact" in contact_name:
                        log_to_db("WARN", "Could not identify contact name. Refreshing page.")
                        driver.refresh(); time.sleep(random.uniform(6.0, 9.0)); continue
                    
                    log_to_db("INFO", f"Processing chat for contact: {contact_name}")
                    existing_chat_history = get_history_from_db(instance_id, contact_name)
                    try:
                        docs = db.collection("whatsapp_messages") \
                            .where(filter=FieldFilter("instanceId", "==", instance_id)) \
                            .where(filter=FieldFilter("contactName", "==", contact_name)) \
                            .get()
                        existing_wa_ids = {doc.to_dict().get('wa_message_id') for doc in docs if doc.to_dict().get('wa_message_id')}
                    except Exception as e:
                        log_to_db("ERROR", f"Failed to get existing message IDs for {contact_name}: {e}. Refreshing.")
                        driver.refresh(); time.sleep(random.uniform(6.0, 9.0)); continue
                    
                    scraped_items = []
                    try:
                        chat_container_element = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'copyable-area')]//div[@role='grid'] | //div[@data-tab='8']")))
                        soup = BeautifulSoup(chat_container_element.get_attribute('innerHTML'), 'html.parser')
                        all_message_rows = soup.select('div[role="row"]'); row_data = []
                        for row_div in all_message_rows:
                            translate_match = re.search(r'translateY\(([\d.-]+)px\)', row_div.get('style', '')); translate_y = float(translate_match.group(1)) if translate_match else -1.0
                            msg_div = row_div.find('div', {'data-id': True})
                            if not msg_div: continue
                            wa_id = msg_div.get('data-id')
                            role = 'user' if msg_div.find('div', class_='message-in') else 'model' if msg_div.find('div', class_='message-out') else None
                            if not role: continue
                            scraped_text, scraped_media_url = None, None
                            img_tag = msg_div.find('img', {'src': lambda s: s and s.startswith('blob:')})
                            if img_tag and role == "user":
                                base64_data, mime_type = get_image_base64_from_blob_url(driver, img_tag['src'])
                                if base64_data and mime_type: scraped_media_url = f"data:{mime_type};base64,{base64_data}"
                            copyable_text_div = msg_div.find('div', class_='copyable-text')
                            if copyable_text_div:
                                text_span = copyable_text_div.find('span', class_='selectable-text')
                                message_text = text_span.get_text(separator='\n', strip=True) if text_span else copyable_text_div.get_text(separator='\n', strip=True)
                                if message_text: scraped_text = filter_scraped_text(message_text)
                            if scraped_text or scraped_media_url:
                                row_data.append({"translate_y": translate_y, "role": role, "text": scraped_text, "media_url": scraped_media_url, "wa_id": wa_id})
                        row_data.sort(key=lambda x: x['translate_y']); scraped_items = row_data
                    except Exception as scrape_err:
                        log_to_db("ERROR", f"ERROR during message scraping for {contact_name}: {scrape_err}")

                    newly_added_messages_for_ai = []; newly_added_count = 0
                    if scraped_items:
                        for item in scraped_items:
                            wa_id = item.get("wa_id")
                            if wa_id and wa_id not in existing_wa_ids:
                                text, media_url = item.get("text"), item.get("media_url")
                                if save_message_to_db(instance_id, contact_name, item["role"], text, media_url, wa_id):
                                    newly_added_count += 1
                                    prompt_parts = []
                                    if text: prompt_parts.append({"text": text})
                                    if media_url:
                                        try:
                                            header, encoded = media_url.split(",", 1)
                                            mime_type = header.split(":")[1].split(";")[0]
                                            prompt_parts.append({"inline_data": {"mime_type": mime_type, "data": encoded}})
                                        except Exception as e: log_to_db("WARN", f"Could not parse new media for prompt: {e}")
                                    if len(prompt_parts) > 1 and 'text' in prompt_parts[1]: prompt_parts.reverse()
                                    newly_added_messages_for_ai.append({"role": item["role"], "parts": prompt_parts})

                    if newly_added_count > 0: log_to_db("INFO", f"Saved {newly_added_count} new messages to DB for {contact_name}.")
                    
                    combined_history = existing_chat_history + newly_added_messages_for_ai
                    if combined_history and combined_history[-1].get("role") == "user":
                        log_to_db("INFO", f"New user message detected from {contact_name}. Generating AI reply...")
                        try:
                            chat_pane = driver.find_element(By.XPATH, "//div[contains(@class, 'copyable-area')]//div[@role='grid']/../../.. | //div[@data-tab='8']")
                            scroll_amount = random.randint(-120, 40)
                            driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight + arguments[1]", chat_pane, scroll_amount)
                            time.sleep(random.uniform(0.6, 1.8))
                            driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", chat_pane)
                            log_to_db("DEBUG", "Simulated chat reading scroll.")
                        except Exception as scroll_err:
                            log_to_db("WARN", f"Could not simulate chat scroll: {scroll_err}")
                        
                        chat_session = jayakrishnan_reply_model.start_chat(history=existing_chat_history)
                        ai_reply_text = ""
                        try:
                            response = chat_session.send_message(newly_added_messages_for_ai[-1]['parts'])
                            candidate = response.candidates[0]
                            if any(hasattr(part, 'function_call') and part.function_call.name for part in candidate.content.parts):
                                log_to_db("WARN", "Function calling logic not implemented in this refactor. AI response might be incomplete.")
                            ai_reply_text = get_gemini_response_text(response)
                        except generation_types.BlockedPromptException as e:
                            log_to_db("WARN", f"AI content generation blocked. Reason: {getattr(e, 'block_reason', 'Unknown')}.")
                        except Exception as e:
                            log_to_db("ERROR", f"Error during Gemini conversation step: {e}")
                        
                        if ai_reply_text:
                            log_to_db("INFO", f"Sending AI reply to {contact_name}.")
                            type_and_send_safely(driver, driver.switch_to.active_element, ai_reply_text)
                            save_message_to_db(instance_id, contact_name, 'model', ai_reply_text)
                            time.sleep(random.uniform(MIN_POST_ACTION_DELAY, MAX_POST_ACTION_DELAY))

                    driver.refresh(); time.sleep(random.uniform(6.0, 9.0))
                else:
                    if not poll_and_process_outreach_contact(driver, instance_id):
                        if random.random() < 0.25: # 25% chance to simulate activity
                            log_to_db("DEBUG", "Idle time detected. Simulating human activity.")
                            simulate_human_activity(driver)

                        idle_sleep = random.uniform(MIN_MAIN_LOOP_SLEEP, MAX_MAIN_LOOP_SLEEP)
                        start_time = time.time()
                        while time.time() - start_time < idle_sleep:
                            if shutdown_requested: break
                            time.sleep(1)
            
    except Exception as e:
        error_message = f"{type(e).__name__}: {e}"
        tb_str = traceback.format_exc()
        log_to_db("FATAL", f"Unhandled Error: {error_message}\nTraceback:\n{tb_str}")
        unhandled_exception = error_message
    finally:
        log_to_db("INFO", "Shutdown initiated. Performing cleanup...")
        stop_heartbeat.set()
        heartbeat.join()
        
        update_payload = {
            "worker_pid": None,
            "worker_hostname": None,
            "last_heartbeat": None
        }
        if unhandled_exception:
            update_payload["status"] = "failed"
            update_payload["last_error"] = str(unhandled_exception)[:1024]
        else:
            update_payload["status"] = "inactive"

        try:
            log_to_db("INFO", f"Releasing instance lock in database with final status: {update_payload.get('status')}")
            db.collection("whatsapp_instances").document(instance_id).update(update_payload)
        except Exception as db_err:
            log_to_db("WARN", f"Could not release instance lock in DB: {db_err}")

        if driver:
            try: driver.quit()
            except Exception as driver_err: log_to_db("WARN", f"Error during driver.quit(): {driver_err}")
        if service:
            try: service.stop()
            except Exception as service_err: log_to_db("WARN", f"Error stopping chromedriver service: {service_err}")
        
        log_to_db("INFO", "Cleanup complete. Worker exiting.")

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, handle_shutdown_signal)
    signal.signal(signal.SIGINT, handle_shutdown_signal)
    run_whatsapp_automation()
