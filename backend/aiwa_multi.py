# backend/aiwa_multi.py  (State-aware WhatsApp Worker)
# Controlled by listener.py orchestrator.
#
# Lifecycle:
#   1. Claims its instance in Firestore immediately on boot (sets worker_pid).
#   2. Sends a periodic heartbeat so the orchestrator knows it's alive.
#   3. On graceful shutdown (isActive=false), exits cleanly.
#   4. On fatal crash, sets isActive=False so the orchestrator does NOT
#      immediately re-spawn it in an infinite loop — the user must re-enable
#      from the dashboard once the underlying problem is fixed.

import warnings
warnings.simplefilter("ignore", FutureWarning)

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
import socket
import threading
from typing import Any, Optional, Tuple, Dict, List
from tenacity import retry, wait_exponential, stop_after_attempt
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter

# ── Script initialisation ────────────────────────────────────────────────────
if len(sys.argv) < 2:
    print("❌ FATAL: This script requires an instance_id argument.")
    sys.exit(1)

instance_id    = sys.argv[1]
WORKER_PID     = os.getpid()
WORKER_HOSTNAME = socket.gethostname()
WORKER_ID      = f"Worker-{instance_id[:6]}-{WORKER_PID}"

# ── Firebase / env ───────────────────────────────────────────────────────────
load_dotenv()

try:
    firebase_admin.initialize_app()
except ValueError:
    pass  # already initialised

db_id = os.getenv("FIRESTORE_DATABASE_ID")
db    = firestore.client(database_id=db_id) if db_id else firestore.client()

# ── Logging ──────────────────────────────────────────────────────────────────
def log_to_db(level: str, message: str, iid: str = instance_id):
    try:
        db.collection("instance_logs").add({
            "instance_id": iid,
            "level":       level.upper(),
            "message":     str(message)[:4096],
            "timestamp":   firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        print(f"[DB_LOG_FAIL] [{level.upper()}] {message} | err={e}")

print(f"🤖 [{WORKER_ID}] Booting up on host {WORKER_HOSTNAME}...")
log_to_db("INFO", f"Worker PID {WORKER_PID} booting.")

# ── Fetch config & claim instance immediately ────────────────────────────────
try:
    doc_ref = db.collection("whatsapp_instances").document(instance_id)
    doc     = doc_ref.get()
    if not doc.exists:
        raise Exception("No configuration found for this instance ID.")

    config = doc.to_dict()
    if not config.get("isActive"):
        print("Instance is disabled. Exiting.")
        sys.exit(0)

    # Claim the slot BEFORE loading heavy libraries
    doc_ref.update({
        "status":           "linking",
        "worker_hostname":  WORKER_HOSTNAME,
        "worker_pid":       WORKER_PID,
        "last_heartbeat":   firestore.SERVER_TIMESTAMP,
        "last_error":       None,
    })
except Exception as e:
    print(f"Failed during early claim: {e}")
    sys.exit(1)

# ── Heavy imports (deferred so claim happens first) ──────────────────────────
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import (
    NoSuchElementException, InvalidSelectorException,
    ElementNotInteractableException, WebDriverException,
    StaleElementReferenceException, JavascriptException, TimeoutException,
)
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import google.generativeai as genai
from google.api_core.exceptions import ServiceUnavailable
from google.generativeai.types import HarmCategory, HarmBlockThreshold, generation_types
from bs4 import BeautifulSoup

# Shared Termux/ARM Chrome utilities
from termux_utils import find_chromedriver, build_chrome_options, STEALTH_SCRIPT

# ── Behavioural constants ────────────────────────────────────────────────────
MIN_SHORT_INTERACTION_DELAY = 1.8
MAX_SHORT_INTERACTION_DELAY = 3.5
MIN_POST_ACTION_DELAY       = 12.0
MAX_POST_ACTION_DELAY       = 25.0
MIN_MAIN_LOOP_SLEEP         = 8.0
MAX_MAIN_LOOP_SLEEP         = 18.0
HEARTBEAT_INTERVAL          = 30   # seconds

# ── Prepare runtime config ───────────────────────────────────────────────────
try:
    phone_number_to_input = re.sub(r"\D", "", config["phoneNumber"])
    user_prompt           = config["customPrompt"]
    user_context          = config.get("context", "").strip()
    system_prompt_reply   = (
        f"ADDITIONAL CONTEXT:\n---\n{user_context}\n---\n\nSYSTEM PROMPT:\n---\n{user_prompt}"
        if user_context else user_prompt
    )
    enabled_tools = config.get("enabled_tools") or []
except Exception as e:
    log_to_db("FATAL", f"Failed parsing config: {e}")
    sys.exit(1)

# ── Gemini configuration ─────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Tool schemas
_update_crm_stage = genai.protos.FunctionDeclaration(
    name="update_crm_stage",
    description="Update the contact's stage in the CRM pipeline.",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "stage": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="New CRM stage.",
                enum=["New", "Contacted", "Proposal", "Won", "Lost"],
            )
        },
        required=["stage"],
    ),
)
_add_tag = genai.protos.FunctionDeclaration(
    name="add_tag",
    description="Add a descriptive tag to the contact's profile.",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "tag": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="Tag to add, e.g. 'hot lead'.",
            )
        },
        required=["tag"],
    ),
)
_set_due_date = genai.protos.FunctionDeclaration(
    name="set_due_date",
    description="Set a follow-up due date for the contact.",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "date": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="Due date in YYYY-MM-DD format.",
            )
        },
        required=["date"],
    ),
)
_update_priority = genai.protos.FunctionDeclaration(
    name="update_priority",
    description="Update the contact's priority level.",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "priority": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="Priority level.",
                enum=["High", "Medium", "Low"],
            )
        },
        required=["priority"],
    ),
)

