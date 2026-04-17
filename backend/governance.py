# backend/governance.py
import time
from functools import wraps
from typing import Callable, Any
from datetime import datetime

import firebase_admin
from firebase_admin import firestore

# Initialize Firestore if not already done
try:
    firebase_admin.initialize_app()
except ValueError:
    pass

from dotenv import load_dotenv
import os
load_dotenv()

db_id = os.getenv("FIRESTORE_DATABASE_ID")
db = firestore.client(database_id=db_id) if db_id else firestore.client()

# Mirroring frontend aiPolicy
AI_POLICY = {
    "max_retries": 2,
    "daily_call_limit": 5000,
}

# Placeholder for the logger that will be injected from the main script
log = lambda level, message, **kwargs: print(f"[{level}] {message}")

def set_logger(logger_func):
    """Injects the main logger from the parent script."""
    global log
    log = logger_func

def _log_telemetry(tenant_id: str, action_key: str, status: str, duration_ms: int = None, error_message: str = None):
    """Logs a telemetry event to the database."""
    try:
        telemetry_data = {
            "tenant_id": tenant_id,
            "action_key": action_key,
            "status": status,
            "latency_ms": duration_ms,
            "error_message": error_message,
            "timestamp": firestore.SERVER_TIMESTAMP
        }
        db.collection("ai_telemetry").add(telemetry_data)
    except Exception as e:
        log("ERROR", f"Failed to log AI telemetry: {e}")

def execute_with_policy(action_key: str, tenant_id: str):
    """
    A decorator that wraps an AI call with governance policies:
    1. Checks daily usage limits.
    2. Retries on failure with exponential backoff.
    3. Logs detailed telemetry for each attempt.
    4. Atomically increments usage count on success.
    """
    def decorator(fetcher: Callable[..., Any]):
        @wraps(fetcher)
        def wrapper(*args, **kwargs):
            # 1. Check daily limit
            today = datetime.utcnow().strftime('%Y-%m-%d')
            usage_doc_id = f"{tenant_id}_{today}"
            try:
                usage_ref = db.collection("ai_usage").document(usage_doc_id)
                usage_doc = usage_ref.get()
                current_calls = usage_doc.to_dict().get('calls', 0) if usage_doc.exists else 0
                
                if current_calls >= AI_POLICY["daily_call_limit"]:
                    err_msg = "Daily AI call limit exceeded for tenant."
                    log("WARN", err_msg)
                    _log_telemetry(tenant_id, action_key, 'error', error_message=err_msg)
                    raise Exception(err_msg)
            except Exception as e:
                log("ERROR", f"Could not check AI usage limit: {e}")

            # 2. Retry Loop
            attempt = 0
            start_time = time.time()
            last_exception = None

            while attempt <= AI_POLICY["max_retries"]:
                try:
                    # 3. Call the actual AI function
                    result = fetcher(*args, **kwargs)
                    
                    # 4. On success, increment usage and log telemetry
                    duration_ms = int((time.time() - start_time) * 1000)
                    
                    # Atomic increment in Firestore
                    usage_ref = db.collection("ai_usage").document(usage_doc_id)
                    usage_ref.set({
                        "tenant_id": tenant_id,
                        "date": today,
                        "calls": firestore.Increment(1),
                        "last_call_at": firestore.SERVER_TIMESTAMP
                    }, merge=True)
                    
                    _log_telemetry(tenant_id, action_key, 'success', duration_ms=duration_ms)
                    
                    return result

                except Exception as e:
                    last_exception = e
                    duration_ms = int((time.time() - start_time) * 1000)
                    log("WARN", f"AI action '{action_key}' failed on attempt {attempt + 1}: {e}")
                    _log_telemetry(tenant_id, action_key, 'error', duration_ms=duration_ms, error_message=str(e))
                    
                    attempt += 1
                    if attempt <= AI_POLICY["max_retries"]:
                        # Exponential backoff
                        sleep_time = (2 ** attempt) + (time.time() % 1) # Add jitter
                        log("INFO", f"Retrying in {sleep_time:.2f} seconds...")
                        time.sleep(sleep_time)
            
            # 5. Handle final failure after all retries
            log("ERROR", f"AI action '{action_key}' failed after {AI_POLICY['max_retries'] + 1} attempts.")
            raise last_exception or Exception("AI action failed after all retries.")

        return wrapper
    return decorator
