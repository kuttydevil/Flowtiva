# backend/tools.py
import time
import re
from firebase_admin import firestore
from typing import List

# A simple logging function placeholder; in the main script, this will be `log_to_db`.
log = lambda level, message: print(f"[{level}] {message}")

def audit_tool_call(db, tenant_id, instance_id, tool_name, args, status, result=None, error=None):
    """Helper to insert an audit log for a tool call."""
    try:
        db.collection('ai_tool_calls').add({
            'tenant_id': tenant_id,
            'instance_id': instance_id,
            'tool_name': tool_name,
            'args': args,
            'result': result,
            'status': status,
            'error': error,
            'timestamp': firestore.SERVER_TIMESTAMP
        })
    except Exception as e:
        log("ERROR", f"[AUDIT_FAIL] Failed to log tool call for {tool_name}: {e}")

def update_crm_stage(db, instance_id: str, contact_name: str, stage: str, tenant_id: str = None) -> str:
    """Updates the CRM stage for a specific contact."""
    tool_name = 'update_crm_stage'
    args = {'stage': stage}
    try:
        ALLOWED_STAGES = ['New', 'Contacted', 'Proposal', 'Won', 'Lost']
        if not stage or stage not in ALLOWED_STAGES:
            raise ValueError(f"Invalid stage '{stage}'. Must be one of {ALLOWED_STAGES}.")
        
        # Find contact
        contacts_ref = db.collection('whatsapp_contacts')
        query = contacts_ref.where('instance_id', '==', instance_id).where('contact_name', '==', contact_name).limit(1)
        docs = query.get()
        
        if not docs:
            raise ValueError(f"Contact {contact_name} not found.")
        
        doc_id = docs[0].id
        contacts_ref.document(doc_id).update({'crm_stage': stage})
        
        result = f"Successfully updated CRM stage for {contact_name} to {stage}."
        audit_tool_call(db, tenant_id, instance_id, tool_name, args, 'success', result={'message': result})
        log("INFO", result)
        return result
    except Exception as e:
        error_message = f"Tool '{tool_name}' failed: {e}"
        audit_tool_call(db, tenant_id, instance_id, tool_name, args, 'error', error=str(e))
        log("ERROR", error_message)
        return error_message

def add_tag(db, instance_id: str, contact_name: str, tag: str, tenant_id: str = None) -> str:
    """Adds a new tag to a contact's profile, avoiding duplicates."""
    tool_name = 'add_tag'
    args = {'tag': tag}
    try:
        clean_tag = tag.strip()
        if not clean_tag or len(clean_tag) > 64 or not re.match(r'^[\w\s-]+$', clean_tag):
            raise ValueError('Invalid tag format or length.')

        # Find contact profile
        profiles_ref = db.collection('whatsapp_contact_profiles')
        query = profiles_ref.where('instance_id', '==', instance_id).where('contact_name', '==', contact_name).limit(1)
        docs = query.get()
        
        if not docs:
            # Create profile if not exists
            existing_tags = []
            doc_ref = profiles_ref.add({
                'instance_id': instance_id,
                'contact_name': contact_name,
                'tags': [clean_tag],
                'tenant_id': tenant_id
            })
        else:
            doc = docs[0]
            existing_tags = doc.to_dict().get('tags', [])
            if clean_tag.lower() in [t.lower() for t in existing_tags]:
                result = f"Contact {contact_name} already has the tag: {clean_tag}."
                audit_tool_call(db, tenant_id, instance_id, tool_name, args, 'success', result={'message': result, 'note': 'no_change'})
                log("INFO", result)
                return result
            
            updated_tags = existing_tags + [clean_tag]
            profiles_ref.document(doc.id).update({'tags': updated_tags})
        
        result = f"Successfully added tag '{clean_tag}' to {contact_name}."
        audit_tool_call(db, tenant_id, instance_id, tool_name, args, 'success', result={'message': result})
        log("INFO", result)
        return result
    except Exception as e:
        error_message = f"Tool '{tool_name}' failed: {e}"
        audit_tool_call(db, tenant_id, instance_id, tool_name, args, 'error', error=str(e))
        log("ERROR", error_message)
        return error_message