ALL_TOOLS_DEFINITIONS = {
    "update_crm_stage": _update_crm_stage,
    "add_tag":          _add_tag,
    "set_due_date":     _set_due_date,
    "update_priority":  _update_priority,
}

try:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set.")
    genai.configure(api_key=GEMINI_API_KEY)

    safety_settings = {
        HarmCategory.HARM_CATEGORY_HARASSMENT:        HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH:       HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }
    tools_for_instance = [
        ALL_TOOLS_DEFINITIONS[t] for t in enabled_tools if t in ALL_TOOLS_DEFINITIONS
    ]
    reply_model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=system_prompt_reply,
        safety_settings=safety_settings,
        tools=tools_for_instance if tools_for_instance else None,
    )
    outreach_model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=(
            "You are a message personalisation AI. Take a user-provided template "
            "and variables and craft a natural, human-sounding WhatsApp message.\n"
            "RULES:\n"
            "1. Use the template as the core.\n"
            "2. Seamlessly integrate the variables.\n"
            "3. Make it sound personal, not templated.\n"
            "4. Do not add information not in the template or variables.\n"
            "5. Output ONLY the final message text."
        ),
        safety_settings=safety_settings,
    )
    log_to_db("INFO", f"Gemini configured with {len(tools_for_instance)} tool(s).")
except Exception as e:
    msg = f"Gemini configuration failed: {e}"
    log_to_db("FATAL", msg)
    db.collection("whatsapp_instances").document(instance_id).update({
        "status":    "failed",
        "isActive":  False,
        "last_error": str(msg)[:1024],
    })
    sys.exit(1)

# ── Shutdown handler ─────────────────────────────────────────────────────────
shutdown_requested = False

def handle_shutdown_signal(signum, frame):
    global shutdown_requested
    if not shutdown_requested:
        name = signal.Signals(signum).name if hasattr(signal, "Signals") else f"signal {signum}"
        log_to_db("INFO", f"Received {name}. Initiating graceful shutdown…")
        shutdown_requested = True

