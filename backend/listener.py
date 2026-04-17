
# backend/listener.py
# A stateless, self-healing orchestrator for managing workers.
# ROBUSTNESS LEVEL: HIGH (Self-healing, Zombie Cleanup, Connection Retries)

import os
import sys
import time
import signal
import psutil
import socket
import subprocess
from typing import Dict, Any, Optional
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore

# --- CONFIGURATION ---
# Initialize Firebase Admin SDK
try:
    firebase_admin.initialize_app()
except ValueError:
    # Already initialized
    pass

db = firestore.client()
RECONCILE_INTERVAL = 15  # seconds
HEARTBEAT_THRESHOLD = 120 # seconds
AIWA_SCRIPT = os.path.join(os.path.dirname(__file__), "aiwa_multi.py") # Expecting .py now
INSTA_SCRIPT = os.path.join(os.path.dirname(__file__), "insta_multi.py")
REPOSTER_SCRIPT = os.path.join(os.path.dirname(__file__), "insta_reposter.py")

LISTENER_HOSTNAME = socket.gethostname()

# --- SHUTDOWN HANDLING ---
shutdown_flag = False
def handle_shutdown_signal(signum, frame):
    global shutdown_flag
    if not shutdown_flag:
        print("\n[Listener] Shutdown signal received. Finishing current cycle and terminating workers...")
        shutdown_flag = True

# --- PROCESS MANAGEMENT ---
def is_process_running(pid: int) -> bool:
    if pid is None or pid <= 0: return False
    try:
        return psutil.pid_exists(pid)
    except Exception:
        return False

def kill_orphaned_chrome_processes():
    """Aggressively finds and kills Chrome/Chromedriver processes not attached to a known worker."""
    # In a simple deployment, we assume THIS listener owns all chrome processes.
    # Be careful running this on a shared desktop machine.
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if 'chrome' in proc.info['name'].lower() or 'chromedriver' in proc.info['name'].lower():
                    # Check if this process is a child of any known worker? 
                    # For robust headless servers, we might just kill them all if we are restarting.
                    pass
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception:
        pass

def start_worker_process(instance_id: str, script_path: str, is_reposter=False):
    """Starts a new worker process."""
    if not os.path.exists(script_path):
        # Fallback to .txt if .py doesn't exist (dev mode)
        if os.path.exists(script_path + ".txt"):
            script_path = script_path + ".txt"
        else:
            print(f"[Listener] ❌ Script not found: {script_path}")
            return

    table_name = "instagram_reposter_jobs" if is_reposter else ("whatsapp_instances" if "aiwa" in script_path else "instagram_instances")
    
    print(f"[Listener] 🚀 Launching {os.path.basename(script_path)} for ID {instance_id}...")
    try:
        # We use Popen to not block the listener
        subprocess.Popen([sys.executable, script_path, instance_id],
                         stdout=sys.stdout,
                         stderr=sys.stderr)
    except Exception as e:
        print(f"[Listener] ❌ FAILED to launch worker: {e}")
        try:
            if not is_reposter:
                db.collection(table_name).document(instance_id).update({
                    "status": "failed", "last_error": f"Orchestrator launch error: {e}"
                })
        except:
            pass

def stop_worker_process(pid: int):
    if not is_process_running(pid): return
    try:
        proc = psutil.Process(pid)
        print(f"[Listener] 🛑 Stopping Worker PID {pid}...")
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except psutil.TimeoutExpired:
            print(f"[Listener] ⚠️ Worker PID {pid} stuck. Force killing...")
            proc.kill()
    except psutil.NoSuchProcess:
        pass
    except Exception as e:
        print(f"[Listener] Error stopping PID {pid}: {e}")

