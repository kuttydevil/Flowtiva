# backend/workflow.py
# Workflow engine: fetches active workflows from Firestore, checks trigger
# conditions, executes action sequences, and logs history.

import time
import inspect
import os
from typing import List, Dict, Any, Callable

import firebase_admin
from firebase_admin import firestore
from dotenv import load_dotenv

import tools

load_dotenv()

try:
    firebase_admin.initialize_app()
except ValueError:
    pass

db_id = os.getenv("FIRESTORE_DATABASE_ID")
db    = firestore.client(database_id=db_id) if db_id else firestore.client()

# ── Pluggable logger ──────────────────────────────────────────────────────────
log: Callable = lambda level, message, **_: print(f"[{level}] {message}")

def set_logger(logger_func: Callable) -> None:
    """Inject the logger from aiwa_multi.py and forward it to tools.py."""
    global log
    log = logger_func
    tools.set_logger(logger_func)

# ── Firestore helpers ─────────────────────────────────────────────────────────
def get_active_workflows_for_tenant(tenant_id: str) -> List[Dict[str, Any]]:
    """Return all active workflows (with their actions) for the given tenant."""
    try:
        docs = (
            db.collection("workflows")
            .where("tenant_id", "==", tenant_id)
            .where("is_active",  "==", True)
            .get()
        )
        workflows = []
        for doc in docs:
            wf          = doc.to_dict()
            wf["id"]    = doc.id
            action_docs = (
                db.collection("workflows")
                  .document(doc.id)
                  .collection("workflow_actions")
                  .get()
            )
            wf["workflow_actions"] = [a.to_dict() for a in action_docs]
            workflows.append(wf)
        return workflows
    except Exception as e:
        log("ERROR", f"Failed to fetch workflows for tenant {tenant_id}: {e}")
        return []

# ── Action executor ───────────────────────────────────────────────────────────
def execute_workflow_actions(
    tenant_id:    str,
    instance_id:  str,
    contact_name: str,
    actions:      List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Execute a sorted list of workflow actions and return a log of results.
    Stops on the first failure.
    """
    action_logs: List[Dict] = []
    sorted_actions = sorted(actions, key=lambda x: x.get("step_order", 0))

    for action in sorted_actions:
        action_type   = action.get("action_type")
        action_config = action.get("action_config") or {}
        tool_fn       = tools.TOOL_MAP.get(action_type)

        entry: Dict[str, Any] = {
            "action_type": action_type,
            "status":      "failed",
            "details":     f"Action type '{action_type}' not found in TOOL_MAP.",
            "timestamp":   time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        if not tool_fn:
            log("WARN", f"Action '{action_type}' not in TOOL_MAP — skipping.")
            action_logs.append(entry)
            break  # Stop the workflow on unrecognised action

        try:
            if action_type == "wait":
                days    = action_config.get("days", 0)
                seconds = int(days) * 86400
                result  = tools.wait(seconds=seconds) if seconds > 0 else "Wait duration was zero — skipped."
            else:
                # Build args from context + action_config; only pass what the function accepts
                base_args = {
                    "db":           db,
                    "tenant_id":    tenant_id,
                    "instance_id":  instance_id,
                    "contact_name": contact_name,
                    **action_config,
                }
                accepted = inspect.signature(tool_fn).parameters
                valid    = {k: v for k, v in base_args.items() if k in accepted}
                result   = tool_fn(**valid)

            entry["status"]  = "success"
            entry["details"] = result

        except Exception as e:
            entry["details"] = f"Action '{action_type}' raised: {e}"
            log("ERROR", entry["details"])

        action_logs.append(entry)

        if entry["status"] == "failed":
            break  # Stop on failure

    return action_logs

# ── Public API ────────────────────────────────────────────────────────────────
def check_and_run_workflows(
    tenant_id:    str,
    trigger_type: str,
    context:      Dict[str, Any],
) -> None:
    """
    Check all active workflows for a tenant, match against the trigger, and
    execute any that match. Writes a full history record to Firestore.

    Args:
        tenant_id:    The tenant whose workflows to check.
        trigger_type: e.g. "new_contact_message", "crm_stage_changed", "tag_added".
        context:      Must include "instance_id" and "contact_name".
                      May include "stage" or "tag" for conditional triggers.
    """
    if not tenant_id:
        log("WARN", "check_and_run_workflows called without tenant_id — skipping.")
        return

    instance_id  = context.get("instance_id")
    contact_name = context.get("contact_name")
    if not instance_id or not contact_name:
        log("WARN", "Workflow trigger context missing instance_id or contact_name — skipping.")
        return

    all_wf      = get_active_workflows_for_tenant(tenant_id)
    matching_wf = [wf for wf in all_wf if wf.get("trigger_type") == trigger_type]

    if not matching_wf:
        return

    log("INFO", f"Found {len(matching_wf)} workflow(s) for trigger '{trigger_type}'.")

    for workflow in matching_wf:
        cfg      = workflow.get("trigger_config") or {}
        is_match = False

        if trigger_type == "new_contact_message":
            is_match = True

        elif trigger_type == "crm_stage_changed":
            is_match = bool(cfg.get("stage") and cfg["stage"] == context.get("stage"))

        elif trigger_type == "tag_added":
            is_match = bool(cfg.get("tag") and cfg["tag"] == context.get("tag"))

        # Add further trigger types here as the product grows.

        if not is_match:
            continue

        wf_name = workflow.get("name", workflow["id"])
        log("INFO", f"Workflow '{wf_name}' triggered for '{contact_name}'. Running actions…")

        try:
            history_ref = db.collection("workflow_history").add({
                "workflow_id":   workflow["id"],
                "tenant_id":     tenant_id,
                "trigger_event": {"type": trigger_type, "context": context},
                "status":        "running",
                "actions_log":   [],
                "timestamp":     firestore.SERVER_TIMESTAMP,
            })
            history_id = history_ref[1].id

            action_logs  = execute_workflow_actions(
                tenant_id, instance_id, contact_name,
                workflow.get("workflow_actions", []),
            )
            final_status = (
                "completed" if all(a["status"] == "success" for a in action_logs) else "failed"
            )
            error_msg = next(
                (a["details"] for a in action_logs if a["status"] == "failed"), None
            )

            db.collection("workflow_history").document(history_id).update({
                "status":       final_status,
                "actions_log":  action_logs,
                "error_message": error_msg,
                "completed_at": firestore.SERVER_TIMESTAMP,
            })
            log("INFO", f"Workflow '{wf_name}' finished: {final_status}.")

        except Exception as e:
            log("ERROR", f"Critical error during workflow '{wf_name}': {e}")
