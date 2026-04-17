# backend/tools.py
# Callable tools available to the AI agent and workflow engine.
# Each tool validates its inputs, executes against Firestore, and writes an
# audit log — whether it succeeds or fails.

import time
import re
from typing import Callable
from firebase_admin import firestore

# ── Pluggable logger ──────────────────────────────────────────────────────────
log: Callable = lambda level, message: print(f"[{level}] {message}")

def set_logger(logger_func: Callable) -> None:
    global log
    log = logger_func

# ── Audit helper ──────────────────────────────────────────────────────────────
def _audit(
    db,
    tenant_id:   str,
    instance_id: str,
    tool_name:   str,
    args:        dict,
    status:      str,
    result=None,
    error=None,
) -> None:
    try:
        db.collection("ai_tool_calls").add({
            "tenant_id":   tenant_id,
            "instance_id": instance_id,
            "tool_name":   tool_name,
            "args":        args,
            "result":      result,
            "status":      status,
            "error":       error,
            "timestamp":   firestore.SERVER_TIMESTAMP,
        })
    except Exception as e:
        log("ERROR", f"[AUDIT_FAIL] {tool_name}: {e}")

# ── Tool implementations ──────────────────────────────────────────────────────
def update_crm_stage(
    db, instance_id: str, contact_name: str, stage: str,
    tenant_id: str = None,
) -> str:
    tool  = "update_crm_stage"
    args  = {"stage": stage}
    VALID = ["New", "Contacted", "Proposal", "Won", "Lost"]
    try:
        if stage not in VALID:
            raise ValueError(f"Invalid stage '{stage}'. Must be one of {VALID}.")
        docs = (
            db.collection("whatsapp_contacts")
            .where("instance_id", "==", instance_id)
            .where("contact_name", "==", contact_name)
            .limit(1)
            .get()
        )
        if not docs:
            raise ValueError(f"Contact '{contact_name}' not found.")
        db.collection("whatsapp_contacts").document(docs[0].id).update({"crm_stage": stage})
        msg = f"Updated CRM stage for {contact_name} → {stage}."
        _audit(db, tenant_id, instance_id, tool, args, "success", result={"message": msg})
        log("INFO", msg)
        return msg
    except Exception as e:
        err = str(e)
        _audit(db, tenant_id, instance_id, tool, args, "error", error=err)
        log("ERROR", f"Tool '{tool}' failed: {err}")
        return f"Tool '{tool}' failed: {err}"


def add_tag(
    db, instance_id: str, contact_name: str, tag: str,
    tenant_id: str = None,
) -> str:
    tool      = "add_tag"
    args      = {"tag": tag}
    clean_tag = tag.strip() if tag else ""
    try:
        if not clean_tag or len(clean_tag) > 64 or not re.match(r"^[\w\s-]+$", clean_tag):
            raise ValueError("Invalid tag: empty, too long, or contains special characters.")
        ref  = db.collection("whatsapp_contact_profiles")
        docs = (
            ref.where("instance_id", "==", instance_id)
               .where("contact_name", "==", contact_name)
               .limit(1)
               .get()
        )
        if not docs:
            ref.add({
                "instance_id":  instance_id,
                "contact_name": contact_name,
                "tags":         [clean_tag],
                "tenant_id":    tenant_id,
            })
        else:
            existing = docs[0].to_dict().get("tags", [])
            if clean_tag.lower() in [t.lower() for t in existing]:
                msg = f"Tag '{clean_tag}' already on {contact_name}."
                _audit(db, tenant_id, instance_id, tool, args, "success",
                       result={"message": msg, "note": "no_change"})
                log("INFO", msg)
                return msg
            ref.document(docs[0].id).update({"tags": existing + [clean_tag]})
        msg = f"Added tag '{clean_tag}' to {contact_name}."
        _audit(db, tenant_id, instance_id, tool, args, "success", result={"message": msg})
        log("INFO", msg)
        return msg
    except Exception as e:
        err = str(e)
        _audit(db, tenant_id, instance_id, tool, args, "error", error=err)
        log("ERROR", f"Tool '{tool}' failed: {err}")
        return f"Tool '{tool}' failed: {err}"


