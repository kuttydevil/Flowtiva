import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  addDoc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword
} from 'firebase/auth';
import { db, auth } from '../firebase';
import { 
  WhatsAppInstance, 
  WhatsAppInstanceStatus, 
  WhatsAppMessage, 
  WhatsAppContact, 
  WhatsAppLinkingCode, 
  DashboardStats, 
  ActivityLog, 
  Workflow, 
  WorkflowHistory, 
  Plan, 
  InvoiceDetails, 
  BillingDashboardData,
  OutreachCampaign,
  InstanceLog,
  AITelemetryStats, 
  AIReport, 
  AIAlert, 
  InstagramInstance, 
  InstagramContact, 
  InstagramMessage, 
  InstagramReposterJob,
  Priority
} from '../types';

// --- ERROR HANDLING ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- DATA TRANSFORMATION HELPERS ---
const toWhatsAppInstance = (doc: any): WhatsAppInstance => ({
  id: doc.id,
  ...doc.data()
} as WhatsAppInstance);

const toWhatsAppMessage = (doc: any): WhatsAppMessage => ({
  id: doc.id,
  ...doc.data()
} as WhatsAppMessage);

const toWhatsAppContact = (doc: any): WhatsAppContact => ({
  ...doc.data()
} as WhatsAppContact);

const toInstagramInstance = (doc: any): InstagramInstance => ({
  id: doc.id,
  ...doc.data()
} as InstagramInstance);

const toInstagramContact = (doc: any): InstagramContact => ({
  ...doc.data()
} as InstagramContact);

const toInstagramMessage = (doc: any): InstagramMessage => ({
  id: doc.id,
  ...doc.data()
} as InstagramMessage);

const toInstagramReposterJob = (doc: any): InstagramReposterJob => ({
  id: doc.id,
  ...doc.data()
} as InstagramReposterJob);

