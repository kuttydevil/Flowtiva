import React, { Suspense } from 'react';
import { User } from 'firebase/auth';
import { firebaseService } from '../../services/firebaseService';
import { useTranslation } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Priority, WhatsAppInstanceStatus, Workflow } from '../../types';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useDashboardState } from '../../hooks/useDashboardState';

// --- LAZY-LOADED COMPONENTS ---
const KanbanColumn = React.lazy(() => import('../crm/KanbanColumn'));
const HubOverview = React.lazy(() => import('../admin/hub/HubOverview'));
const ConversationsView = React.lazy(() => import('../admin/hub/ConversationsView'));
const AllContactsView = React.lazy(() => import('../admin/hub/AllContactsView'));
const BillingDashboard = React.lazy(() => import('../billing/BillingDashboard'));
const OutreachDashboard = React.lazy(() => import('../outreach/OutreachDashboard'));
const WorkflowDashboard = React.lazy(() => import('../workflow/WorkflowDashboard'));
const WorkflowMindmapView = React.lazy(() => import('../workflow/WorkflowMindmapView'));
const WorkflowHistoryView = React.lazy(() => import('../workflow/WorkflowHistoryView'));
const AIMetricsDashboard = React.lazy(() => import('../admin/hub/AIMetricsDashboard'));
const InstagramDashboard = React.lazy(() => import('../instagram/InstagramDashboard'));
const InstagramConversationsView = React.lazy(() => import('../instagram/InstagramConversationsView'));

// Modals and Drawers
const ContactDetailDrawer = React.lazy(() => import('../admin/hub/ContactDetailDrawer'));
const AddInstanceModal = React.lazy(() => import('../whatsapp/AddInstanceModal'));
const InstanceSettingsModal = React.lazy(() => import('../ui/InstanceSettingsModal'));
const ConfirmationModal = React.lazy(() => import('../ui/ConfirmationModal'));
const RelinkingModal = React.lazy(() => import('../whatsapp/RelinkingModal'));
const AddLeadModal = React.lazy(() => import('../crm/AddLeadModal'));

const STAGES = ['New', 'Contacted', 'Proposal', 'Won', 'Lost'];
const stageColors: { [key: string]: string } = {
    'New': 'border-blue-500',
    'Contacted': 'border-purple-500',
    'Proposal': 'border-yellow-500',
    'Won': 'border-green-500',
    'Lost': 'border-red-500',
};

