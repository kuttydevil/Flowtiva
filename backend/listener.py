# backend/listener.py  (Enterprise Orchestrator)
# Self-healing, stateless process manager for WhatsApp and Instagram workers.
#
# What it does:
#   1. Kills zombie workers (PID dead but DB says running).
#   2. Kills heartbeat-timed-out workers (PID alive but silent > threshold).
#   3. Launches workers for every isActive=True instance that has no running PID.
#   4. SKIPS instances with status="failed" — they disabled themselves and need
#      the user to re-enable them from the dashboard after fixing the issue.
#   5. Manages the insta_reposter daemon.

import warnings
warnings.simplefilter("ignore", FutureWarning)

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
from tenacity import retry, wait_exponential, stop_after_attempt

import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore_v1.client import Client
from google.cloud.firestore_v1.base_query import FieldFilter
import requests
from dotenv import load_dotenv

load_dotenv()

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("Listener")

# ── Alerting ─────────────────────────────────────────────────────────────────
ALERT_WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL", "")

def send_alert(message: str) -> None:
    if not ALERT_WEBHOOK_URL:
        return
    try:
        requests.post(
            ALERT_WEBHOOK_URL,
            json={"content": f"🚨 **CRITICAL ALERT:** {message}"},
            timeout=5,
        )
    except Exception as e:
        logger.error(f"Webhook alert failed: {e}")

# ── Firebase ─────────────────────────────────────────────────────────────────
try:
    firebase_admin.initialize_app()
except ValueError:
    pass

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(5))
def get_db_client() -> Client:
    db_id = os.getenv("FIRESTORE_DATABASE_ID")
    return firestore.client(database_id=db_id) if db_id else firestore.client()

db: Client = get_db_client()

# ── Configuration ─────────────────────────────────────────────────────────────
RECONCILE_INTERVAL:  int = 30    # seconds between orchestrator cycles
HEARTBEAT_THRESHOLD: int = 150   # seconds before a silent worker is killed

_BACKEND_DIR     = os.path.dirname(os.path.abspath(__file__))
AIWA_SCRIPT      = os.path.join(_BACKEND_DIR, "aiwa_multi.py")
INSTA_SCRIPT     = os.path.join(_BACKEND_DIR, "insta_multi.py")
REPOSTER_SCRIPT  = os.path.join(_BACKEND_DIR, "insta_reposter.py")

LISTENER_HOSTNAME: str = socket.gethostname()
reposter_process: Optional[subprocess.Popen] = None

# ── Shutdown ──────────────────────────────────────────────────────────────────
shutdown_flag: bool = False

def handle_shutdown_signal(signum: int, frame: Any) -> None:
    global shutdown_flag
    if not shutdown_flag:
        logger.warning("Shutdown signal received. Finishing cycle and terminating workers…")
        shutdown_flag = True

# ── Process helpers ───────────────────────────────────────────────────────────
def is_process_running(pid: Optional[int]) -> bool:
    if not pid or pid <= 0:
        return False
    try:
        return psutil.pid_exists(pid)
    except Exception:
        return False

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def update_instance_status(collection: str, instance_id: str, payload: Dict[str, Any]) -> None:
    db.collection(collection).document(instance_id).update(payload)

def start_worker_process(instance_id: str, script_path: str) -> None:
    """Launch a new worker subprocess and immediately write its PID to Firestore."""
    if not os.path.exists(script_path):
        logger.error(f"Script not found: {script_path}")
        return

    collection = "whatsapp_instances" if "aiwa" in script_path else "instagram_instances"
    logger.info(f"Launching {os.path.basename(script_path)} for {instance_id}")
    try:
        proc = subprocess.Popen(
            [sys.executable, script_path, instance_id],
            stdout=sys.stdout,
            stderr=sys.stderr,
        )
        # Write PID immediately to prevent a second launch before the worker claims it
        try:
            update_instance_status(collection, instance_id, {
                "worker_pid":      proc.pid,
                "worker_hostname": LISTENER_HOSTNAME,
                "status":          "booting",
            })
        except Exception as e:
            logger.error(f"Failed to record PID for {instance_id}: {e}")
    except Exception as e:
        logger.error(f"FAILED to launch {instance_id}: {e}", exc_info=True)
        try:
            update_instance_status(collection, instance_id, {
                "status":     "failed",
                "last_error": f"Orchestrator launch error: {e}",
            })
        except Exception as ue:
            logger.error(f"Could not update status for {instance_id}: {ue}")

def stop_worker_process(pid: Optional[int]) -> None:
    if not pid or not is_process_running(pid):
        return
    try:
        proc = psutil.Process(pid)
        logger.info(f"Stopping PID {pid}…")
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except psutil.TimeoutExpired:
            logger.warning(f"PID {pid} did not stop — force killing.")
            proc.kill()
    except psutil.NoSuchProcess:
        pass
    except Exception as e:
        logger.error(f"Error stopping PID {pid}: {e}")

# ── Firestore query helper ────────────────────────────────────────────────────
@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
def fetch_workers(collection: str, query_filter: Dict[str, Any]) -> List[Any]:
    ref   = db.collection(collection)
    query = ref
    for key, val in query_filter.items():
        if isinstance(val, dict) and "in" in val:
            query = query.where(filter=FieldFilter(key, "in", val["in"]))
        else:
            query = query.where(filter=FieldFilter(key, "==", val))
    return list(query.get())

