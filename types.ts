


/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export type ActiveView = 'overview' | 'pipeline' | 'contacts' | 'instagram' | 'outreach' | 'workflows' | 'billing' | 'ai_metrics';

export type WorkflowTriggerType = 
    'new_contact_message' | 
    'contact_replied' |
    'crm_stage_changed' | 
    'tag_added' |
    'message_contains_keyword' |
    'priority_changed';

export type WorkflowActionType = 'send_whatsapp_message' | 'add_tag' | 'change_crm_stage' | 'wait';

export interface WorkflowTrigger {
    type: WorkflowTriggerType;
    config: {
        stage?: string; // for crm_stage_changed
        tag?: string;   // for tag_added
        keyword?: string; // for message_contains_keyword
        priority?: Priority; // for priority_changed
    };
}

export interface WorkflowAction {
    id: string; // Used for client-side keying
    type: WorkflowActionType;
    config: {
        message?: string; // for send_whatsapp_message
        tag?: string;     // for add_tag
        stage?: string;   // for change_crm_stage
        days?: number;    // for wait
    };
}

export interface Workflow {
    id: string;
    tenant_id: string;
    name: string;
    trigger: WorkflowTrigger;
    actions: WorkflowAction[];
    is_active: boolean;
    created_at: string;
}

export interface WorkflowHistoryActionLog {
    action_type: WorkflowActionType;
    status: 'success' | 'failed';
    details: string;
    timestamp: string;
}

export interface WorkflowHistory {
    id: string;
    workflow_id: string;
    workflow_name: string;
    triggered_at: string;
    trigger_event: {
        type: WorkflowTriggerType;
        [key: string]: any;
    };
    status: 'running' | 'completed' | 'failed';
    actions_log: WorkflowHistoryActionLog[];
    error_message?: string;
}


export enum WhatsAppInstanceStatus {
    Pending = 'pending',
    Linking = 'linking',
    Running = 'running',
    Inactive = 'inactive',
    Failed = 'failed',
    Stopped = 'stopped',
}

export interface Tenant {
  id: string;
  name: string;
}

export interface WhatsAppInstance {
    id:string;
    tenantId: string;
    name: string;
    phoneNumber: string;
    customPrompt: string;
    context?: string;
    status: WhatsAppInstanceStatus;
    isActive: boolean;
    agentType: 'business' | 'personal';
    enabled_tools: string[];
    last_error?: string;
    createdAt: string;
    // New fields for professional backend alignment
    worker_hostname: string | null;
    worker_pid: number | null;
    last_heartbeat: string | null;
}

export interface WhatsAppLinkingCode {
    id?: string;
    instanceId: string;
    code?: string;
    createdAt: string;
}

export interface WhatsAppMessage {
    id: string;
    instanceId: string;
    contactName: string;
    sender: 'user' | 'ai' | 'agent';
    messageText?: string;
    imageUrl?: string;
    isRead: boolean;
    timestamp: string;
    status?: 'received' | 'sending' | 'sent' | 'failed' | 'read' | 'seen';
}

export type Priority = 'High' | 'Medium' | 'Low';

export interface WhatsAppContact {
    instance_id: string; // Added to reliably link contact to its instance
    contact_name: string;
    phone_number: string | null;
    last_message_text: string | null;
    last_message_at: string | null;
    unread_count: number;
    tags: string[];
    crm_stage: string;
    priority: Priority;
    due_date: string | null;
}

// --- NEW INSTAGRAM TYPES ---
export interface InstagramInstance {
    id: string;
    tenantId: string;
    username: string;
    password?: string; // Should not be sent to frontend after creation
    customPrompt: string;
    context?: string;
    status: WhatsAppInstanceStatus; // Re-using status enum
    isActive: boolean;
    last_error?: string;
    createdAt: string;
    worker_hostname: string | null;
    worker_pid: number | null;
    last_heartbeat: string | null;
}

export interface InstagramMessage {
    id: string;
    instanceId: string;
    contactUsername: string;
    sender: 'user' | 'ai' | 'agent';
    messageText?: string;
    imageUrl?: string;
    isRead: boolean;
    timestamp: string;
    status?: 'received' | 'sending' | 'sent' | 'failed' | 'read';
}

export interface InstagramContact {
    instance_id: string;
    contact_username: string;
    last_message_text: string | null;
    last_message_at: string | null;
    unread_count: number;
    tags: string[];
}

export interface InstagramReposterJob {
    id: string;
    instance_id: string;
    instance_username?: string; // joined
    target_username: string;
    max_reels: number;
    repost_interval_minutes: number;
    status: 'active' | 'paused' | 'completed' | 'failed';
    last_run_at: string | null;
    reposted_count?: number; // joined
    created_at: string;
}


export interface InstanceLog {
    id: number;
    instanceId: string;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'DEBUG';
    message: string;
}

