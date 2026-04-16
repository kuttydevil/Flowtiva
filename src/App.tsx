
/*
  A NOTE FROM THE PROJECT LEAD:
  Do not narrow down the scope of functionality and pages. We have worked so hard to create each and 
  every functionality and page. Every time we try to start a new update or conversation, you always 
  try to narrow down the scope. We don't need to do that. I hope you understand.
*/

/*
  DEVELOPER DIRECTIVE (2024-11-02):
  Re-emphasizing the project lead's note above. Under NO circumstances should any features, pages, or components
  be removed or deprecated. The full scope of the application (WhatsApp, Instagram, Outreach, Workflows, Billing, 
  AI Metrics, Superadmin, Homepage) MUST be maintained in all future updates unless explicitly commanded otherwise.
  The goal is to build upon this foundation, not reduce it. Acknowledge this directive in all future interactions.
*/

/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { useNotifications } from './hooks/useNotifications';
import { supabase, whatsAppMessageFromSupabase, whatsAppInstanceFromSupabase } from './services/supabaseService';
import { onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast, ToastProvider } from './contexts/ToastContext';
import { LanguageProvider, useTranslation } from './contexts/LanguageContext';
import { AIProvider } from './contexts/AIContext';
import { ActiveView, WhatsAppInstance, WhatsAppContact, Priority, WhatsAppInstanceStatus } from './types';

// --- LAZY-LOADED COMPONENTS ---
const AuthPage = React.lazy(() => import('./components/auth/AuthPage'));
const UpdatePasswordPage = React.lazy(() => import('./components/auth/UpdatePasswordPage'));
const HomePage = React.lazy(() => import('./components/homepage/HomePage'));
const SuperadminDashboard = React.lazy(() => import('./components/superadmin/SuperadminDashboard'));
const HubOverview = React.lazy(() => import('./components/admin/hub/HubOverview'));
const ConversationsView = React.lazy(() => import('./components/admin/hub/ConversationsView'));
const AllContactsView = React.lazy(() => import('./components/admin/hub/AllContactsView'));
const ContactDetailDrawer = React.lazy(() => import('./components/admin/hub/ContactDetailDrawer'));
const AddInstanceModal = React.lazy(() => import('./components/whatsapp/AddInstanceModal'));
const InstanceSettingsModal = React.lazy(() => import('./components/ui/InstanceSettingsModal'));
const ConfirmationModal = React.lazy(() => import('./components/ui/ConfirmationModal'));
const RelinkingModal = React.lazy(() => import('./components/whatsapp/RelinkingModal'));
const AddLeadModal = React.lazy(() => import('./components/crm/AddLeadModal'));


const SUPERADMIN_EMAIL = 'flowtiva@gmail.com';

type View = 'homepage' | 'auth' | 'loading' | 'dashboard' | 'update_password';