# ── Heartbeat thread ─────────────────────────────────────────────────────────
def heartbeat_thread(stop_event: threading.Event):
    while not stop_event.is_set():
        try:
            db.collection("whatsapp_instances").document(instance_id).update({
                "last_heartbeat": firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            log_to_db("ERROR", f"Heartbeat failed: {e}. Worker may be marked zombie.")
        stop_event.wait(HEARTBEAT_INTERVAL)
    log_to_db("DEBUG", "Heartbeat thread stopped.")

# ── Database helpers ─────────────────────────────────────────────────────────
@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def get_history_from_db(iid: str, contact: str) -> List[Dict]:
    history = []
    try:
        docs = (
            db.collection("whatsapp_messages")
            .where(filter=FieldFilter("instanceId", "==", iid))
            .where(filter=FieldFilter("contactName", "==", contact))
            .order_by("timestamp", direction=firestore.Query.ASCENDING)
            .get()
        )
        for doc in docs:
            row  = doc.to_dict()
            role = "model" if row["sender"] in ("ai", "agent") else "user"
            parts: List = []
            if row.get("messageText"):
                parts.append({"text": row["messageText"]})
            if row.get("imageUrl"):
                try:
                    header, encoded = row["imageUrl"].split(",", 1)
                    mime  = header.split(":")[1].split(";")[0]
                    parts.append({"inline_data": {"mime_type": mime, "data": encoded}})
                except Exception:
                    pass
            if len(parts) > 1 and "text" not in parts[0]:
                parts.reverse()
            if parts:
                history.append({"role": role, "parts": parts})
    except Exception as e:
        log_to_db("ERROR", f"History fetch failed for {contact}: {e}")
    return history

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def save_message_to_db(
    iid: str, contact: str, sender: str,
    text: str = None, media_url: str = None, wa_id: str = None,
) -> bool:
    try:
        db.collection("whatsapp_messages").add({
            "instanceId":   iid,
            "contactName":  contact,
            "sender":       "ai" if sender == "model" else sender,
            "messageText":  text,
            "imageUrl":     media_url,
            "isRead":       sender != "user",
            "wa_message_id": wa_id,
            "timestamp":    firestore.SERVER_TIMESTAMP,
        })
        return True
    except Exception as e:
        log_to_db("ERROR", f"Save message failed for {contact}: {e}")
        return False

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def update_contact_tags_in_db(iid: str, contact: str, new_tags: List[str]) -> bool:
    if not new_tags:
        return False
    try:
        ref   = db.collection("whatsapp_contact_profiles")
        docs  = (
            ref.where(filter=FieldFilter("instance_id", "==", iid))
               .where(filter=FieldFilter("contact_name", "==", contact))
               .limit(1)
               .get()
        )
        clean = {t.strip().lower() for t in new_tags if t.strip()}
        if docs:
            existing = set(docs[0].to_dict().get("tags", []))
            merged   = sorted(existing | clean)
            if sorted(existing) == merged:
                return True
            ref.document(docs[0].id).update({"tags": merged, "updated_at": firestore.SERVER_TIMESTAMP})
        else:
            ref.add({
                "instance_id":  iid,
                "contact_name": contact,
                "tags":         sorted(clean),
                "created_at":   firestore.SERVER_TIMESTAMP,
            })
        log_to_db("INFO", f"Tags updated for {contact}.")
        return True
    except Exception as e:
        log_to_db("ERROR", f"Tag update failed for {contact}: {e}")
        return False

# ── Gemini response helper ───────────────────────────────────────────────────
def get_gemini_response_text(response: Any) -> str:
    try:
        parts = response.candidates[0].content.parts
        text  = "".join(p.text for p in parts if hasattr(p, "text")).strip()
        if text:
            return text
    except Exception:
        pass
    try:
        if hasattr(response, "text") and response.text:
            return response.text.strip()
    except Exception:
        pass
    log_to_db("WARN", "Could not extract text from Gemini response.")
    return ""

# ── Selenium helpers ─────────────────────────────────────────────────────────
def get_contact_name_with_xpath(driver) -> str:
    default = "UnknownContact_XPath"
    try:
        el = driver.find_element(By.XPATH, "//header//div[@role='button']//span[@dir='auto' and @title]")
        name = el.get_attribute("title").strip()
        return name if name else default
    except NoSuchElementException:
        try:
            el = driver.find_element(By.XPATH, "//header//div[@role='button']//span[contains(@class, '_ao3e')]")
            return el.text.strip() or default
        except Exception:
            return default
    except (WebDriverException, JavascriptException) as e:
        log_to_db("ERROR", f"Critical WebDriver error getting contact name: {e}")
        raise

def check_and_click_unread_xpath(driver) -> bool:
    xpath = "//span[contains(@aria-label, 'unread message')]/ancestor::div[@role='row']"
    try:
        el = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.XPATH, xpath)))
        time.sleep(random.uniform(1.0, 2.0))
        el.click()
        return True
    except (NoSuchElementException, TimeoutException):
        return False
    except (WebDriverException, JavascriptException) as e:
        log_to_db("ERROR", f"Critical WebDriver error during unread check: {e}")
        raise
    except Exception as e:
        log_to_db("ERROR", f"Unexpected error during unread check: {e}")
        return False

def filter_scraped_text(text: str) -> Optional[str]:
    if not text or not text.strip():
        return None
    text = text.strip()
    junk = [r"^\d{1,2}:\d{2}\s+(AM|PM)$", r"^tail-in$", r"^forward-chat$", r"^Select message$"]
    for pattern in junk:
        if re.match(pattern, text, re.IGNORECASE):
            return None
    return text

def contains_emoji(text: str) -> bool:
    pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+",
        flags=re.UNICODE,
    )
    return bool(pattern.search(text))

def human_like_typing(element, text: str):
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(0.04, 0.16))