def set_due_date(
    db, instance_id: str, contact_name: str, date: str,
    tenant_id: str = None,
) -> str:
    tool = "set_due_date"
    args = {"date": date}
    try:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            raise ValueError("Invalid date format — must be YYYY-MM-DD.")
        docs = (
            db.collection("whatsapp_contacts")
            .where("instance_id", "==", instance_id)
            .where("contact_name", "==", contact_name)
            .limit(1)
            .get()
        )
        if not docs:
            raise ValueError(f"Contact '{contact_name}' not found.")
        db.collection("whatsapp_contacts").document(docs[0].id).update({"due_date": date})
        msg = f"Due date for {contact_name} set to {date}."
        _audit(db, tenant_id, instance_id, tool, args, "success", result={"message": msg})
        log("INFO", msg)
        return msg
    except Exception as e:
        err = str(e)
        _audit(db, tenant_id, instance_id, tool, args, "error", error=err)
        log("ERROR", f"Tool '{tool}' failed: {err}")
        return f"Tool '{tool}' failed: {err}"


def update_priority(
    db, instance_id: str, contact_name: str, priority: str,
    tenant_id: str = None,
) -> str:
    tool  = "update_priority"
    args  = {"priority": priority}
    VALID = ["High", "Medium", "Low"]
    try:
        if priority not in VALID:
            raise ValueError(f"Invalid priority '{priority}'. Must be one of {VALID}.")
        docs = (
            db.collection("whatsapp_contacts")
            .where("instance_id", "==", instance_id)
            .where("contact_name", "==", contact_name)
            .limit(1)
            .get()
        )
        if not docs:
            raise ValueError(f"Contact '{contact_name}' not found.")
        db.collection("whatsapp_contacts").document(docs[0].id).update({"priority": priority})
        msg = f"Priority for {contact_name} → {priority}."
        _audit(db, tenant_id, instance_id, tool, args, "success", result={"message": msg})
        log("INFO", msg)
        return msg
    except Exception as e:
        err = str(e)
        _audit(db, tenant_id, instance_id, tool, args, "error", error=err)
        log("ERROR", f"Tool '{tool}' failed: {err}")
        return f"Tool '{tool}' failed: {err}"


def send_whatsapp_message(
    db, instance_id: str, contact_name: str, message: str,
    tenant_id: str = None,
) -> str:
    tool = "send_whatsapp_message"
    args = {"message": message}
    try:
        if not message or not isinstance(message, str) or not message.strip():
            raise ValueError("Message is empty.")
        if len(message) > 4096:
            raise ValueError("Message exceeds 4096 character limit.")
        db.collection("whatsapp_messages").add({
            "instanceId":   instance_id,
            "contactName":  contact_name,
            "messageText":  message,
            "sender":       "agent",
            "timestamp":    firestore.SERVER_TIMESTAMP,
            "status":       "queued",
            "tenant_id":    tenant_id,
        })
        msg = f"Message queued for {contact_name}."
        _audit(db, tenant_id, instance_id, tool, args, "success", result={"message": msg})
        log("INFO", msg)
        return msg
    except Exception as e:
        err = str(e)
        _audit(db, tenant_id, instance_id, tool, args, "error", error=err)
        log("ERROR", f"Tool '{tool}' failed: {err}")
        return f"Tool '{tool}' failed: {err}"


def wait(seconds: int, **_) -> str:
    """Pause execution. Accepts extra kwargs so it can be called uniformly."""
    tool = "wait"
    try:
        s = int(seconds)
        if not (0 < s <= 86400 * 5):
            raise ValueError("Duration must be between 1 second and 5 days.")
        log("INFO", f"Waiting {s}s…")
        time.sleep(s)
        return f"Waited {s} second(s)."
    except Exception as e:
        log("ERROR", f"Tool '{tool}' failed: {e}")
        return f"Tool '{tool}' failed: {e}"


# ── Tool registry ─────────────────────────────────────────────────────────────
TOOL_MAP = {
    "update_crm_stage":      update_crm_stage,
    "add_tag":               add_tag,
    "set_due_date":          set_due_date,
    "update_priority":       update_priority,
    "send_whatsapp_message": send_whatsapp_message,
    "wait":                  wait,
}