const CenteredLoader: React.FC = () => (
    <div className="h-full w-full flex items-center justify-center bg-brand-secondary p-4">
        <svg className="animate-spin h-8 w-8 text-brand-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);


const Dashboard: React.FC<{ user: User }> = ({ user }) => {
    const { t } = useTranslation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    
    const [activeView, setActiveView] = useState<ActiveView>('overview');
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [allContacts, setAllContacts] = useState<WhatsAppContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const [contactForDrawer, setContactForDrawer] = useState<WhatsAppContact | null>(null);
    const [instanceForDrawer, setInstanceForDrawer] = useState<WhatsAppInstance | null>(null);
    
    const [instanceForChat, setInstanceForChat] = useState<WhatsAppInstance | null>(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
    const [instanceForSettings, setInstanceForSettings] = useState<WhatsAppInstance | null>(null);
    const [instanceForDelete, setInstanceForDelete] = useState<WhatsAppInstance | null>(null);
    const [instanceForRelinking, setInstanceForRelinking] = useState<WhatsAppInstance | null>(null);
    const [logInstance, setLogInstance] = useState<WhatsAppInstance | null>(null);

    const { showNotification } = useNotifications();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const instancesData = await supabase.getWhatsAppInstances();
            setInstances(instancesData);
            
            const allContactsDataPromises = instancesData.map(async (instance) => {
                const contactsForInstance = await supabase.getWhatsAppContacts(instance.id);
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
        const q = query(collection(db, 'whatsapp_instances'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const instancesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsAppInstance));
            setInstances(instancesData);
        });

        return () => {
            unsubscribe();
        };
    }, [fetchData]);

    useEffect(() => {
        const q = query(collection(db, 'whatsapp_messages'), where('sender', '==', 'user'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const newMessage = { id: change.doc.id, ...change.doc.data() } as WhatsAppMessage;
                    if (document.hidden) {
                        showNotification(newMessage.contactName, { body: newMessage.messageText || t('app.notifications.sentImage'), icon: '/favicon.svg' });
                    }
                }
            });
        });
    
        return () => { unsubscribe(); };
    }, [user.uid, showNotification, t]);

    useEffect(() => {
        const handleResize = () => { if (window.innerWidth < 1024) { setIsCollapsed(true); } };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleOpenDrawer = (contact: WhatsAppContact) => {
        const matchingInstance = instances.find(i => i.id === contact.instance_id);
        if (matchingInstance) {
            setInstanceForDrawer(matchingInstance);
            setContactForDrawer(contact);
        } else {
            addToast(t('app.errors.findInstance'), { type: 'error' });
        }
    };

    const handleCloseDrawer = () => {
        setContactForDrawer(null);
        setInstanceForDrawer(null);
    };

    const handleToggleInstance = async (instance: WhatsAppInstance) => {
        try {
            await supabase.toggleWhatsAppInstance(instance);
            addToast(t('app.toasts.toggleCommand', { status: !instance.isActive ? t('app.toasts.start') : t('app.toasts.stop'), phoneNumber: instance.phoneNumber }), { type: 'info' });
        } catch (error: any) {
            addToast(t('app.errors.generic', { error: error.message }), { type: 'error' });
        }
    };

    const handleSaveSettings = async (instanceId: string, updates: { customPrompt: string, enabled_tools: string[], context: string }) => {
        await supabase.updateWhatsAppInstance(instanceId, updates);
        addToast(t('app.toasts.settingsSaved'), { type: 'success' });
        setInstanceForSettings(null);
    };

    const handleConfirmDelete = async () => {
        if (!instanceForDelete) return;
        try {
            await supabase.deleteWhatsAppInstance(instanceForDelete.id);
            addToast(t('app.toasts.deleteSuccess', { phoneNumber: instanceForDelete.phoneNumber }), { type: 'success' });
        } catch (error: any) {
            addToast(t('app.errors.generic', { error: error.message }), { type: 'error' });
        } finally {
            setInstanceForDelete(null);
        }
    };

    const handleInstanceClick = (instance: WhatsAppInstance) => {
        if (instance.status === WhatsAppInstanceStatus.Linking || instance.status === WhatsAppInstanceStatus.Pending) {
            setInstanceForRelinking(instance);
        } else if (instance.status === WhatsAppInstanceStatus.Running || instance.status === WhatsAppInstanceStatus.Inactive) {
            setInstanceForChat(instance);
        } else {
            setLogInstance(instance);
        }
    };
    
    const handleLinkSuccess = (instance: WhatsAppInstance) => {
        setInstanceForRelinking(null);
        setIsAddModalOpen(false);
        setInstanceForChat(instance);
        addToast(t('app.toasts.connectSuccess', { phoneNumber: instance.phoneNumber }), { type: 'success' });
    };

    const handleStageChange = useCallback(async (instanceId: string, contactName: string, newStage: string) => {
        setAllContacts(prev => prev.map(c => c.contact_name === contactName && c.instance_id === instanceId ? { ...c, crm_stage: newStage } : c));
        try { await supabase.updateContactCrmStage(instanceId, contactName, newStage); } catch (error: any) { addToast(t('app.toasts.moveError', { contactName }), { type: 'error' }); fetchData(); }
    }, [addToast, fetchData, t]);

    const handleDueDateChange = useCallback(async (instanceId: string, contactName: string, newDueDate: string | null) => {
        setAllContacts(prev => prev.map(c => c.contact_name === contactName && c.instance_id === instanceId ? { ...c, due_date: newDueDate } : c));
        try { await supabase.updateContactDueDate(instanceId, contactName, newDueDate); } catch (error: any) { addToast(t('app.toasts.dueDateError', { contactName }), { type: 'error' }); fetchData(); }
    }, [addToast, fetchData, t]);

    const handlePriorityChange = useCallback(async (instanceId: string, contactName: string, newPriority: Priority) => {
        setAllContacts(prev => prev.map(c => c.contact_name === contactName && c.instance_id === instanceId ? { ...c, priority: newPriority } : c));
        try { await supabase.updateContactPriority(instanceId, contactName, newPriority); } catch (error: any) { addToast(t('app.toasts.priorityError', { contactName }), { type: 'error' }); fetchData(); }
    }, [addToast, fetchData, t]);

    const handleTagsUpdated = useCallback((instanceId: string, contactName: string, newTags: string[]) => {
        setAllContacts(prev => prev.map(c => c.contact_name === contactName && c.instance_id === instanceId ? { ...c, tags: newTags } : c));
        if (contactForDrawer?.contact_name === contactName && contactForDrawer?.instance_id === instanceId) {
            setContactForDrawer(prev => prev ? { ...prev, tags: newTags } : null);
        }
    }, [contactForDrawer]);


    if (instanceForChat) {
        return <Suspense fallback={<CenteredLoader />}><ConversationsView instance={instanceForChat} onBack={() => setInstanceForChat(null)} onAddContact={() => setIsAddLeadModalOpen(true)} /></Suspense>;
    }
    
    const renderContent = () => {
        switch (activeView) {
            case 'overview':
                return <HubOverview 
                    contacts={allContacts} instances={instances} isLoading={isLoading} onRefresh={fetchData} onAddInstance={() => setIsAddModalOpen(true)}
                    onToggleInstance={handleToggleInstance} onDeleteInstance={(inst) => setInstanceForDelete(inst)} onEditSettings={(inst) => setInstanceForSettings(inst)}
                    onViewLogs={(inst) => setLogInstance(inst)} onInstanceClick={handleInstanceClick} logInstance={logInstance} onViewContact={handleOpenDrawer}
                />;
            case 'contacts':
                return <AllContactsView contacts={allContacts} isLoading={isLoading} onViewContact={handleOpenDrawer} />;
            default:
                return <HubOverview 
                    contacts={allContacts} instances={instances} isLoading={isLoading} onRefresh={fetchData} onAddInstance={() => setIsAddModalOpen(true)}
                    onToggleInstance={handleToggleInstance} onDeleteInstance={(inst) => setInstanceForDelete(inst)} onEditSettings={(inst) => setInstanceForSettings(inst)}
                    onViewLogs={(inst) => setLogInstance(inst)} onInstanceClick={handleInstanceClick} logInstance={logInstance} onViewContact={handleOpenDrawer}
                />;
        }
    };
    
    return (
        <div className="h-screen bg-brand-secondary text-brand-text-primary font-sans flex overflow-hidden">
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} activeView={activeView} setActiveView={setActiveView} />
            <div className={`flex-1 flex flex-col overflow-y-hidden transition-all duration-300 lg:ms-20 ${!isCollapsed ? 'lg:!ms-64' : ''}`}>
                <Header onMenuClick={() => setIsMobileOpen(true)} activeView={activeView} user={user!} />
                <main className="flex-1 overflow-y-auto bg-brand-secondary">
                    <Suspense fallback={<CenteredLoader />}>
                        {renderContent()}
                    </Suspense>
                </main>
            </div>
            
            <Suspense fallback={null}>
                <ContactDetailDrawer isOpen={!!contactForDrawer} onClose={handleCloseDrawer} contact={contactForDrawer} instance={instanceForDrawer} onTagsUpdated={(contactName: string, tags: string[]) => { if (contactForDrawer) { handleTagsUpdated(contactForDrawer.instance_id, contactName, tags); } }} onCrmStageChange={(contactName: string, stage: string) => { if (contactForDrawer) { handleStageChange(contactForDrawer.instance_id, contactName, stage); } }} onPriorityChange={(contactName: string, priority: Priority) => { if (contactForDrawer) { handlePriorityChange(contactForDrawer.instance_id, contactName, priority); } }} onDueDateChange={(contactName: string, date: string | null) => { if (contactForDrawer) { handleDueDateChange(contactForDrawer.instance_id, contactName, date); } }} />
                <AddInstanceModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onLinkSuccess={handleLinkSuccess} />
                <AddLeadModal isOpen={isAddLeadModalOpen} onClose={() => setIsAddLeadModalOpen(false)} onLeadAdded={fetchData} instances={instances.filter(i => i.status === 'running')} createManualContact={supabase.createManualContact} />
                <InstanceSettingsModal isOpen={!!instanceForSettings} onClose={() => setInstanceForSettings(null)} instance={instanceForSettings} onSave={handleSaveSettings} />
                <ConfirmationModal isOpen={!!instanceForDelete} onClose={() => setInstanceForDelete(null)} onConfirm={handleConfirmDelete} title={t('modals.deleteInstance.title')} description={t('modals.deleteInstance.description', { phoneNumber: instanceForDelete?.phoneNumber })} confirmText={t('modals.deleteInstance.confirm')} confirmButtonVariant="destructive" />
                <RelinkingModal isOpen={!!instanceForRelinking} onClose={() => setInstanceForRelinking(null)} instance={instanceForRelinking} onDelete={(instanceToDelete) => { setInstanceForDelete(instanceToDelete); setInstanceForRelinking(null); }} onLinkSuccess={handleLinkSuccess} />
            </Suspense>
        </div>
    );
};

