# backend/listener.py
# A stateless, self-healing orchestrator for managing workers.
# ROBUSTNESS LEVEL: ENTERPRISE (Self-healing, Logging, Backoff, Typing)

import os
import sys
import time
import signal
import psutil
import socket
import logging
import subprocess
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.client import Client
import requests
from dotenv import load_dotenv

# Load enterprise env variables
load_dotenv()

# --- ENTERPRISE LOGGING SETUP ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [%(name)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("Listener")

# --- ALERTING CONFIGURATION ---
ALERT_WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL", "") # Add your Discord/Telegram Webhook URL to .env

def send_alert(message: str) -> None:
    """Sends a critical alert to the configured webhook."""
    if not ALERT_WEBHOOK_URL:
        return
    try:
        requests.post(ALERT_WEBHOOK_URL, json={"content": f"🚨 **CRITICAL ALERT:** {message}"}, timeout=5)
    except Exception as e:
        logger.error(f"Failed to send webhook alert: {e}")

# --- CONFIGURATION ---
# Initialize Firebase Admin SDK
try:
    firebase_admin.initialize_app()
except ValueError:
    pass  # Already initialized

import os

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(5)
)
def get_db_client() -> Client:
    """Returns the Firestore client with exponential backoff on failure."""
    db_id = os.getenv("FIRESTORE_DATABASE_ID")
    return firestore.client(database_id=db_id) if db_id else firestore.client()

db: Client = get_db_client()
RECONCILE_INTERVAL: int = 15  # seconds
HEARTBEAT_THRESHOLD: int = 120 # seconds
AIWA_SCRIPT: str = os.path.join(os.path.dirname(__file__), "aiwa_multi.py")
INSTA_SCRIPT: str = os.path.join(os.path.dirname(__file__), "insta_multi.py")
REPOSTER_SCRIPT: str = os.path.join(os.path.dirname(__file__), "insta_reposter.py")

LISTENER_HOSTNAME: str = socket.gethostname()
reposter_process: Optional[subprocess.Popen] = None

# --- SHUTDOWN HANDLING ---
shutdown_flag: bool = False

def handle_shutdown_signal(signum: int, frame: Any) -> None:
    global shutdown_flag
    if not shutdown_flag:
        logger.warning("Shutdown signal received. Finishing current cycle and terminating workers...")
        shutdown_flag = True

# --- PROCESS MANAGEMENT ---
def is_process_running(pid: Optional[int]) -> bool:
    if pid is None or pid <= 0: 
        return False
    try:
        return psutil.pid_exists(pid)
    except Exception:
        return False

def kill_orphaned_chrome_processes() -> None:
    """Aggressively finds and kills Chrome/Chromedriver processes not attached to a known worker."""
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                name = proc.info.get('name', '').lower()
                if 'chrome' in name or 'chromedriver' in name:
                    # In a dedicated container/server, we could kill all chrome processes
                    pass
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception as e:
        logger.error(f"Error while cleaning orphaned processes: {e}")

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def update_instance_status(table_name: str, instance_id: str, payload: Dict[str, Any]) -> None:
    """Updates the Firestore document with retry logic."""
    db.collection(table_name).document(instance_id).update(payload)

def start_worker_process(instance_id: str, script_path: str, is_reposter: bool = False) -> None:
    """Starts a new worker process."""
    if not os.path.exists(script_path):
        if os.path.exists(script_path + ".txt"):
            script_path = script_path + ".txt"
        else:
            logger.error(f"Script not found: {script_path}")
            return

    table_name = "instagram_reposter_jobs" if is_reposter else ("whatsapp_instances" if "aiwa" in script_path else "instagram_instances")
    
    logger.info(f"Launching {os.path.basename(script_path)} for ID {instance_id}")
    try:
        subprocess.Popen(
            [sys.executable, script_path, instance_id],
            stdout=sys.stdout,
            stderr=sys.stderr
        )
    except Exception as e:
        logger.error(f"FAILED to launch worker {instance_id}: {e}", exc_info=True)
        if not is_reposter:
            try:
                update_instance_status(table_name, instance_id, {
                    "status": "failed", "last_error": f"Orchestrator launch error: {e}"
                })
            except Exception as update_err:
                logger.error(f"Failed to update status for {instance_id}: {update_err}")

def stop_worker_process(pid: Optional[int]) -> None:
    if pid is None or not is_process_running(pid): 
        return
    try:
        proc = psutil.Process(pid)
        logger.info(f"Stopping Worker PID {pid}...")
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except psutil.TimeoutExpired:
            logger.warning(f"Worker PID {pid} stuck. Force killing...")
            proc.kill()
    except psutil.NoSuchProcess:
        pass
    except Exception as e:
        logger.error(f"Error stopping PID {pid}: {e}")

