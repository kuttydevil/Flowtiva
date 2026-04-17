# backend/workflow.py
import time
import json
from typing import List, Dict, Any

import firebase_admin
from firebase_admin import firestore

# Initialize Firestore if not already done
try:
    firebase_admin.initialize_app()
except ValueError:
    pass

db = firestore.client()

# Import tools that workflows can execute
import tools

# A simple logging function placeholder; in the main script, this will be `log_to_db`.
log = lambda level, message, **kwargs: print(f"[{level}] {message}")

def get_active_workflows_for_tenant(tenant_id: str) -> List[Dict[str, Any]]:
    """Fetches all active workflows and their actions for a given tenant."""
    try:
        workflows_ref = db.collection("workflows")
        query = workflows_ref.where("tenant_id", "==", tenant_id).where("is_active", "==", True)
        docs = query.get()
        
        workflows = []
        for doc in docs:
            wf_data = doc.to_dict()
            wf_data['id'] = doc.id
            
            # Fetch sub-collection workflow_actions
            actions_docs = db.collection("workflows").document(doc.id).collection("workflow_actions").get()
            wf_data['workflow_actions'] = [a.to_dict() for a in actions_docs]
            workflows.append(wf_data)
            
        return workflows
    except Exception as e:
        log("ERROR", f"Failed to fetch workflows for tenant {tenant_id}: {e}")
        return []

def execute_workflow_actions(tenant_id: str, instance_id: str, contact_name: str, actions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Executes a sequence of actions for a workflow, logging the outcome of each."""
    action_logs = []
    sorted_actions = sorted(actions, key=lambda x: x.get('step_order', 0))

    for action in sorted_actions:
        action_type = action.get('action_type')
        action_config = action.get('action_config') or {}
        tool_function = tools.TOOL_MAP.get(action_type)
        
        log_entry = {
            "action_type": action_type,
            "status": "failed", # Default to failed
            "details": "Action type not found or not implemented.",
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }

        if not tool_function:
            log("WARN", f"Workflow action '{action_type}' not found in TOOL_MAP.")
            action_logs.append(log_entry)
            continue

        try:
            # Prepare arguments for the tool function
            args = {
                'tenant_id': tenant_id,
                'instance_id': instance_id,
                'contact_name': contact_name,
                **action_config
            }
            # Special handling for 'wait' action which has a different signature
            if action_type == 'wait':
                wait_days = action_config.get('days', 0)
                wait_seconds = wait_days * 86400
                if wait_seconds > 0:
                    result = tools.wait(seconds=wait_seconds)
                else:
                    result = "Wait duration was zero or invalid, skipped."
            else:
                 # Filter args to only what the function accepts
                import inspect
                func_params = inspect.signature(tool_function).parameters
                valid_args = {k: v for k, v in args.items() if k in func_params}
                result = tool_function(**valid_args)

            log_entry['status'] = 'success'
            log_entry['details'] = result
        except Exception as e:
            error_message = f"Action '{action_type}' failed with error: {e}"
            log("ERROR", error_message)
            log_entry['details'] = error_message
        
        action_logs.append(log_entry)
        
        # If an action fails, stop the rest of the workflow
        if log_entry['status'] == 'failed':
            break

    return action_logs


def check_and_run_workflows(tenant_id: str, trigger_type: str, context: Dict[str, Any]):
    """
    Checks all active workflows for a tenant against a given trigger and context,
    then executes any that match.
    """
    if not tenant_id:
        log("WARN", "check_and_run_workflows called without a tenant_id. Skipping.")
        return

    instance_id = context.get('instance_id')
    contact_name = context.get('contact_name')
    if not instance_id or not contact_name:
        log("WARN", "Workflow trigger context is missing instance_id or contact_name. Skipping.")
        return

    all_workflows = get_active_workflows_for_tenant(tenant_id)
    matching_workflows = [wf for wf in all_workflows if wf.get('trigger_type') == trigger_type]

    if not matching_workflows:
        return # No workflows for this trigger type

    log("INFO", f"Found {len(matching_workflows)} active workflow(s) for trigger '{trigger_type}'.")

    for workflow in matching_workflows:
        config = workflow.get('trigger_config') or {}
        is_match = False
        
        # Check conditions based on trigger type
        if trigger_type == 'new_contact_message':
            is_match = True # No extra config for this trigger
        elif trigger_type == 'crm_stage_changed':
            if config.get('stage') and config.get('stage') == context.get('stage'):
                is_match = True
        elif trigger_type == 'tag_added':
             if config.get('tag') and config.get('tag') == context.get('tag'):
                is_match = True
        # ... other trigger condition checks would go here

        if is_match:
            log("INFO", f"Workflow '{workflow['name']}' triggered for contact '{contact_name}'. Executing actions...")
            
            # Log the start of the execution to history
            try:
                history_ref = db.collection("workflow_history").add({
                    "workflow_id": workflow['id'],
                    "tenant_id": tenant_id,
                    "trigger_event": {"type": trigger_type, "context": context},
                    "status": "running",
                    "actions_log": [],
                    "timestamp": firestore.SERVER_TIMESTAMP
                })
                history_id = history_ref[1].id

                # Execute actions
                action_logs = execute_workflow_actions(tenant_id, instance_id, contact_name, workflow.get('workflow_actions', []))
                
                # Update history with final status and logs
                final_status = 'completed' if all(log['status'] == 'success' for log in action_logs) else 'failed'
                error_message = next((log['details'] for log in action_logs if log['status'] == 'failed'), None)

                db.collection("workflow_history").document(history_id).update({
                    "status": final_status,
                    "actions_log": action_logs,
                    "error_message": error_message,
                    "completed_at": firestore.SERVER_TIMESTAMP
                })
                log("INFO", f"Workflow '{workflow['name']}' finished with status: {final_status}.")

            except Exception as e:
                log("ERROR", f"Critical error during workflow execution or history logging for '{workflow['name']}': {e}")


def set_logger(logger_func):
    """Injects the main logger from aiwa_multi.py into this module and the tools module."""
    global log
    log = logger_func
    tools.set_logger(logger_func)