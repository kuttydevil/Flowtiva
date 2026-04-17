# backend/governance.py
# AI governance layer: daily usage limits, retry-with-backoff, telemetry logging.
# Wraps any AI-calling function as a decorator.

import time
import os
from functools import wraps
from typing import Callable, Any
from datetime import datetime

import firebase_admin
from firebase_admin import firestore
from dotenv import load_dotenv

load_dotenv()

try:
    firebase_admin.initialize_app()
except ValueError:
    pass

db_id = os.getenv("FIRESTORE_DATABASE_ID")
db    = firestore.client(database_id=db_id) if db_id else firestore.client()

# ── Policy (mirrors frontend aiPolicy) ───────────────────────────────────────
AI_POLICY = {
    "max_retries":       2,
    "daily_call_limit":  5000,
}

# ── Pluggable logger ──────────────────────────────────────────────────────────
log = lambda level, message, **_: print(f"[{level}] {message}")

def set_logger(logger_func: Callable) -> None:
    """Inject the logger from the parent worker script."""
    global log
    log = logger_func

# ── Internal helpers ──────────────────────────────────────────────────────────
def _log_telemetry(
    tenant_id:   str,
    action_key:  str,
    status:      str,
    duration_ms: int = None,
    error_msg:   str = None,
) -> None:
    try:
        db.collection("ai_telemetry").add({
            "tenant_id":     tenant_id,
            "action_key":    action_key,
            "status":        status,
            "latency_ms":    duration_ms,
            "error_message": error_msg,
            "timestamp":     firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        log("ERROR", f"Failed to log telemetry: {e}")

# ── Public decorator ──────────────────────────────────────────────────────────
def execute_with_policy(action_key: str, tenant_id: str):
    """
    Decorator that wraps an AI call with:
      1. Daily usage-limit check.
      2. Exponential-backoff retry loop (max_retries attempts).
      3. Detailed telemetry logging for every attempt.
      4. Atomic usage counter increment on success.

    Usage:
        @execute_with_policy("generate_reply", tenant_id)
        def call_gemini():
            return model.generate_content(...)
    """
    def decorator(fetcher: Callable[..., Any]):
        @wraps(fetcher)
        def wrapper(*args, **kwargs):
            today         = datetime.utcnow().strftime("%Y-%m-%d")
            usage_doc_id  = f"{tenant_id}_{today}"

            # 1. Daily limit check
            try:
                usage_ref = db.collection("ai_usage").document(usage_doc_id)
                usage_doc = usage_ref.get()
                current   = usage_doc.to_dict().get("calls", 0) if usage_doc.exists else 0
                if current >= AI_POLICY["daily_call_limit"]:
                    msg = "Daily AI call limit exceeded."
                    log("WARN", msg)
                    _log_telemetry(tenant_id, action_key, "error", error_msg=msg)
                    raise Exception(msg)
            except Exception as e:
                # If the limit check itself fails, log and proceed (fail open).
                log("ERROR", f"Could not check AI usage limit: {e}")

            # 2. Retry loop
            last_exc   = None
            start_time = time.time()

            for attempt in range(AI_POLICY["max_retries"] + 1):
                try:
                    result      = fetcher(*args, **kwargs)
                    duration_ms = int((time.time() - start_time) * 1000)

                    # Atomic increment on success
                    usage_ref = db.collection("ai_usage").document(usage_doc_id)
                    usage_ref.set({
                        "tenant_id":    tenant_id,
                        "date":         today,
                        "calls":        firestore.Increment(1),
                        "last_call_at": firestore.SERVER_TIMESTAMP,
                    }, merge=True)

                    _log_telemetry(tenant_id, action_key, "success", duration_ms=duration_ms)
                    return result

                except Exception as e:
                    last_exc    = e
                    duration_ms = int((time.time() - start_time) * 1000)
                    log("WARN", f"AI action '{action_key}' attempt {attempt + 1} failed: {e}")
                    _log_telemetry(
                        tenant_id, action_key, "error",
                        duration_ms=duration_ms, error_msg=str(e),
                    )
                    if attempt < AI_POLICY["max_retries"]:
                        backoff = (2 ** (attempt + 1)) + (time.time() % 1)  # exponential + jitter
                        log("INFO", f"Retrying in {backoff:.2f}s…")
                        time.sleep(backoff)

            # All retries exhausted
            log("ERROR", f"AI action '{action_key}' failed after {AI_POLICY['max_retries'] + 1} attempt(s).")
            raise last_exc or Exception("AI action failed after all retries.")

        return wrapper
    return decorator