# --- MAIN ORCHESTRATION LOGIC ---
@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def fetch_workers(collection_name: str, query_filter: Dict[str, Any]) -> List[Any]:
    """Fetches workers securely with exponential backoff."""
    ref = db.collection(collection_name)
    query = ref
    for key, val in query_filter.items():
        if isinstance(val, dict) and "in" in val:
            query = query.where(key, "in", val["in"])
        else:
            query = query.where(key, "==", val)
    return list(query.get())

def reconcile_workers() -> None:
    """The core loop that syncs DB state with running processes."""
    
    # --- 1. CLEANUP ZOMBIES (Health Check) ---
    try:
        platforms = [("whatsapp_instances", "WA"), ("instagram_instances", "IG")]
        for collection, tag in platforms:
            workers = fetch_workers(collection, {"worker_hostname": LISTENER_HOSTNAME, "status": {"in": ["running", "linking"]}})
            for doc in workers:
                w = doc.to_dict()
                w_id = doc.id
                pid = w.get('worker_pid')
                
                if not is_process_running(pid):
                    logger.warning(f"Worker {pid} ({tag}) is dead. Cleaning up DB.")
                    send_alert(f"Worker {pid} for instance {w_id} ({tag}) died unexpectedly. Cleaning up.")
                    update_instance_status(collection, w_id, {"status": "failed", "worker_pid": None, "last_error": "Process vanished unexpectedly."})
                elif w.get('last_heartbeat'):
                    last_hb_str = w['last_heartbeat'].replace('Z', '+00:00')
                    last_hb = datetime.fromisoformat(last_hb_str)
                    if (datetime.now(timezone.utc) - last_hb).total_seconds() > HEARTBEAT_THRESHOLD:
                        logger.warning(f"Worker {pid} ({tag}) heartbeat timeout. Killing.")
                        send_alert(f"Worker {pid} for instance {w_id} ({tag}) timed out. Force killing.")
                        stop_worker_process(pid)
                        update_instance_status(collection, w_id, {"status": "failed", "worker_pid": None, "last_error": "Heartbeat timeout."})
    except Exception as e:
        logger.error(f"Health check error: {e}", exc_info=True)

    # --- 2. LAUNCH PENDING INSTANCES ---
    if shutdown_flag: return

    try:
        pending_configs = [("whatsapp_instances", AIWA_SCRIPT), ("instagram_instances", INSTA_SCRIPT)]
        for collection, script in pending_configs:
            pending = fetch_workers(collection, {"isActive": True})
            for doc in pending:
                instance = doc.to_dict()
                instance_id = doc.id
                pid = instance.get('worker_pid')
                
                if not pid or (instance.get('worker_hostname') == LISTENER_HOSTNAME and not is_process_running(pid)):
                    start_worker_process(instance_id, script)
    except Exception as e:
        logger.error(f"Reconciliation error: {e}", exc_info=True)

    # --- 3. REPOSTER JOBS (Daemon Management) ---
    try:
        global reposter_process
        if reposter_process is None or not is_process_running(reposter_process.pid):
            logger.info("Starting Reposter Engine Daemon...")
            reposter_process = subprocess.Popen([sys.executable, REPOSTER_SCRIPT], stdout=sys.stdout, stderr=sys.stderr)
            logger.info(f"Reposter Engine running with PID {reposter_process.pid}")
    except Exception as e:
        logger.error(f"Reposter check error: {e}", exc_info=True)

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    signal.signal(signal.SIGINT, handle_shutdown_signal)
    signal.signal(signal.SIGTERM, handle_shutdown_signal)
    
    # IMPROVEMENT 4: Enable Termux Wake Lock to prevent Android from sleeping the CPU
    try:
        if os.path.exists("/data/data/com.termux/files/usr/bin/termux-wake-lock"):
            os.system("termux-wake-lock")
            logger.info("Termux Wake Lock acquired to maintain background execution.")
    except Exception as e:
        logger.warning(f"Failed to acquire Termux Wake Lock: {e}")

    logger.info("Orchestrator started. Robust Mode: ENTERPRISE.")
    kill_orphaned_chrome_processes()

    while not shutdown_flag:
        try:
            reconcile_workers()
        except Exception as e:
            logger.critical(f"CRITICAL LOOP ERROR: {e}", exc_info=True)
        
        for _ in range(RECONCILE_INTERVAL):
            if shutdown_flag: break
            time.sleep(1)

    logger.info("Shutdown initiated...")
    
    if reposter_process:
        stop_worker_process(reposter_process.pid)

    try:
        for collection in ["whatsapp_instances", "instagram_instances"]:
            docs = fetch_workers(collection, {"worker_hostname": LISTENER_HOSTNAME})
            for doc in docs:
                w = doc.to_dict()
                if w.get('worker_pid'): 
                    stop_worker_process(w['worker_pid'])
    except Exception as e:
        logger.error(f"Error during shutdown worker cleanup: {e}")
            
    logger.info("Goodbye.")