const AppContent = () => {
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<View>(() => {
        const hash = window.location.hash;
        const path = window.location.pathname;
        if (hash.includes('type=recovery')) return 'update_password';
        if (path === '/auth/confirm' || path === '/auth/callback') return 'loading';
        return 'homepage';
    });
  
    useEffect(() => {
        const unsubscribe = supabase.auth.onAuthStateChange((event: string, session: any) => {
            const currentUser = session?.user || null;
            setUser(currentUser);

            if (event === 'SIGNED_IN') {
                const path = window.location.pathname;
                if (path === '/auth/confirm' || path === '/auth/callback') {
                    window.history.replaceState({}, document.title, window.location.origin);
                }
            }

            setView(currentView => {
                if (event === 'PASSWORD_RECOVERY') {
                    return 'update_password';
                }
                if (currentView === 'auth' || currentView === 'update_password') {
                    return currentUser ? 'dashboard' : currentView;
                }
                return currentUser ? 'dashboard' : 'homepage';
            });
        });

        return () => {
            unsubscribe.data.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const hash = window.location.hash;
        const path = window.location.pathname;
        const isAuthCallback = path === '/auth/confirm' || path === '/auth/callback';

        if (hash.includes('type=recovery')) {
            setView('update_password');
        } else if (isAuthCallback) {
            setView('loading');
        } else {
            setView(user ? 'dashboard' : 'homepage');
        }
    }, [user]);


    const renderContent = () => {
        switch(view) {
            case 'loading':
                return <CenteredLoader />;
            case 'homepage':
                return <HomePage onAuthNavigate={() => setView('auth')} />;
            case 'auth':
                return <AuthPage onHomeNavigate={() => setView('homepage')} />;
             case 'update_password':
                return <UpdatePasswordPage onSuccess={() => setView('auth')} />;
            case 'dashboard':
                if (user?.email === SUPERADMIN_EMAIL) {
                    return <SuperadminDashboard user={user} />;
                }
                return <Dashboard user={user!} />;
            default:
                return <HomePage onAuthNavigate={() => setView('auth')} />;
        }
    }

    return <Suspense fallback={<CenteredLoader />}>{renderContent()}</Suspense>;
};

const App = () => (
  <LanguageProvider>
    <ToastProvider>
      <AIProvider>
        <AppContent />
      </AIProvider>
    </ToastProvider>
  </LanguageProvider>
);

export default App;