def type_and_send_safely(driver, element, text: str):
    if contains_emoji(text):
        log_to_db("DEBUG", "Emoji detected — using JS injection.")
        try:
            driver.execute_script(
                """
                const el   = arguments[1];
                el.focus();
                document.execCommand('insertText', false, arguments[0]);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                """,
                text, element,
            )
            time.sleep(random.uniform(0.5, 1.2))
            element.send_keys(Keys.RETURN)
            log_to_db("INFO", "Emoji message sent via JS.")
        except Exception as e:
            log_to_db("ERROR", f"JS injection failed: {e}")
            raise
    else:
        log_to_db("DEBUG", "Plain text — using human-like typing.")
        try:
            human_like_typing(element, text)
            time.sleep(random.uniform(0.2, 0.5))
            element.send_keys(Keys.RETURN)
            log_to_db("INFO", "Plain text message sent.")
        except Exception as e:
            log_to_db("ERROR", f"Human typing failed: {e}")
            raise

def simulate_human_activity(driver):
    try:
        actions = ActionChains(driver)
        ws = driver.get_window_size()
        w, h = ws.get("width", 1920), ws.get("height", 1080)
        sx, sy = random.randint(100, w - 100), random.randint(100, h - 100)
        actions.move_by_offset(sx, sy).perform()
        actions.reset_actions()
        for _ in range(random.randint(1, 4)):
            actions.move_by_offset(random.randint(-200, 200), random.randint(-150, 150))
            actions.pause(random.uniform(0.2, 0.6))
        actions.perform()
        driver.execute_script(f"window.scrollBy(0, {random.randint(-250, 250)});")
        time.sleep(random.uniform(0.5, 1.5))
        log_to_db("DEBUG", "Simulated human activity.")
    except Exception as e:
        log_to_db("WARN", f"Human-activity simulation error: {e}")

def get_image_base64_from_blob_url(driver, blob_url: str) -> Tuple[Optional[str], Optional[str]]:
    if not blob_url.startswith("blob:"):
        return None, None
    js = """
    async function b64(u) {
        try {
            const r = await fetch(u);
            if (!r.ok) return null;
            const b = await r.blob();
            return new Promise(res => {
                const rd = new FileReader();
                rd.onloadend = () => res(rd.result);
                rd.onerror   = () => res(null);
                rd.readAsDataURL(b);
            });
        } catch(e) { return null; }
    }
    b64(arguments[0]).then(arguments[arguments.length - 1]);
    """
    try:
        data_url = driver.execute_async_script(js, blob_url)
        if data_url and data_url.startswith("data:"):
            header, encoded = data_url.split(",", 1)
            mime = header.split(";")[0].split(":")[1]
            return encoded, mime
    except Exception as e:
        log_to_db("WARN", f"Blob→base64 error: {e}")
    return None, None

# ── Outgoing message sender (from Firestore queue) ───────────────────────────
def poll_and_send_outgoing_messages(driver, iid: str):
    try:
        docs = (
            db.collection("whatsapp_messages")
            .where(filter=FieldFilter("instanceId", "==", iid))
            .where(filter=FieldFilter("status", "==", "sending"))
            .order_by("timestamp", direction=firestore.Query.ASCENDING)
            .get()
        )
    except Exception as e:
        log_to_db("ERROR", f"Poll outgoing error: {e}")
        return

    for doc in docs:
        msg = {"id": doc.id, **doc.to_dict()}
        contact = msg.get("contactName")
        text    = msg.get("messageText", "")
        if not contact or not text:
            db.collection("whatsapp_messages").document(msg["id"]).update({"status": "failed"})
            continue
        try:
            driver.get(f"https://web.whatsapp.com/send?phone=&text=")
            chat_list = WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Chat list']"))
            )
            search_box = driver.find_element(
                By.XPATH, "//div[@aria-label='Search input textbox'][@role='textbox']"
            )
            search_box.click()
            time.sleep(0.5)
            human_like_typing(search_box, contact)
            time.sleep(1.5)
            first_result = WebDriverWait(driver, 8).until(
                EC.element_to_be_clickable(
                    (By.XPATH, f"//span[@title='{contact}']")
                )
            )
            first_result.click()
            time.sleep(random.uniform(1.5, 2.5))
            msg_box = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located(
                    (By.XPATH, "//div[@title='Type a message'][@role='textbox']")
                )
            )
            msg_box.click()
            type_and_send_safely(driver, msg_box, text)
            db.collection("whatsapp_messages").document(msg["id"]).update({"status": "sent"})
            log_to_db("INFO", f"Queued message sent to {contact}.")
            time.sleep(random.uniform(MIN_POST_ACTION_DELAY, MAX_POST_ACTION_DELAY))
        except Exception as e:
            log_to_db("ERROR", f"Failed to send queued message to {contact}: {e}")
            db.collection("whatsapp_messages").document(msg["id"]).update({"status": "failed"})