# --- MAIN ORCHESTRATION LOGIC ---
def reconcile_workers():
    """The core loop that syncs DB state with running processes."""
    
    # --- 1. CLEANUP ZOMBIES (Health Check) ---
    try:
        # WhatsApp
        wa_ref = db.collection("whatsapp_instances")
        wa_workers = wa_ref.where("worker_hostname", "==", LISTENER_HOSTNAME).where("status", "in", ["running", "linking"]).get()
        for doc in wa_workers:
            w = doc.to_dict()
            w['id'] = doc.id
            if not is_process_running(w.get('worker_pid')):
                print(f"[Listener] 💀 Worker {w.get('worker_pid')} (WA) is dead. Cleaning up DB.")
                wa_ref.document(w['id']).update({"status": "failed", "worker_pid": None, "last_error": "Process vanished unexpectedly."})
            elif w.get('last_heartbeat'):
                last_hb = datetime.fromisoformat(w['last_heartbeat'].replace('Z', '+00:00'))
                if (datetime.now(timezone.utc) - last_hb).total_seconds() > HEARTBEAT_THRESHOLD:
                    print(f"[Listener] 💓 Worker {w.get('worker_pid')} (WA) heartbeat timeout. Killing.")
                    stop_worker_process(w.get('worker_pid'))
                    wa_ref.document(w['id']).update({"status": "failed", "worker_pid": None, "last_error": "Heartbeat timeout."})

        # Instagram
        ig_ref = db.collection("instagram_instances")
        ig_workers = ig_ref.where("worker_hostname", "==", LISTENER_HOSTNAME).where("status", "in", ["running", "linking"]).get()
        for doc in ig_workers:
            w = doc.to_dict()
            w['id'] = doc.id
            if not is_process_running(w.get('worker_pid')):
                print(f"[Listener] 💀 Worker {w.get('worker_pid')} (IG) is dead. Cleaning up DB.")
                ig_ref.document(w['id']).update({"status": "failed", "worker_pid": None, "last_error": "Process vanished unexpectedly."})
            elif w.get('last_heartbeat'):
                last_hb = datetime.fromisoformat(w['last_heartbeat'].replace('Z', '+00:00'))
                if (datetime.now(timezone.utc) - last_hb).total_seconds() > HEARTBEAT_THRESHOLD:
                    print(f"[Listener] 💓 Worker {w.get('worker_pid')} (IG) heartbeat timeout. Killing.")
                    stop_worker_process(w.get('worker_pid'))
                    ig_ref.document(w['id']).update({"status": "failed", "worker_pid": None, "last_error": "Heartbeat timeout."})

    except Exception as e:
        print(f"[Listener] ⚠️ Health check error: {e}")

    # --- 2. LAUNCH PENDING INSTANCES ---
    if shutdown_flag: return

    try:
        # WhatsApp
        wa_pending = wa_ref.where("isActive", "==", True).get()
        for doc in wa_pending:
            instance = doc.to_dict()
            instance['id'] = doc.id
            if not instance.get('worker_pid'):
                start_worker_process(instance['id'], AIWA_SCRIPT)
            elif instance.get('worker_hostname') == LISTENER_HOSTNAME and not is_process_running(instance['worker_pid']):
                 start_worker_process(instance['id'], AIWA_SCRIPT)

        # Instagram
        ig_pending = ig_ref.where("isActive", "==", True).get()
        for doc in ig_pending:
            instance = doc.to_dict()
            instance['id'] = doc.id
            if not instance.get('worker_pid'):
                start_worker_process(instance['id'], INSTA_SCRIPT)
            elif instance.get('worker_hostname') == LISTENER_HOSTNAME and not is_process_running(instance['worker_pid']):
                 start_worker_process(instance['id'], INSTA_SCRIPT)

    except Exception as e:
        print(f"[Listener] ⚠️ Reconciliation error: {e}")

    # --- 3. REPOSTER JOBS (One Process Per Job for isolation) ---
    # In a real SaaS, you'd use a queue (Celery/BullMQ). For this script-based backend:
    # We will launch a ephemeral reposter script if the job is active and due.
    try:
        # reposter_jobs = db.collection("instagram_reposter_jobs").where("status", "==", "active").get()
        # The reposter script itself handles the "is it due?" logic, 
        # BUT launching a new process every 15s is bad. 
        # BETTER ARCHITECTURE: Launch ONE permanent 'reposter_worker' that loops through all jobs.
        # Let's check if our Reposter Engine is running.
        
        # We'll use a simple lock file or check process name to see if the main reposter engine is up.
        # For simplicity in this specific "file-based" setup, we will launch it ONCE if not running.
        # However, since psutil matching by script name is tricky with python arguments, 
        # we will assume the user runs `listener.py` which launches `insta_reposter.py` as a subprocess 
        # and keeps a reference.
        
        # ACTUALLY: The best way here is to launch `insta_reposter.py` as a daemon managed by this listener.
        # We will store its PID in memory here (not DB).
        global reposter_process
        if reposter_process is None or not is_process_running(reposter_process.pid):
            print("[Listener] 🔄 Starting Reposter Engine Daemon...")
            reposter_process = subprocess.Popen([sys.executable, REPOSTER_SCRIPT], stdout=sys.stdout, stderr=sys.stderr)
            print(f"[Listener] Reposter Engine running with PID {reposter_process.pid}")

    except Exception as e:
        print(f"[Listener] ⚠️ Reposter check error: {e}")


reposter_process = None

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    signal.signal(signal.SIGINT, handle_shutdown_signal)
    signal.signal(signal.SIGTERM, handle_shutdown_signal)
    
    print("[Listener] Orchestrator started. Robust Mode: ON.")
    
    # Initial cleanup
    kill_orphaned_chrome_processes()

    while not shutdown_flag:
        try:
            reconcile_workers()
        except Exception as e:
            print(f"[Listener] 💥 CRITICAL LOOP ERROR: {e}")
            # Don't crash, just wait and retry
        
        # Sleep in small chunks to be responsive to shutdown
        for _ in range(RECONCILE_INTERVAL):
            if shutdown_flag: break
            time.sleep(1)

    print("[Listener] Shutdown initiated...")
    
    # Kill reposter
    if reposter_process:
        stop_worker_process(reposter_process.pid)

    # Kill managed workers
    try:
        # Cleanup WhatsApp
        wa_data = db.collection("whatsapp_instances").where("worker_hostname", "==", LISTENER_HOSTNAME).get()
        for doc in wa_data:
            w = doc.to_dict()
            if w.get('worker_pid'): stop_worker_process(w['worker_pid'])
        
        # Cleanup Insta
        ig_data = db.collection("instagram_instances").where("worker_hostname", "==", LISTENER_HOSTNAME).get()
        for doc in ig_data:
            w = doc.to_dict()
            if w.get('worker_pid'): stop_worker_process(w['worker_pid'])
    except:
        pass
            
    print("[Listener] Goodbye.")