// --- MAIN SERVICE OBJECT ---
export const firebaseService = {
  auth,
  db,

  // --- AUTH FUNCTIONS ---
  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      return await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Auth Error:", error);
      throw error;
    }
  },

  async signOut() {
    return await signOut(auth);
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  async signUp({ email, password }: any) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return { data: { user: result.user }, error: null };
    } catch (error: any) {
      return { data: { user: null }, error };
    }
  },

  async signInWithPassword({ email, password }: any) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { data: { user: result.user }, error: null };
    } catch (error: any) {
      return { data: { user: null }, error };
    }
  },

  async resetPasswordForEmail(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { data: {}, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  async updateUser({ password }: any) {
    try {
      if (!auth.currentUser) throw new Error("No user logged in");
      await updatePassword(auth.currentUser, password);
      return { data: { user: auth.currentUser }, error: null };
    } catch (error: any) {
      return { data: { user: null }, error };
    }
  },

  // --- DASHBOARD FUNCTIONS ---
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const q = query(collection(db, 'whatsapp_instances'));
      const snapshot = await getDocs(q);
      const instances = snapshot.docs.map(toWhatsAppInstance);
      
      return {
        total_contacts: 0, // Simplified
        messages_last_24h: 0,
        active_instances: instances.filter(i => i.isActive).length,
        failed_instances: instances.filter(i => i.status === WhatsAppInstanceStatus.Failed).length
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'whatsapp_instances');
      return { total_contacts: 0, messages_last_24h: 0, active_instances: 0, failed_instances: 0 };
    }
  },

  async getWhatsAppInstances(): Promise<WhatsAppInstance[]> {
    try {
      const q = query(collection(db, 'whatsapp_instances'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(toWhatsAppInstance);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'whatsapp_instances');
      return [];
    }
  },

  async addWhatsAppInstance(phoneNumber: string, customPrompt: string, agentType: 'business' | 'personal'): Promise<WhatsAppInstance> {
    try {
      const docRef = await addDoc(collection(db, 'whatsapp_instances'), {
        tenantId: auth.currentUser?.uid,
        phoneNumber,
        customPrompt,
        agentType,
        status: WhatsAppInstanceStatus.Pending,
        isActive: true,
        enabled_tools: [],
        createdAt: new Date().toISOString()
      });
      const docSnap = await getDoc(docRef);
      return toWhatsAppInstance(docSnap);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'whatsapp_instances');
      throw error;
    }
  },

  async toggleWhatsAppInstance(instance: WhatsAppInstance): Promise<void> {
    try {
      const docRef = doc(db, 'whatsapp_instances', instance.id);
      await updateDoc(docRef, { isActive: !instance.isActive });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `whatsapp_instances/${instance.id}`);
    }
  },

  async updateWhatsAppInstance(instanceId: string, updates: any): Promise<WhatsAppInstance> {
    try {
      const docRef = doc(db, 'whatsapp_instances', instanceId);
      await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
      const docSnap = await getDoc(docRef);
      return toWhatsAppInstance(docSnap);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `whatsapp_instances/${instanceId}`);
      throw error;
    }
  },

  async deleteWhatsAppInstance(instanceId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'whatsapp_instances', instanceId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `whatsapp_instances/${instanceId}`);
    }
  },

  async getWhatsAppContacts(instanceId: string): Promise<WhatsAppContact[]> {
    try {
      const q = query(collection(db, 'whatsapp_contacts'), where('instance_id', '==', instanceId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(toWhatsAppContact);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'whatsapp_contacts');
      return [];
    }
  },

  async getWhatsAppMessages(instanceId: string, contactName: string, page: number): Promise<WhatsAppMessage[]> {
    try {
      const q = query(
        collection(db, 'whatsapp_messages'), 
        where('instanceId', '==', instanceId),
        where('contactName', '==', contactName),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(toWhatsAppMessage).reverse();
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'whatsapp_messages');
      return [];
    }
  },

  async markMessagesAsRead(instanceId: string, contactName: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'whatsapp_messages'),
        where('instanceId', '==', instanceId),
        where('contactName', '==', contactName),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = snapshot.docs.map(d => updateDoc(d.ref, { isRead: true }));
      await Promise.all(batch);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'whatsapp_messages');
    }
  },

  async sendWhatsAppMessage(params: { instanceId: string, contactName: string, messageText: string, imageBase64: string | null }): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'whatsapp_messages'), {
        instanceId: params.instanceId,
        contactName: params.contactName,
        messageText: params.messageText,
        imageUrl: params.imageBase64,
        sender: 'agent',
        isRead: true,
        status: 'sending',
        timestamp: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'whatsapp_messages');
      throw error;
    }
  },

  async updateContactTags(instanceId: string, contactName: string, tags: string[]): Promise<void> {
    try {
      const q = query(
        collection(db, 'whatsapp_contacts'),
        where('instance_id', '==', instanceId),
        where('contact_name', '==', contactName)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, { tags });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'whatsapp_contacts');
    }
  },

  async updateContactCrmStage(instanceId: string, contactName: string, stage: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'whatsapp_contacts'),
        where('instance_id', '==', instanceId),
        where('contact_name', '==', contactName)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, { crm_stage: stage });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'whatsapp_contacts');
    }
  },

  async updateContactPriority(instanceId: string, contactName: string, priority: Priority): Promise<void> {
    try {
      const q = query(
        collection(db, 'whatsapp_contacts'),
        where('instance_id', '==', instanceId),
        where('contact_name', '==', contactName)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, { priority });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'whatsapp_contacts');
    }
  },

  async updateContactDueDate(instanceId: string, contactName: string, dueDate: string | null): Promise<void> {
    try {
      const q = query(
        collection(db, 'whatsapp_contacts'),
        where('instance_id', '==', instanceId),
        where('contact_name', '==', contactName)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, { due_date: dueDate });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'whatsapp_contacts');
    }
  },

  async getWhatsAppDueDateStatus(dueDateStr: string | null) {
    // This is a UI helper, but sometimes used in services
    return dueDateStr;
  },

  // --- INSTAGRAM FUNCTIONS ---
  async getInstagramInstances(): Promise<InstagramInstance[]> {
    try {
      const q = query(collection(db, 'instagram_instances'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(toInstagramInstance);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'instagram_instances');
      return [];
    }
  },

  async deleteInstagramInstance(instanceId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'instagram_instances', instanceId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `instagram_instances/${instanceId}`);
    }
  },

  async getInstagramContacts(instanceId: string): Promise<InstagramContact[]> {
    try {
      const q = query(collection(db, 'instagram_contacts'), where('instance_id', '==', instanceId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(toInstagramContact);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'instagram_contacts');
      return [];
    }
  },

  async getInstagramMessages(instanceId: string, contactUsername: string, page: number): Promise<InstagramMessage[]> {
    try {
      const q = query(
        collection(db, 'instagram_messages'),
        where('instanceId', '==', instanceId),
        where('contactUsername', '==', contactUsername),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(toInstagramMessage).reverse();
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'instagram_messages');
      return [];
    }
  },

  async updateInstagramReposterJobStatus(jobId: string, status: 'active' | 'paused'): Promise<void> {
    try {
      const docRef = doc(db, 'instagram_reposter_jobs', jobId);
      await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `instagram_reposter_jobs/${jobId}`);
    }
  },

  async deleteInstagramReposterJob(jobId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'instagram_reposter_jobs', jobId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `instagram_reposter_jobs/${jobId}`);
    }
  },

  // --- AI METRICS & ACTIVITY ---
  async getAITelemetryStats(): Promise<AITelemetryStats> {
    try {
      const docRef = doc(db, 'ai_telemetry', 'global_stats');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as AITelemetryStats;
      }
      return { total_calls: 0, avg_latency: 0, error_rate: 0, cache_hit_rate: 0, calls_by_action: [] };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'ai_telemetry/global_stats');
      return { total_calls: 0, avg_latency: 0, error_rate: 0, cache_hit_rate: 0, calls_by_action: [] };
    }
  },

  async getAIReports(): Promise<AIReport[]> {
    try {
      const q = query(collection(db, 'ai_reports'), orderBy('created_at', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as unknown as AIReport));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'ai_reports');
      return [];
    }
  },

  async getAIAlerts(): Promise<AIAlert[]> {
    try {
      const q = query(collection(db, 'ai_alerts'), orderBy('created_at', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as unknown as AIAlert));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'ai_alerts');
      return [];
    }
  },

  async getRecentActivity(): Promise<ActivityLog[]> {
    try {
      const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data() } as ActivityLog));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'activity_logs');
      return [];
    }
  },

  // --- SUPERADMIN FUNCTIONS ---
  async getSuperadminDashboardData(): Promise<any> {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const instancesSnap = await getDocs(collection(db, 'whatsapp_instances'));
      const messagesSnap = await getDocs(collection(db, 'whatsapp_messages'));
      
      return {
        total_users: usersSnap.size,
        total_instances: instancesSnap.size,
        total_messages: messagesSnap.size,
        system_health: 100,
        revenue_stats: { daily: [], total: 0 }
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'superadmin_dashboard');
      return null;
    }
  },

  async getAllUsers(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  },

  async getAllInstances(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'whatsapp_instances'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'whatsapp_instances');
      return [];
    }
  },

  async getSystemLogs(limitCount: number): Promise<any[]> {
    try {
      const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'system_logs');
      return [];
    }
  },

  // --- REALTIME HELPERS ---
  subscribeToInstances(callback: (instances: WhatsAppInstance[]) => void) {
    const q = query(collection(db, 'whatsapp_instances'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(toWhatsAppInstance));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'whatsapp_instances'));
  },

  subscribeToMessages(instanceId: string, callback: (message: WhatsAppMessage) => void) {
    const q = query(
      collection(db, 'whatsapp_messages'),
      where('instanceId', '==', instanceId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback(toWhatsAppMessage(snapshot.docs[0]));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'whatsapp_messages'));
  },

  subscribeToInstanceLogs(instanceId: string, callback: (log: any) => void) {
    const q = query(
      collection(db, 'system_logs'),
      where('instanceId', '==', instanceId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback(snapshot.docs[0].data());
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'system_logs'));
  },

  // --- BILLING FUNCTIONS ---
  async getBillingDashboardData(): Promise<BillingDashboardData> {
    return {
      currentPlan: { 
        planId: 'pro',
        name: 'Pro',
        price: 149,
        billingCycle: 'monthly',
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active' 
      },
      usageStats: { 
        messages: { used: 0, limit: 1000 },
        accounts: { used: 1, limit: 5 },
        contacts: 0,
        resetsOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      paymentMethod: {
        cardType: 'Visa',
        last4: '4242',
        expiry: '12/26'
      },
      invoices: []
    };
  },

  async changeSubscriptionPlan(planId: string, billingCycle?: 'monthly' | 'yearly') {
    console.log('Changing plan to:', planId, billingCycle);
    return { success: true };
  },

  async getInvoiceDetails(invoiceId: string): Promise<InvoiceDetails> {
    return { 
      id: invoiceId, 
      date: new Date().toISOString(),
      status: 'Paid',
      billTo: {
        name: auth.currentUser?.displayName || 'User',
        email: auth.currentUser?.email || '',
        address: '123 Main St, Doha, Qatar'
      },
      lineItems: [
        { description: 'Pro Plan Subscription', amount: 149, quantity: 1 }
      ],
      subtotal: 149,
      tax: 0,
      total: 149
    };
  },

  // --- OUTREACH FUNCTIONS ---
  async getOutreachCampaigns(): Promise<OutreachCampaign[]> {
    try {
      const q = query(collection(db, 'outreach_campaigns'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ 
        id: d.id, 
        instance_id: '',
        name: '',
        message_template: '',
        status: 'draft',
        created_at: new Date().toISOString(),
        contacts_total: 0,
        contacts_sent: 0,
        contacts_failed: 0,
        contacts_replied: 0,
        ...d.data() 
      } as OutreachCampaign));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'outreach_campaigns');
      return [];
    }
  },

  async createOutreachCampaign(instanceId: string, name: string, template: string, contacts: any[]) {
    try {
      const docRef = await addDoc(collection(db, 'outreach_campaigns'), {
        instance_id: instanceId,
        name,
        message_template: template,
        contacts,
        createdAt: serverTimestamp(),
        status: 'draft',
        contacts_total: contacts.length,
        contacts_sent: 0,
        contacts_failed: 0,
        contacts_replied: 0
      });
      const snap = await getDoc(docRef);
      return { id: docRef.id, ...snap.data() } as OutreachCampaign;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'outreach_campaigns');
    }
  },

  async updateCampaignStatus(campaignId: string, status: string) {
    try {
      const docRef = doc(db, 'outreach_campaigns', campaignId);
      await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `outreach_campaigns/${campaignId}`);
    }
  },

  async deleteCampaign(campaignId: string) {
    try {
      await deleteDoc(doc(db, 'outreach_campaigns', campaignId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `outreach_campaigns/${campaignId}`);
    }
  },

  // --- WORKFLOW FUNCTIONS ---
  async getWorkflows(): Promise<Workflow[]> {
    try {
      const q = query(collection(db, 'workflows'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ 
        id: d.id, 
        tenant_id: auth.currentUser?.uid || '',
        name: '',
        trigger: { type: 'new_contact_message', config: {} },
        actions: [],
        is_active: true,
        created_at: new Date().toISOString(),
        ...d.data() 
      } as Workflow));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'workflows');
      return [];
    }
  },

  async createWorkflow(workflowData: any) {
    try {
      const docRef = await addDoc(collection(db, 'workflows'), {
        ...workflowData,
        tenant_id: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        is_active: true
      });
      const snap = await getDoc(docRef);
      return { id: docRef.id, ...snap.data() } as Workflow;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workflows');
    }
  },

  async updateWorkflow(workflowId: string, updates: any) {
    try {
      const docRef = doc(db, 'workflows', workflowId);
      await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
      const snap = await getDoc(docRef);
      return { id: workflowId, ...snap.data() } as Workflow;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workflows/${workflowId}`);
    }
  },

  async updateWorkflowStatus(workflowId: string, status: 'active' | 'inactive') {
    try {
      const docRef = doc(db, 'workflows', workflowId);
      await updateDoc(docRef, { is_active: status === 'active', updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workflows/${workflowId}`);
    }
  },

  async deleteWorkflow(workflowId: string) {
    try {
      await deleteDoc(doc(db, 'workflows', workflowId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workflows/${workflowId}`);
    }
  },

  async getWorkflowHistory(page: number = 1, pageSize: number = 20): Promise<WorkflowHistory[]> {
    try {
      const q = query(collection(db, 'workflow_history'), orderBy('triggered_at', 'desc'), limit(pageSize));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ 
        id: d.id, 
        workflow_id: '',
        workflow_name: '',
        triggered_at: new Date().toISOString(),
        trigger_event: { type: 'new_contact_message' },
        status: 'completed',
        actions_log: [],
        ...d.data() 
      } as WorkflowHistory));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'workflow_history');
      return [];
    }
  },

  // --- MISC FUNCTIONS ---
  async logAIAlert(alert: any) {
    try {
      await addDoc(collection(db, 'ai_alerts'), {
        ...alert,
        created_at: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ai_alerts');
    }
  },

  async getInstanceLogs(instanceId: string, limitCount: number = 100): Promise<InstanceLog[]> {
    try {
      const q = query(collection(db, 'system_logs'), where('instanceId', '==', instanceId), orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        instanceId,
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: '',
        ...doc.data() 
      } as unknown as InstanceLog));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'system_logs');
      return [];
    }
  },

  async getLatestLinkingCode(instanceId: string) {
    try {
      const q = query(collection(db, 'linking_codes'), where('instanceId', '==', instanceId), orderBy('createdAt', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as WhatsAppLinkingCode;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'linking_codes');
      return null;
    }
  },

  async createContact(instanceId: string, contactData: any) {
    return this.createManualContact(instanceId, contactData);
  },

  async addInstagramInstance(data: any) {
    try {
      const docRef = await addDoc(collection(db, 'instagram_instances'), {
        ...data,
        tenantId: auth.currentUser?.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'instagram_instances');
    }
  },

  async forceStopInstance(instanceId: string) {
    try {
      const docRef = doc(db, 'whatsapp_instances', instanceId);
      await updateDoc(docRef, { status: WhatsAppInstanceStatus.Stopped, isActive: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `whatsapp_instances/${instanceId}`);
    }
  },

  channel(name: string) {
    const channelObj = {
      on: <T = any>(event: string, config: any, callback: (payload: T) => void) => {
        console.log(`Mock event listener for channel: ${name}, event: ${event}`);
        return channelObj;
      },
      subscribe: () => {
        console.log(`Mock subscription to channel: ${name}`);
        return { unsubscribe: () => {} };
      }
    };
    return channelObj;
  },

  removeChannel(channel: any) {
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe();
    }
  },

  // --- SUPABASE COMPATIBILITY PROXY ---
  get client() {
    return {
      from: (table: string) => ({
        select: (columns: string) => ({
          eq: (col: string, val: any) => ({
            single: async () => {
              const q = query(collection(db, table), where(col, '==', val), limit(1));
              const snap = await getDocs(q);
              return { data: snap.empty ? null : snap.docs[0].data(), error: null };
            },
            maybeSingle: async () => {
              const q = query(collection(db, table), where(col, '==', val), limit(1));
              const snap = await getDocs(q);
              return { data: snap.empty ? null : snap.docs[0].data(), error: null };
            },
            order: (col2: string, { ascending }: any) => ({
              limit: async (l: number) => {
                const q = query(collection(db, table), where(col, '==', val), orderBy(col2, ascending ? 'asc' : 'desc'), limit(l));
                const snap = await getDocs(q);
                return { data: snap.docs.map(d => d.data()), error: null };
              }
            })
          }),
          insert: async (data: any) => {
            try {
              if (Array.isArray(data)) {
                const promises = data.map(d => addDoc(collection(db, table), d));
                await Promise.all(promises);
              } else {
                await addDoc(collection(db, table), data);
              }
              return { data: null, error: null };
            } catch (error: any) {
              return { data: null, error };
            }
          }
        }),
        insert: async (data: any) => {
          try {
            if (Array.isArray(data)) {
              const promises = data.map(d => addDoc(collection(db, table), d));
              await Promise.all(promises);
            } else {
              await addDoc(collection(db, table), data);
            }
            return { data: null, error: null };
          } catch (error: any) {
            return { data: null, error };
          }
        },
        update: (data: any) => ({
          eq: (col: string, val: any) => ({
            async then(resolve: any) {
              resolve({ data: null, error: null });
            }
          })
        }),
        rpc: (fn: string, params: any) => {
          console.log(`Mock RPC call: ${fn}`, params);
          const promise = Promise.resolve({ data: null, error: null });
          return Object.assign(promise, {
            maybeSingle: async () => ({ data: null, error: null })
          });
        },
      }),
      rpc: (fn: string, params: any) => {
        console.log(`Mock RPC call: ${fn}`, params);
        const promise = Promise.resolve({ data: null, error: null });
        return Object.assign(promise, {
          maybeSingle: async () => ({ data: null, error: null })
        });
      },
      auth: {
        getSession: async () => {
          return { data: { session: auth.currentUser ? { user: auth.currentUser } : null }, error: null };
        }
      }
    };
  },

  // Mock for manual contact creation
  async createManualContact(instanceId: string, contactData: any) {
    try {
      const docRef = await addDoc(collection(db, 'whatsapp_contacts'), {
        instance_id: instanceId,
        ...contactData,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'whatsapp_contacts');
    }
  },

  toInstagramMessage,
  toInstagramInstance,
  toInstagramReposterJob,
  toWhatsAppMessage,
  toWhatsAppInstance
};

export const supabase = firebaseService;
export const whatsAppMessageFromSupabase = (data: any) => data.data ? ({ id: data.id, ...data.data() }) : data;
export const whatsAppInstanceFromSupabase = (data: any) => data.data ? ({ id: data.id, ...data.data() }) : data;
export const instagramMessageFromSupabase = (data: any) => data.data ? ({ id: data.id, ...data.data() }) : data;
export const MESSAGE_PAGE_SIZE = 50;