# ── Core reconciliation logic ─────────────────────────────────────────────────
def reconcile_workers() -> None:

    # ── 1. Kill zombies & heartbeat-timed-out workers ────────────────────────
    try:
        platforms = [("whatsapp_instances", "WA"), ("instagram_instances", "IG")]
        for collection, tag in platforms:
            running = fetch_workers(
                collection,
                {"worker_hostname": LISTENER_HOSTNAME, "status": {"in": ["running", "linking", "booting"]}},
            )
            for doc in running:
                w      = doc.to_dict()
                wid    = doc.id
                pid    = w.get("worker_pid")

                if not is_process_running(pid):
                    logger.warning(f"Worker PID {pid} ({tag}/{wid}) is dead — cleaning up.")
                    send_alert(f"Worker PID {pid} ({tag}) for {wid} died unexpectedly.")
                    update_instance_status(collection, wid, {
                        "status":     "failed",
                        "worker_pid": None,
                        "last_error": "Process vanished unexpectedly.",
                        # Do NOT set isActive=False here — let the worker handle that on its
                        # own clean exit. Only the worker knows if it was fatal or not.
                    })
                    continue

                last_hb = w.get("last_heartbeat")
                if last_hb:
                    if isinstance(last_hb, str):
                        last_hb = datetime.fromisoformat(last_hb.replace("Z", "+00:00"))
                    age = (datetime.now(timezone.utc) - last_hb).total_seconds()
                    if age > HEARTBEAT_THRESHOLD:
                        logger.warning(f"Worker PID {pid} ({tag}/{wid}) heartbeat timeout — killing.")
                        send_alert(f"Worker PID {pid} ({tag}) for {wid} timed out.")
                        stop_worker_process(pid)
                        update_instance_status(collection, wid, {
                            "status":     "failed",
                            "worker_pid": None,
                            "last_error": "Heartbeat timeout.",
                        })
    except Exception as e:
        logger.error(f"Health check error: {e}", exc_info=True)

    if shutdown_flag:
        return

    # ── 2. Launch pending instances ──────────────────────────────────────────
    try:
        configs = [("whatsapp_instances", AIWA_SCRIPT), ("instagram_instances", INSTA_SCRIPT)]
        for collection, script in configs:
            pending = fetch_workers(collection, {"isActive": True})
            for doc in pending:
                instance    = doc.to_dict()
                instance_id = doc.id
                pid         = instance.get("worker_pid")
                hostname    = instance.get("worker_hostname")
                status      = instance.get("status")

                # CRITICAL: Never re-spawn a failed instance.
                # The worker sets isActive=False on fatal crash, but between the
                # crash and the next Firestore read, isActive might still appear True.
                # The status="failed" guard handles that window.
                if status == "failed":
                    continue

                # Check if the PID is actually running on this host
                is_running_here = (
                    bool(pid)
                    and hostname == LISTENER_HOSTNAME
                    and is_process_running(pid)
                )

                if not pid:
                    logger.info(f"Instance {instance_id} has no PID — launching.")
                    start_worker_process(instance_id, script)
                elif not is_running_here:
                    logger.info(
                        f"Instance {instance_id} PID {pid} is not running on {LISTENER_HOSTNAME} — re-launching."
                    )
                    start_worker_process(instance_id, script)
                # else: running fine — nothing to do
    except Exception as e:
        logger.error(f"Reconciliation error: {e}", exc_info=True)

    # ── 3. Reposter daemon ───────────────────────────────────────────────────
    try:
        global reposter_process
        if reposter_process is None or not is_process_running(reposter_process.pid):
            if not os.path.exists(REPOSTER_SCRIPT):
                logger.warning(f"Reposter script not found: {REPOSTER_SCRIPT}")
            else:
                logger.info("Starting Reposter Engine Daemon…")
                reposter_process = subprocess.Popen(
                    [sys.executable, REPOSTER_SCRIPT],
                    stdout=sys.stdout,
                    stderr=sys.stderr,
                )
                logger.info(f"Reposter Engine PID {reposter_process.pid}")
    except Exception as e:
        logger.error(f"Reposter check error: {e}", exc_info=True)

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    signal.signal(signal.SIGINT,  handle_shutdown_signal)
    signal.signal(signal.SIGTERM, handle_shutdown_signal)

    # Termux wake lock — keeps CPU alive in background
    try:
        wake_lock = "/data/data/com.termux/files/usr/bin/termux-wake-lock"
        if os.path.exists(wake_lock):
            os.system("termux-wake-lock")
            logger.info("Termux Wake Lock acquired.")
    except Exception as e:
        logger.warning(f"Wake lock error: {e}")

    logger.info("Orchestrator started. Robust Mode: ENTERPRISE.")

    while not shutdown_flag:
        try:
            reconcile_workers()
        except Exception as e:
            logger.critical(f"CRITICAL LOOP ERROR: {e}", exc_info=True)

        for _ in range(RECONCILE_INTERVAL):
            if shutdown_flag:
                break
            time.sleep(1)

    logger.info("Shutdown initiated…")

    if reposter_process:
        stop_worker_process(reposter_process.pid)

    try:
        for collection in ("whatsapp_instances", "instagram_instances"):
            docs = fetch_workers(collection, {"worker_hostname": LISTENER_HOSTNAME})
            for doc in docs:
                pid = doc.to_dict().get("worker_pid")
                if pid:
                    stop_worker_process(pid)
    except Exception as e:
        logger.error(f"Shutdown cleanup error: {e}")

    logger.info("Goodbye.")