export interface DashboardStats {
    total_contacts: number;
    messages_last_24h: number;
    active_instances: number;
    failed_instances: number;
}

export interface ActivityLog {
    instance_id: string;
    phone_number: string;
    contact_name: string;
    message_text: string;
    timestamp: string;
}


// --- Outreach Types ---
export interface OutreachCampaign {
  id: string;
  instance_id: string;
  name: string;
  message_template: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  created_at: string;
  contacts_total: number;
  contacts_sent: number;
  contacts_failed: number;
  contacts_replied: number;
}

export interface OutreachContact {
    id: string;
    campaign_id: string;
    phone_number: string;
    contact_name?: string | null;
    variables?: Record<string, any>;
    status: 'pending' | 'generating_message' | 'sending' | 'sent' | 'failed' | 'replied';
    generated_message?: string | null;
    sent_at?: string | null;
    error_message?: string | null;
}


// --- Superadmin Types ---
export interface SystemStats {
    total_users: number;
    total_instances: number;
    active_instances: number;
    messages_last_24h: number;
}

export interface PlatformUser {
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    plan_name: string | null;
    subscription_status: string | null;
    billing_cycle: 'monthly' | 'yearly' | null;
    instance_count: number;
}

export interface AllInstances {
    id: string;
    phone_number: string;
    status: string;
    is_active: boolean;
    created_at: string;
    last_error: string | null;
    owner_email: string | null;
    worker_hostname: string | null;
    worker_pid: number | null;
    last_heartbeat: string | null;
}

export interface SystemLog {
    id: number;
    timestamp: string;
    level: 'ERROR' | 'FATAL';
    message: string;
    instance_id: string;
    phone_number: string;
}

// NEW SUPERADMIN DASHBOARD TYPES
export interface TimeSeriesDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface SuperadminDashboardData {
  stats: SystemStats;
  user_growth: TimeSeriesDataPoint[];
  instance_growth: TimeSeriesDataPoint[];
  message_volume: TimeSeriesDataPoint[];
  revenue_overview: {
    mrr: number;
    new_subs_30d: number;
    churn_rate_30d: number;
  };
  plan_distribution: { name: string; count: number }[];
  geo_distribution: { country_code: string; count: number }[];
  recent_alerts: AIAlert[];
}


// --- Billing Types ---
export interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  description: string;
  features: string[];
  message_limit: number;
  account_limit: number;
  is_popular: boolean;
  subheader?: string;
}

export interface CurrentPlan {
    planId: string;
    name: string;
    price: number;
    billingCycle: 'monthly' | 'yearly';
    renewalDate: string;
    status: 'active' | 'trialing' | 'canceled' | 'past_due';
}

export interface UsageStats {
    messages: { used: number; limit: number; };
    accounts: { used: number; limit: number; };
    contacts: number;
    resetsOn: string;
}

export interface PaymentMethod {
    cardType: string;
    last4: string;
    expiry: string;
}

export interface Invoice {
    id: string;
    date: string;
    amount: number;
    status: 'Paid' | 'Due' | 'Failed';
}

export interface BillingDashboardData {
    currentPlan: CurrentPlan | null;
    usageStats: UsageStats | null;
    paymentMethod: PaymentMethod | null;
    invoices: Invoice[];
}

export interface InvoiceLineItem {
    description: string;
    amount: number;
    quantity: number;
}

export interface InvoiceDetails {
    id: string;
    date: string;
    status: 'Paid' | 'Due' | 'Failed';
    billTo: {
        name: string;
        email: string;
        address: string;
    };
    lineItems: InvoiceLineItem[];
    subtotal: number;
    tax: number;
    total: number;
}

// --- AI Telemetry & Governance Types ---
export interface AITelemetryLog {
  action_key: string;
  status: 'success' | 'error' | 'cached';
  duration_ms?: number;
  error_message?: string | null;
  timestamp: number;
  payload?: any;
  tenant_id?: string | null;
}

export interface AITelemetryStats {
    total_calls: number;
    cache_hit_rate: number; // as a percentage, e.g., 25.5 for 25.5%
    error_rate: number; // as a percentage
    avg_latency: number; // in milliseconds
    calls_by_action: { action_key: string; count: number }[];
}

export interface AIReport {
  id: number;
  created_at: string;
  content: string;
  period: 'weekly' | 'monthly';
}

export interface AIAlert {
  id: number;
  created_at: string;
  alert_type: 'LATENCY_SPIKE' | 'HIGH_ERROR_RATE';
  message: string;
  metadata?: Record<string, any>;
}

// FIX: Moved AgentDetails here to be globally available.
export interface AgentDetails {
    businessName?: string;
    businessType?: string;
    services?: string;
    agentName?: string;
    agentPersonality?: string;
    knowledgeBase?: string;
    specificInstructions: string;
}