def set_due_date(db, instance_id: str, contact_name: str, date: str, tenant_id: str = None) -> str:
    """Sets a due date for a contact."""
    tool_name = 'set_due_date'
    args = {'date': date}
    try:
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', date):
            raise ValueError("Invalid date format. Must be YYYY-MM-DD.")
        
        # Find contact
        contacts_ref = db.collection('whatsapp_contacts')
        query = contacts_ref.where('instance_id', '==', instance_id).where('contact_name', '==', contact_name).limit(1)
        docs = query.get()
        
        if not docs:
            raise ValueError(f"Contact {contact_name} not found.")
        
        doc_id = docs[0].id
        contacts_ref.document(doc_id).update({'due_date': date})
        
        result = f"Successfully set due date for {contact_name} to {date}."
        audit_tool_call(db, tenant_id, instance_id, tool_name, args, 'success', result={'message': result})
        log("INFO", result)
        return result
    except Exception as e:
        error_message = f"Tool '{tool_name}' failed: {e}"
        audit_tool_call(db, tenant_id, instance_id, tool_name, args, 'error', error=str(e))
        log("ERROR", error_message)
        return error_message

def update_priority(db, instance_id: str, contact_name: str, priority: str, tenant_id: str = None) -> str:
    """Updates the priority level for a contact."""
    tool_name = 'update_priority'
    args = {'priority': priority}
    try:
        ALLOWED_PRIORITIES = ['High', 'Medium', 'Low']
        if not priority or priority not in ALLOWED_PRIORITIES:
            raise ValueError(f"Invalid priority '{priority}'. Must be one of {ALLOWED_PRIORITIES}.")
        
        # Find contact
        contacts_ref = db.collection('whatsapp_contacts')
        query = contacts_ref.where('instance_id', '==', instance_id).where('contact_name', '==', contact_name).limit(1)
        docs = query.get()
        
        if not docs:
            raise ValueError(f"Contact {contact_name} not found.")
        
        doc_id = docs[0].id
        contacts_ref.document(doc_id).update({'priority': priority})
        
        result = f"Successfully updated priority for {contact_name} to {priority}."
        audit_tool_call(db, tenant_id, instance_id, tool_name, args, 'success', result={'message': result})
        log("INFO", result)
        return result
    except Exception as e:
        error_message = f"Tool '{tool_name}' failed: {e}"
        audit_tool_call(db, tenant_id, instance_id, tool_name, args, 'error', error=str(e))
        log("ERROR", error_message)
        return error_message

def send_whatsapp_message(db, instance_id: str, contact_name: str, message: str, tenant_id: str = None) -> str:
    """Sends a WhatsApp message to a contact by queueing it in the database."""
    tool_name = 'send_whatsapp_message'
    args = {'message': message}
    try:
        if not message or not isinstance(message, str) or len(message.strip()) == 0 or len(message) > 4096:
            raise ValueError("Message is empty or exceeds the maximum length of 4096 characters.")

        # Queue message
        db.collection('whatsapp_messages').add({
            'instanceId': instance_id,
            'contactName': contact_name,
            'messageText': message,
            'sender': 'agent',
            'timestamp': firestore.SERVER_TIMESTAMP,
            'status': 'queued',
            'tenant_id': tenant_id
        })
        
        result = f"Successfully queued message to be sent to {contact_name}."
        audit_tool_call(db, tenant_id, instance_id, tool_name, args, 'success', result={'message': result})
        log("INFO", result)
        return result
    except Exception as e:
        error_message = f"Tool '{tool_name}' failed: {e}"
        audit_tool_call(db, tenant_id, instance_id, tool_name, args, 'error', error=str(e))
        log("ERROR", error_message)
        return error_message

def wait(seconds: int, **kwargs) -> str:
    """Pauses execution for a specified number of seconds. Ignores other kwargs."""
    tool_name = 'wait'
    args = {'seconds': seconds}
    try:
        s = int(seconds)
        if not (0 < s <= 86400 * 5): # Max 5 days
             raise ValueError("Wait duration must be between 1 second and 5 days.")
        log("INFO", f"Workflow action: Waiting for {s} seconds.")
        time.sleep(s)
        result = f"Successfully waited for {s} seconds."
        log("INFO", result)
        return result
    except Exception as e:
        error_message = f"Tool '{tool_name}' failed: {e}"
        log("ERROR", error_message)
        return error_message


# A dictionary to map tool names to their functions for easy lookup.
TOOL_MAP = {
    'update_crm_stage': update_crm_stage,
    'add_tag': add_tag,
    'set_due_date': set_due_date,
    'update_priority': update_priority,
    'send_whatsapp_message': send_whatsapp_message,
    'wait': wait
}

# Allow injection of the real logger from the main script
def set_logger(logger_func):
    global log
    log = logger_func