const CenteredLoader: React.FC = () => (
    <div className="h-full w-full flex items-center justify-center bg-brand-secondary p-4">
        <svg className="animate-spin h-8 w-8 text-brand-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [activeView, setActiveView] = React.useState<any>('overview');
    
    const {
        instances,
        allContacts, setAllContacts,
        isLoading,
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
        subscriptionStatus,
        fetchData, fetchBillingStatus
    } = useDashboardState(user);

    const handleOpenDrawer = (contact: any) => {
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

    const handleToggleInstance = async (instance: any) => {
        try {
            await firebaseService.toggleWhatsAppInstance(instance);
            addToast(t('app.toasts.toggleCommand', { status: !instance.isActive ? t('app.toasts.start') : t('app.toasts.stop'), phoneNumber: instance.phoneNumber }), { type: 'info' });
        } catch (error: any) {
            addToast(t('app.errors.generic', { error: error.message }), { type: 'error' });
        }
    };

    const handleSaveSettings = async (instanceId: string, updates: { customPrompt: string, enabled_tools: string[], context: string }) => {
        await firebaseService.updateWhatsAppInstance(instanceId, updates);
        addToast(t('app.toasts.settingsSaved'), { type: 'success' });
        setInstanceForSettings(null);
    };

    const handleConfirmDelete = async () => {
        if (!instanceForDelete) return;
        try {
            await firebaseService.deleteWhatsAppInstance(instanceForDelete.id);
            addToast(t('app.toasts.deleteSuccess', { phoneNumber: instanceForDelete.phoneNumber }), { type: 'success' });
        } catch (error: any) {
            addToast(t('app.errors.generic', { error: error.message }), { type: 'error' });
        } finally {
            setInstanceForDelete(null);
        }
    };

    const handleInstanceClick = (instance: any) => {
        if (instance.status === WhatsAppInstanceStatus.Linking || instance.status === WhatsAppInstanceStatus.Pending) {
            setInstanceForRelinking(instance);
        } else if (instance.status === WhatsAppInstanceStatus.Running || instance.status === WhatsAppInstanceStatus.Inactive) {
            setInstanceForChat(instance);
        } else {
            setLogInstance(instance);
        }
    };
    
    const handleLinkSuccess = (instance: any) => {
        setInstanceForRelinking(null);
        setIsAddModalOpen(false);
        setInstanceForChat(instance);
        addToast(t('app.toasts.connectSuccess', { phoneNumber: instance.phoneNumber }), { type: 'success' });
    };

    const handleStageChange = React.useCallback(async (instanceId: string, contactName: string, newStage: string) => {
        setAllContacts(prev => prev.map(c => c.contact_name === contactName && c.instance_id === instanceId ? { ...c, crm_stage: newStage } : c));
        try { await firebaseService.updateContactCrmStage(instanceId, contactName, newStage); } catch (error: any) { addToast(t('app.toasts.moveError', { contactName }), { type: 'error' }); fetchData(); }
    }, [addToast, fetchData, t, setAllContacts]);

    const handleDueDateChange = React.useCallback(async (instanceId: string, contactName: string, newDueDate: string | null) => {
        setAllContacts(prev => prev.map(c => c.contact_name === contactName && c.instance_id === instanceId ? { ...c, due_date: newDueDate } : c));
        try { await firebaseService.updateContactDueDate(instanceId, contactName, newDueDate); } catch (error: any) { addToast(t('app.toasts.dueDateError', { contactName }), { type: 'error' }); fetchData(); }
    }, [addToast, fetchData, t, setAllContacts]);

    const handlePriorityChange = React.useCallback(async (instanceId: string, contactName: string, newPriority: Priority) => {
        setAllContacts(prev => prev.map(c => c.contact_name === contactName && c.instance_id === instanceId ? { ...c, priority: newPriority } : c));
        try { await firebaseService.updateContactPriority(instanceId, contactName, newPriority); } catch (error: any) { addToast(t('app.toasts.priorityError', { contactName }), { type: 'error' }); fetchData(); }
    }, [addToast, fetchData, t, setAllContacts]);

    const handleTagsUpdated = React.useCallback((instanceId: string, contactName: string, newTags: string[]) => {
        setAllContacts(prev => prev.map(c => c.contact_name === contactName && c.instance_id === instanceId ? { ...c, tags: newTags } : c));
        if (contactForDrawer?.contact_name === contactName && contactForDrawer?.instance_id === instanceId) {
            setContactForDrawer(prev => prev ? { ...prev, tags: newTags } : null);
        }
    }, [contactForDrawer, setAllContacts, setContactForDrawer]);

    const handleCreateWorkflow = () => { setEditingWorkflow(null); setWorkflowView('builder'); };
    const handleEditWorkflow = (workflow: Workflow) => { setEditingWorkflow(workflow); setWorkflowView('builder'); };
    const handleSaveWorkflow = () => { setWorkflowView('dashboard'); fetchData(); };
    const handleCancelWorkflow = () => { setWorkflowView('dashboard'); };
    const handleViewWorkflowHistory = () => { setWorkflowView('history'); };
    const handleBackToWorkflowDashboard = () => { setWorkflowView('dashboard'); };


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
            case 'pipeline':
                return (
                    <div className="flex-1 flex gap-4 overflow-x-auto p-4 md:px-6 md:pb-6">
                        {STAGES.map(stage => (
                            <Suspense key={stage} fallback={<div className="w-72 flex-shrink-0 h-full bg-brand-primary rounded-lg animate-pulse" />}>
                                <KanbanColumn title={stage} contacts={allContacts.filter(c => c.crm_stage === stage)}
                                    onStageChange={handleStageChange} onView={handleOpenDrawer} onAddLead={stage === 'New' ? () => setIsAddLeadModalOpen(true) : undefined}
                                    className={stageColors[stage]} isLoading={isLoading} allStages={STAGES} onDueDateChange={handleDueDateChange} onPriorityChange={handlePriorityChange}
                                />
                            </Suspense>
                        ))}
                    </div>
                );
            case 'contacts':
                return <AllContactsView contacts={allContacts} isLoading={isLoading} onViewContact={handleOpenDrawer} />;
            case 'instagram':
                if (instanceForInstagramView) {
                    return <InstagramConversationsView instance={instanceForInstagramView} onBack={() => setInstanceForInstagramView(null)} />;
                }
                return <InstagramDashboard onViewInstance={(inst) => setInstanceForInstagramView(inst)} />;
            case 'outreach':
                return <OutreachDashboard />;
            case 'workflows':
                if (workflowView === 'builder') {
                    return <WorkflowMindmapView existingWorkflow={editingWorkflow} onSave={handleSaveWorkflow} onCancel={handleCancelWorkflow} />;
                }
                if (workflowView === 'history') {
                    return <WorkflowHistoryView onBack={handleBackToWorkflowDashboard} />;
                }
                return <WorkflowDashboard onCreate={handleCreateWorkflow} onEdit={handleEditWorkflow} onViewHistory={handleViewWorkflowHistory} />;
            case 'billing':
                return <BillingDashboard subscriptionStatus={subscriptionStatus} onSubscriptionUpdate={fetchBillingStatus} />;
            case 'ai_metrics':
                return <AIMetricsDashboard />;
            default:
                return <HubOverview 
                    contacts={allContacts} instances={instances} isLoading={isLoading} onRefresh={fetchData} onAddInstance={() => setIsAddModalOpen(true)}
                    onToggleInstance={handleToggleInstance} onDeleteInstance={(inst) => setInstanceForDelete(inst)} onEditSettings={(inst) => setInstanceForSettings(inst)}
                    onViewLogs={(inst) => setLogInstance(inst)} onInstanceClick={handleInstanceClick} logInstance={logInstance} onViewContact={handleOpenDrawer}
                />;
        }
    };
    
    return (
        <DashboardLayout user={user} activeView={activeView} setActiveView={setActiveView}>
            {renderContent()}
            <Suspense fallback={null}>
                <ContactDetailDrawer isOpen={!!contactForDrawer} onClose={handleCloseDrawer} contact={contactForDrawer} instance={instanceForDrawer} onTagsUpdated={(contactName: string, tags: string[]) => { if (contactForDrawer) { handleTagsUpdated(contactForDrawer.instance_id, contactName, tags); } }} onCrmStageChange={(contactName: string, stage: string) => { if (contactForDrawer) { handleStageChange(contactForDrawer.instance_id, contactName, stage); } }} onPriorityChange={(contactName: string, priority: Priority) => { if (contactForDrawer) { handlePriorityChange(contactForDrawer.instance_id, contactName, priority); } }} onDueDateChange={(contactName: string, date: string | null) => { if (contactForDrawer) { handleDueDateChange(contactForDrawer.instance_id, contactName, date); } }} />
                <AddInstanceModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onLinkSuccess={handleLinkSuccess} />
                <AddLeadModal 
                    isOpen={isAddLeadModalOpen} 
                    onClose={() => setIsAddLeadModalOpen(false)} 
                    onLeadAdded={fetchData} 
                    instances={instances.filter(i => i.status === 'running')} 
                    createManualContact={async (params) => {
                        await firebaseService.createManualContact(params.instanceId, {
                            contact_name: params.contactName,
                            phone_number: params.phoneNumber,
                            tags: params.tags
                        });
                    }} 
                />
                <InstanceSettingsModal isOpen={!!instanceForSettings} onClose={() => setInstanceForSettings(null)} instance={instanceForSettings} onSave={handleSaveSettings} />
                <ConfirmationModal isOpen={!!instanceForDelete} onClose={() => setInstanceForDelete(null)} onConfirm={handleConfirmDelete} title={t('modals.deleteInstance.title')} description={t('modals.deleteInstance.description', { phoneNumber: instanceForDelete?.phoneNumber || '' })} confirmText={t('modals.deleteInstance.confirm')} confirmButtonVariant="destructive" />
                <RelinkingModal isOpen={!!instanceForRelinking} onClose={() => setInstanceForRelinking(null)} instance={instanceForRelinking} onDelete={(instanceToDelete) => { setInstanceForDelete(instanceToDelete); setInstanceForRelinking(null); }} onLinkSuccess={handleLinkSuccess} />
            </Suspense>
        </DashboardLayout>
    );
};