# ── Outreach contact poller ──────────────────────────────────────────────────
def poll_and_process_outreach_contact(driver, iid: str) -> bool:
    """
    Finds one pending outreach contact, sends the personalised first message,
    and marks it as contacted. Returns True if a contact was processed.
    """
    try:
        docs = (
            db.collection("whatsapp_contacts")
            .where(filter=FieldFilter("instance_id", "==", iid))
            .where(filter=FieldFilter("outreach_status", "==", "pending"))
            .limit(1)
            .get()
        )
    except Exception as e:
        log_to_db("ERROR", f"Outreach poll error: {e}")
        return False

    if not docs:
        return False

    contact_doc = docs[0]
    contact     = contact_doc.to_dict()
    phone       = re.sub(r"\D", "", contact.get("phone", ""))
    template    = contact.get("message_template", "")
    variables   = contact.get("template_variables", {})

    if not phone or not template:
        log_to_db("WARN", f"Outreach contact {contact_doc.id} missing phone or template.")
        db.collection("whatsapp_contacts").document(contact_doc.id).update({
            "outreach_status": "skipped"
        })
        return False

    try:
        # Personalise via Gemini
        personalisation_prompt = (
            f"Template:\n{template}\n\nVariables:\n{json.dumps(variables, indent=2)}"
        )
        response     = outreach_model.generate_content(personalisation_prompt)
        personalised = get_gemini_response_text(response) or template

        # Navigate and send
        driver.get(f"https://web.whatsapp.com/send?phone={phone}&text=")
        msg_box = WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.XPATH, "//div[@title='Type a message']"))
        )
        try:
            invalid = WebDriverWait(driver, 3).until(
                EC.presence_of_element_located(
                    (By.XPATH, "//div[contains(text(), 'Phone number shared via url is invalid.')]")
                )
            )
            driver.find_element(
                By.XPATH, "//div[@role='button' and div[text()='OK']]"
            ).click()
            raise Exception(f"Invalid phone number: {phone}")
        except TimeoutException:
            pass  # No invalid popup — good

        type_and_send_safely(driver, msg_box, personalised)
        time.sleep(random.uniform(MIN_SHORT_INTERACTION_DELAY, MAX_SHORT_INTERACTION_DELAY))

        db.collection("whatsapp_contacts").document(contact_doc.id).update({
            "outreach_status": "contacted",
            "contacted_at":    firestore.SERVER_TIMESTAMP,
        })
        log_to_db("INFO", f"Outreach sent to {phone}.")
        return True

    except Exception as e:
        log_to_db("ERROR", f"Outreach failed for {phone}: {e}")
        db.collection("whatsapp_contacts").document(contact_doc.id).update({
            "outreach_status": "failed"
        })
        return False
    finally:
        try:
            driver.get("https://web.whatsapp.com/")
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Chat list']"))
            )
            time.sleep(random.uniform(MIN_SHORT_INTERACTION_DELAY, MAX_SHORT_INTERACTION_DELAY))
        except Exception:
            pass

