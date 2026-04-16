import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { firebaseService } from '../services/firebaseService';
import { useTranslation } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from './useNotifications';
import { WhatsAppInstance, WhatsAppContact, Priority, Workflow, InstagramInstance } from '../types';

export const useDashboardState = (user: User) => {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const { showNotification } = useNotifications();

    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [allContacts, setAllContacts] = useState<WhatsAppContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [contactForDrawer, setContactForDrawer] = useState<WhatsAppContact | null>(null);
    const [instanceForDrawer, setInstanceForDrawer] = useState<WhatsAppInstance | null>(null);
    
    const [instanceForChat, setInstanceForChat] = useState<WhatsAppInstance | null>(null);
    const [instanceForInstagramView, setInstanceForInstagramView] = useState<InstagramInstance | null>(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
    const [instanceForSettings, setInstanceForSettings] = useState<WhatsAppInstance | null>(null);
    const [instanceForDelete, setInstanceForDelete] = useState<WhatsAppInstance | null>(null);
    const [instanceForRelinking, setInstanceForRelinking] = useState<WhatsAppInstance | null>(null);
    const [logInstance, setLogInstance] = useState<WhatsAppInstance | null>(null);

    const [workflowView, setWorkflowView] = useState<'dashboard' | 'builder' | 'history'>('dashboard');
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState<'loading' | 'active' | 'trialing' | 'inactive'>('loading');

    const fetchBillingStatus = useCallback(async () => {
        setSubscriptionStatus('loading');
        try {
            const data = await firebaseService.getBillingDashboardData();
            if (data && data.currentPlan) {
                const status = data.currentPlan.status;
                if (status === 'canceled' || status === 'past_due') {
                    setSubscriptionStatus('inactive');
                } else {
                    setSubscriptionStatus(status as 'active' | 'trialing');
                }
            } else {
                setSubscriptionStatus('inactive');
            }
        } catch (error) {
            console.error("Failed to fetch billing status:", error);
            setSubscriptionStatus('inactive');
        }
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const instancesData = await firebaseService.getWhatsAppInstances();
            setInstances(instancesData);
            
            const allContactsDataPromises = instancesData.map(async (instance) => {
                const contactsForInstance = await firebaseService.getWhatsAppContacts(instance.id);
                return contactsForInstance.map(contact => ({ ...contact, instance_id: instance.id }));
            });
    
            const allContactsNested = await Promise.all(allContactsDataPromises);
            setAllContacts(allContactsNested.flat());

        } catch (err: any) {
            setError((err as Error).message || t('app.errors.loadHubData'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchData();
        fetchBillingStatus();
        
        // Subscribe to instances real-time
        const unsubscribeInstances = firebaseService.subscribeToInstances((newInstances) => {
            setInstances(newInstances);
        });

        return () => {
            unsubscribeInstances();
        };
    }, [fetchData, fetchBillingStatus]);

    useEffect(() => {
        // Subscribe to messages for notifications
        // We might need a more global listener or one per instance
        const unsubscribes = instances.map(instance => {
            return firebaseService.subscribeToMessages(instance.id, (newMessage) => {
                if (newMessage.sender === 'user' && document.hidden) {
                    showNotification(newMessage.contactName, { 
                        body: newMessage.messageText || t('app.notifications.sentImage'), 
                        icon: '/favicon.svg' 
                    });
                }
            });
        });
    
        return () => { 
            unsubscribes.forEach(unsub => unsub());
        };
    }, [instances, showNotification, t]);

    return {
        instances, setInstances,
        allContacts, setAllContacts,
        isLoading, setIsLoading,
        error, setError,
        contactForDrawer, setContactForDrawer,
        instanceForDrawer, setInstanceForDrawer,
        instanceForChat, setInstanceForChat,
        instanceForInstagramView, setInstanceForInstagramView,
        isAddModalOpen, setIsAddModalOpen,
        isAddLeadModalOpen, setIsAddLeadModalOpen,
        instanceForSettings, setInstanceForSettings,
        instanceForDelete, setInstanceForDelete,
        instanceForRelinking, setInstanceForRelinking,
        logInstance, setLogInstance,
        workflowView, setWorkflowView,
        editingWorkflow, setEditingWorkflow,
        subscriptionStatus, setSubscriptionStatus,
        fetchData, fetchBillingStatus
    };
};