# ── Main automation entry point ──────────────────────────────────────────────
def run_whatsapp_automation():
    driver            = None
    service           = None
    logged_in         = False
    unhandled_exception = None

    SESSION_BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "whatsapp_sessions")

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
            extra_args=["--window-size=3840,2160", "--force-device-scale-factor=0.5"],
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
        log_path    = os.path.join(session_path, "chromedriver.log")
        initialized = False
        for attempt in range(1, 4):
            try:
                log_to_db("INFO", f"WebDriver init attempt {attempt}…")
                service = Service(
                    executable_path=chromedriver_path,
                    service_args=["--verbose", f"--log-path={log_path}"],
                )
                driver = webdriver.Chrome(service=service, options=chrome_options)
                initialized = True
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
        driver.set_script_timeout(45)
        log_to_db("INFO", f"WebDriver ready. Session: {session_path}")

        driver.get("https://web.whatsapp.com/")
        log_to_db("INFO", "Navigated to web.whatsapp.com.")

        try:
            driver.execute_script('document.body.style.zoom = "25%"')
        except Exception:
            pass

        # ── Login / link phone ──────────────────────────────────────────────
        try:
            WebDriverWait(driver, 25).until(
                EC.any_of(
                    EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Chat list']")),
                    EC.presence_of_element_located(
                        (By.XPATH, "//div[@aria-label='Search input textbox'][@role='textbox'][@data-tab='3']")
                    ),
                )
            )
            logged_in = True
            log_to_db("INFO", "Existing session found — already logged in.")
        except TimeoutException:
            log_to_db("INFO", "No session. Starting phone linking…")
            try:
                WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable(
                        (By.XPATH, "//span[contains(text(), 'Link with phone number')] | //div[contains(text(), 'Log in with phone number')]")
                    )
                ).click()
                time.sleep(2.5)

                # Country selector
                try:
                    country_btn = WebDriverWait(driver, 15).until(
                        EC.element_to_be_clickable(
                            (By.XPATH, "//div[contains(@class, 'xdd8jsf') and contains(@class, 'xod5an3')]/button[.//span[@data-icon='chevron']]")
                        )
                    )
                    driver.execute_script("arguments[0].click();", country_btn)
                    time.sleep(2.0)
                    search = WebDriverWait(driver, 10).until(
                        EC.visibility_of_element_located(
                            (By.XPATH, "//div[@id='wa-popovers-bucket']//div[@role='textbox' and @contenteditable='true']")
                        )
                    )
                    search.click()
                    time.sleep(0.3)
                    search.send_keys(Keys.CONTROL + "a")
                    search.send_keys(Keys.DELETE)
                    time.sleep(0.3)
                    search.send_keys("qatar")
                    time.sleep(1.5)
                    WebDriverWait(driver, 10).until(
                        EC.element_to_be_clickable(
                            (By.XPATH, "//div[@id='wa-popovers-bucket']//button[.//div[normalize-space(.)='Qatar']]")
                        )
                    ).click()
                    time.sleep(1)
                except Exception as cs_err:
                    log_to_db("WARN", f"Country selector failed: {cs_err}")

                phone_input = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//input[@aria-label='Type your phone number.']"))
                )
                phone_input.clear()
                phone_input.send_keys(phone_number_to_input)
                time.sleep(1)
                WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[.//div[normalize-space(.)='Next']]"))
                ).click()
                time.sleep(2)

                log_to_db("INFO", "Phone submitted. Waiting for linking code…")
                code_el = WebDriverWait(driver, 20).until(
                    EC.visibility_of_element_located((By.XPATH, "//div[@data-link-code]"))
                )
                spans = code_el.find_elements(
                    By.XPATH, ".//span[contains(@class, 'x2b8uid') and normalize-space(.)!='-']"
                )
                code = "".join(s.text.strip() for s in spans if s.text.strip())
                if not code:
                    raise Exception("Could not extract linking code.")
                db.collection("whatsapp_linking_codes").add({
                    "instance_id": instance_id,
                    "code":        code,
                    "created_at":  firestore.SERVER_TIMESTAMP,
                })
                log_to_db("INFO", f"Linking code saved: {code[:4]}-****")

                log_to_db("INFO", "Waiting up to 120 s for user to link phone…")
                WebDriverWait(driver, 120).until(
                    EC.any_of(
                        EC.presence_of_element_located((By.XPATH, "//div[@aria-label='Chat list']")),
                        EC.presence_of_element_located(
                            (By.XPATH, "//div[@aria-label='Search input textbox'][@role='textbox'][@data-tab='3']")
                        ),
                    )
                )
                logged_in = True
                log_to_db("INFO", "Phone linked successfully.")
            except Exception as link_err:
                raise Exception(f"Fatal: phone linking failed: {link_err}")

        # ── Dismiss "Continue" popup ─────────────────────────────────────────
        if logged_in:
            try:
                WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable(
                        (By.XPATH, "//div[@role='dialog']//button[.//div[normalize-space()='Continue']]")
                    )
                ).click()
                time.sleep(3)
                log_to_db("INFO", "Dismissed Continue popup.")
            except TimeoutException:
                pass
            except Exception as pe:
                log_to_db("WARN", f"Popup check error: {pe}")

            db.collection("whatsapp_instances").document(instance_id).update({"status": "running"})
            log_to_db("INFO", "Status → running. Entering main loop.")

            # ── MAIN LOOP ────────────────────────────────────────────────────
            while not shutdown_requested:
                try:
                    # isActive guard
                    snap = db.collection("whatsapp_instances").document(instance_id).get()
                    if not snap.exists or not snap.to_dict().get("isActive"):
                        log_to_db("INFO", "isActive=false detected. Shutting down.")
                        break
                except Exception as e:
                    log_to_db("WARN", f"Could not verify isActive: {e}. Continuing.")

                poll_and_send_outgoing_messages(driver, instance_id)

                if check_and_click_unread_xpath(driver):
                    log_to_db("INFO", "Unread message found. Processing…")
                    time.sleep(random.uniform(6.0, 9.0))
                    contact_name = get_contact_name_with_xpath(driver)

                    if not contact_name or "UnknownContact" in contact_name:
                        log_to_db("WARN", "Could not identify contact. Refreshing.")
                        driver.refresh()
                        time.sleep(random.uniform(6.0, 9.0))
                        continue

                    log_to_db("INFO", f"Processing chat: {contact_name}")
                    existing_history = get_history_from_db(instance_id, contact_name)

                    try:
                        docs = (
                            db.collection("whatsapp_messages")
                            .where(filter=FieldFilter("instanceId", "==", instance_id))
                            .where(filter=FieldFilter("contactName", "==", contact_name))
                            .get()
                        )
                        existing_wa_ids = {
                            d.to_dict().get("wa_message_id")
                            for d in docs
                            if d.to_dict().get("wa_message_id")
                        }
                    except Exception as e:
                        log_to_db("ERROR", f"Failed fetching existing IDs for {contact_name}: {e}")
                        driver.refresh()
                        time.sleep(random.uniform(6.0, 9.0))
                        continue

                    scraped_items: List[Dict] = []
                    try:
                        chat_container = WebDriverWait(driver, 10).until(
                            EC.presence_of_element_located(
                                (By.XPATH, "//div[contains(@class, 'copyable-area')]//div[@role='grid'] | //div[@data-tab='8']")
                            )
                        )
                        soup     = BeautifulSoup(chat_container.get_attribute("innerHTML"), "html.parser")
                        rows     = soup.select('div[role="row"]')
                        row_data = []
                        for row in rows:
                            m = re.search(r"translateY\(([\d.-]+)px\)", row.get("style", ""))
                            ty = float(m.group(1)) if m else -1.0
                            msg_div = row.find("div", {"data-id": True})
                            if not msg_div:
                                continue
                            wa_id = msg_div.get("data-id")
                            if msg_div.find("div", class_="message-in"):
                                role = "user"
                            elif msg_div.find("div", class_="message-out"):
                                role = "model"
                            else:
                                continue
                            scraped_text, scraped_media = None, None
                            img = msg_div.find("img", {"src": lambda s: s and s.startswith("blob:")})
                            if img and role == "user":
                                b64, mime = get_image_base64_from_blob_url(driver, img["src"])
                                if b64 and mime:
                                    scraped_media = f"data:{mime};base64,{b64}"
                            ct = msg_div.find("div", class_="copyable-text")
                            if ct:
                                span = ct.find("span", class_="selectable-text")
                                raw  = (span or ct).get_text(separator="\n", strip=True)
                                scraped_text = filter_scraped_text(raw)
                            if scraped_text or scraped_media:
                                row_data.append({
                                    "translate_y": ty,
                                    "role":        role,
                                    "text":        scraped_text,
                                    "media_url":   scraped_media,
                                    "wa_id":       wa_id,
                                })
                        row_data.sort(key=lambda x: x["translate_y"])
                        scraped_items = row_data
                    except Exception as se:
                        log_to_db("ERROR", f"Scrape error for {contact_name}: {se}")

                    newly_for_ai: List[Dict] = []
                    new_count = 0
                    for item in scraped_items:
                        wa_id = item.get("wa_id")
                        if wa_id and wa_id not in existing_wa_ids:
                            if save_message_to_db(
                                instance_id, contact_name, item["role"],
                                item.get("text"), item.get("media_url"), wa_id,
                            ):
                                new_count += 1
                                parts: List = []
                                if item.get("text"):
                                    parts.append({"text": item["text"]})
                                if item.get("media_url"):
                                    try:
                                        hdr, enc = item["media_url"].split(",", 1)
                                        mime = hdr.split(":")[1].split(";")[0]
                                        parts.append({"inline_data": {"mime_type": mime, "data": enc}})
                                    except Exception:
                                        pass
                                if len(parts) > 1 and "text" in parts[1] and "text" not in parts[0]:
                                    parts.reverse()
                                newly_for_ai.append({"role": item["role"], "parts": parts})

                    if new_count:
                        log_to_db("INFO", f"Saved {new_count} new message(s) for {contact_name}.")

                    combined = existing_history + newly_for_ai
                    if combined and combined[-1].get("role") == "user":
                        log_to_db("INFO", f"User message detected. Generating reply for {contact_name}…")

                        # Simulate reading scroll
                        try:
                            pane = driver.find_element(
                                By.XPATH,
                                "//div[contains(@class, 'copyable-area')]//div[@role='grid']/../../.. | //div[@data-tab='8']",
                            )
                            driver.execute_script(
                                "arguments[0].scrollTop = arguments[0].scrollHeight + arguments[1]",
                                pane, random.randint(-120, 40),
                            )
                            time.sleep(random.uniform(0.6, 1.8))
                            driver.execute_script(
                                "arguments[0].scrollTop = arguments[0].scrollHeight", pane
                            )
                        except Exception:
                            pass

                        chat_session = reply_model.start_chat(history=combined[:-1])
                        ai_text      = ""
                        try:
                            resp      = chat_session.send_message(combined[-1]["parts"])
                            candidate = resp.candidates[0]
                            if any(
                                hasattr(p, "function_call") and p.function_call.name
                                for p in candidate.content.parts
                            ):
                                log_to_db("WARN", "Function call in response — not yet implemented.")
                            ai_text = get_gemini_response_text(resp)
                        except generation_types.BlockedPromptException as e:
                            log_to_db("WARN", f"AI blocked: {getattr(e, 'block_reason', 'Unknown')}")
                        except Exception as e:
                            log_to_db("ERROR", f"Gemini error: {e}")

                        if ai_text:
                            log_to_db("INFO", f"Sending AI reply to {contact_name}.")
                            try:
                                msg_box = WebDriverWait(driver, 10).until(
                                    EC.presence_of_element_located(
                                        (By.XPATH, "//div[@title='Type a message'][@role='textbox']")
                                    )
                                )
                                msg_box.click()
                                type_and_send_safely(driver, msg_box, ai_text)
                                save_message_to_db(instance_id, contact_name, "model", ai_text)
                                time.sleep(random.uniform(MIN_POST_ACTION_DELAY, MAX_POST_ACTION_DELAY))
                            except Exception as send_err:
                                log_to_db("ERROR", f"Failed to send reply: {send_err}")

                    driver.refresh()
                    time.sleep(random.uniform(6.0, 9.0))

                else:
                    if not poll_and_process_outreach_contact(driver, instance_id):
                        if random.random() < 0.25:
                            simulate_human_activity(driver)
                        sleep_dur = random.uniform(MIN_MAIN_LOOP_SLEEP, MAX_MAIN_LOOP_SLEEP)
                        t0 = time.time()
                        while time.time() - t0 < sleep_dur:
                            if shutdown_requested:
                                break
                            time.sleep(1)

    except Exception as e:
        tb        = traceback.format_exc()
        error_msg = f"{type(e).__name__}: {e}"
        # Append chromedriver log tail for easier debugging
        try:
            log_path = os.path.join(
                os.path.join(os.path.dirname(os.path.abspath(__file__)), "whatsapp_sessions"),
                instance_id, "chromedriver.log",
            )
            if os.path.exists(log_path):
                with open(log_path) as lf:
                    tail = lf.readlines()[-15:]
                    if tail:
                        error_msg += "\n\n--- DRIVER LOG TAIL ---\n" + "".join(tail)
        except Exception:
            pass
        log_to_db("FATAL", f"Unhandled error:\n{error_msg}\nTraceback:\n{tb}")
        unhandled_exception = error_msg

    finally:
        log_to_db("INFO", "Cleanup started…")
        stop_heartbeat.set()
        hb_thread.join()

        payload: Dict = {"worker_pid": None, "worker_hostname": None, "last_heartbeat": None}
        if unhandled_exception:
            payload["status"]    = "failed"
            payload["last_error"] = str(unhandled_exception)[:1024]
            # CRITICAL: disable instance on fatal crash so listener does NOT
            # immediately re-spawn it in an infinite loop. Re-enable from dashboard.
            payload["isActive"]  = False
        else:
            payload["status"] = "inactive"

        try:
            log_to_db("INFO", f"Releasing DB lock. Final status: {payload['status']}")
            db.collection("whatsapp_instances").document(instance_id).update(payload)
        except Exception as dbe:
            log_to_db("WARN", f"Could not release DB lock: {dbe}")

        if driver:
            try:
                driver.quit()
            except Exception as qe:
                log_to_db("WARN", f"driver.quit() error: {qe}")
        if service:
            try:
                service.stop()
            except Exception as se:
                log_to_db("WARN", f"service.stop() error: {se}")

        log_to_db("INFO", "Cleanup complete. Worker exiting.")


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, handle_shutdown_signal)
    signal.signal(signal.SIGINT,  handle_shutdown_signal)
    run_whatsapp_automation()
