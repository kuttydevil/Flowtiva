
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../services/supabaseService';
import { Workflow, WorkflowTriggerType } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Switch } from '../ui/Switch';
import { Skeleton } from '../ui/Skeleton';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useTranslation } from '../../contexts/LanguageContext';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';

// --- ICONS ---
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const EditIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>;
const WorkflowIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>;
const HistoryIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>;
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>;
const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>;
const PauseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" /></svg>;


interface WorkflowDashboardProps {
    onCreate: () => void;
    onEdit: (workflow: Workflow) => void;
    onViewHistory: () => void;
}

export const WorkflowDashboard: React.FC<WorkflowDashboardProps> = ({ onCreate, onEdit, onViewHistory }) => {
    const { t } = useTranslation();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    // Filters and Search
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [triggerFilter, setTriggerFilter] = useState('all');

    // Batch Actions
    const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    // Derived description helper
    const getTriggerDescription = (workflow: Workflow): string => {
        const type = workflow.trigger.type;
        const config = workflow.trigger.config;
        switch (type) {
            case 'new_contact_message': return t('workflows.nodes.newContact.details');
            case 'contact_replied': return t('workflows.nodes.contactReplied.details', { defaultValue: 'Contact replied' }); // Added for future
            case 'crm_stage_changed': return t('workflows.nodes.stageChanged.details', { stage: config.stage || '' });
            case 'tag_added': return t('workflows.nodes.tagAdded.details', { tag: config.tag || '' });
            case 'message_contains_keyword': return `Keyword: "${config.keyword}"`; // Add to translation later
            case 'priority_changed': return `Priority: ${config.priority}`; // Add to translation later
            default: return type;
        }
    };

    const TRIGGER_TYPES: { value: WorkflowTriggerType; label: string }[] = [
        { value: 'new_contact_message', label: t('workflows.filters.allTriggers') }, // Just using All for now or map individually
        { value: 'contact_replied', label: 'Contact Replied' },
        { value: 'crm_stage_changed', label: 'Stage Changed' },
        { value: 'tag_added', label: 'Tag Added' },
        { value: 'message_contains_keyword', label: 'Keyword Match' },
        { value: 'priority_changed', label: 'Priority Changed' },
    ];

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const workflowsData = await supabase.getWorkflows();
            setWorkflows(workflowsData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);
    
    const filteredWorkflows = useMemo(() => {
        return workflows
            .filter(wf => statusFilter === 'all' ? true : wf.is_active === (statusFilter === 'active'))
            .filter(wf => triggerFilter === 'all' ? true : wf.trigger.type === triggerFilter)
            .filter(wf => wf.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [workflows, statusFilter, triggerFilter, searchQuery]);

    const activeCount = useMemo(() => workflows.filter(w => w.is_active).length, [workflows]);
    const inactiveCount = useMemo(() => workflows.filter(w => !w.is_active).length, [workflows]);


    const handleToggleStatus = async (workflow: Workflow) => {
        const newStatus = !workflow.is_active;
        setWorkflows(prev => prev.map(wf => wf.id === workflow.id ? { ...wf, is_active: newStatus } : wf));
        try {
            await supabase.updateWorkflowStatus(workflow.id, newStatus ? 'active' : 'inactive');
            addToast(t('workflows.infoStatus', { name: workflow.name, status: newStatus ? t('workflows.filters.active') : t('workflows.filters.inactive') }), { type: 'info' });
        } catch (err: any) {
            addToast(t('workflows.errorStatus', { error: err.message }), { type: 'error' });
            setWorkflows(prev => prev.map(wf => wf.id === workflow.id ? { ...wf, is_active: !newStatus } : wf));
        }
    };

    // --- Batch Action Handlers ---
    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedWorkflows(filteredWorkflows.map(wf => wf.id));
        } else {
            setSelectedWorkflows([]);
        }
    };
    
    const handleSelectOne = (workflowId: string, isChecked: boolean) => {
        if (isChecked) {
            setSelectedWorkflows(prev => [...prev, workflowId]);
        } else {
            setSelectedWorkflows(prev => prev.filter(id => id !== workflowId));
        }
    };

    const executeBatchAction = async (action: 'activate' | 'deactivate' | 'delete') => {
        const selectedCount = selectedWorkflows.length;
        if (selectedCount === 0) return;

        let actionPromise: Promise<any>;
        if (action === 'delete') {
            actionPromise = Promise.all(selectedWorkflows.map(id => supabase.deleteWorkflow(id)));
        } else {
            const newStatus = action === 'activate' ? 'active' : 'inactive';
            actionPromise = Promise.all(selectedWorkflows.map(id => supabase.updateWorkflowStatus(id, newStatus)));
        }

        try {
            await actionPromise;
            if (action === 'delete') {
                setWorkflows(prev => prev.filter(wf => !selectedWorkflows.includes(wf.id)));
                addToast(t('workflows.toasts.batchDelete', { count: selectedCount }), { type: 'success' });
            } else {
                setWorkflows(prev => prev.map(wf => selectedWorkflows.includes(wf.id) ? { ...wf, is_active: action === 'activate' } : wf));
                addToast(t('workflows.toasts.batchStatus', { count: selectedCount }), { type: 'success' });
            }
            setSelectedWorkflows([]);
        } catch (err: any) {
            addToast(t('workflows.toasts.batchError', { error: err.message }), { type: 'error' });
        } finally {
            if (action === 'delete') setIsDeleteModalOpen(false);
        }
    };

    return (
        <>
            <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-brand-text-primary">{t('workflows.title')}</h1>
                        <p className="mt-1 text-brand-text-secondary">{t('workflows.description')}</p>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onViewHistory}>
                            <HistoryIcon className="h-5 w-5 mr-2" />
                            {t('workflows.viewHistory')}
                        </Button>
                        <Button onClick={onCreate}>
                            <PlusIcon className="h-5 w-5 mr-2" />
                            {t('workflows.create')}
                        </Button>
                    </div>
                </header>

                <Card className="mt-6">
                    <div className="p-4 border-b border-brand-border space-y-4">
                        <div className="flex flex-col md:flex-row items-center gap-2">
                            <div className="relative w-full md:flex-1">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-secondary" />
                                <Input
                                    placeholder={t('workflows.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-10 w-full"
                                />
                            </div>
                             <select
                                value={triggerFilter}
                                onChange={(e) => setTriggerFilter(e.target.value)}
                                className="h-10 w-full md:w-auto rounded-md border border-brand-border bg-brand-primary px-3 text-sm text-brand-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                            >
                                <option value="all">{t('workflows.filters.allTriggers')}</option>
                                {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                         <div className="flex items-center gap-4 border-b border-brand-border -mx-4 px-4" role="tablist" aria-label="Filter workflows">
                            <button role="tab" aria-selected={statusFilter === 'all'} onClick={() => setStatusFilter('all')} className={`pb-2 text-sm font-semibold border-b-2 ${statusFilter === 'all' ? 'border-brand-accent text-brand-accent' : 'text-brand-text-secondary border-transparent hover:text-brand-text-primary'}`}>
                                {t('workflows.filters.all')} <span className="text-xs ml-1 px-1.5 py-0.5 rounded-full bg-brand-secondary">{workflows.length}</span>
                            </button>
                            <button role="tab" aria-selected={statusFilter === 'active'} onClick={() => setStatusFilter('active')} className={`pb-2 text-sm font-semibold border-b-2 ${statusFilter === 'active' ? 'border-brand-accent text-brand-accent' : 'text-brand-text-secondary border-transparent hover:text-brand-text-primary'}`}>
                                {t('workflows.filters.active')} <span className="text-xs ml-1 px-1.5 py-0.5 rounded-full bg-brand-secondary">{activeCount}</span>
                            </button>
                            <button role="tab" aria-selected={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')} className={`pb-2 text-sm font-semibold border-b-2 ${statusFilter === 'inactive' ? 'border-brand-accent text-brand-accent' : 'text-brand-text-secondary border-transparent hover:text-brand-text-primary'}`}>
                                {t('workflows.filters.inactive')} <span className="text-xs ml-1 px-1.5 py-0.5 rounded-full bg-brand-secondary">{inactiveCount}</span>
                            </button>
                        </div>
                    </div>

                    {selectedWorkflows.length > 0 && (
                        <div className="p-3 bg-brand-secondary/50 border-b border-brand-border flex flex-col sm:flex-row items-center justify-between gap-2 animate-in fade-in-0">
                            <p className="text-sm font-semibold">{t('workflows.batchActions.selected', { count: selectedWorkflows.length })}</p>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => executeBatchAction('activate')}><PlayIcon className="h-4 w-4 mr-2" />{t('workflows.batchActions.activate')}</Button>
                                <Button size="sm" variant="outline" onClick={() => executeBatchAction('deactivate')}><PauseIcon className="h-4 w-4 mr-2" />{t('workflows.batchActions.deactivate')}</Button>
                                <Button size="sm" variant="destructive" onClick={() => setIsDeleteModalOpen(true)}><TrashIcon className="h-4 w-4 mr-2" />{t('common.delete')}</Button>
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        {error && <div className="p-4 bg-red-500/10 text-red-500 rounded-lg">{error}</div>}

                        {isLoading ? (
                            <div className="space-y-4 p-4">
                                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                            </div>
                        ) : workflows.length === 0 ? (
                            <div className="text-center py-20">
                                <WorkflowIcon className="mx-auto h-12 w-12 text-brand-text-secondary" />
                                <h3 className="mt-2 text-lg font-semibold text-brand-text-primary">{t('workflows.noWorkflows')}</h3>
                                <p className="mt-1 text-sm text-brand-text-secondary">{t('workflows.noWorkflowsDesc')}</p>
                            </div>
                        ) : filteredWorkflows.length === 0 ? (
                            <div className="text-center py-20">
                                <WorkflowIcon className="mx-auto h-12 w-12 text-brand-text-secondary" />
                                <h3 className="mt-2 text-lg font-semibold text-brand-text-primary">{t('header.noResults', { query: searchQuery })}</h3>
                            </div>
                        ) : (
                            <div className="divide-y divide-brand-border">
                                <div className="p-4 flex items-center gap-4 bg-brand-secondary/30">
                                    <Checkbox
                                        checked={selectedWorkflows.length > 0 && selectedWorkflows.length === filteredWorkflows.length}
                                        onCheckedChange={handleSelectAll}
                                        aria-label={t('workflows.table.selectAll')}
                                    />
                                    <span className="text-xs font-semibold text-brand-text-secondary uppercase">{t('workflows.table.selectAll')}</span>
                                </div>
                                {filteredWorkflows.map(workflow => (
                                    <div key={workflow.id} className="p-4 flex items-center gap-4">
                                        <Checkbox
                                            checked={selectedWorkflows.includes(workflow.id)}
                                            onCheckedChange={(isChecked) => handleSelectOne(workflow.id, isChecked)}
                                            aria-label={`Select workflow ${workflow.name}`}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                 <Switch checked={workflow.is_active} onCheckedChange={() => handleToggleStatus(workflow)} />
                                                 <h3 className="font-semibold text-brand-text-primary">{workflow.name}</h3>
                                            </div>
                                            <p className="text-sm text-brand-text-secondary md:ml-14">
                                                <span className="font-medium">{t('workflows.trigger')}:</span> {getTriggerDescription(workflow)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 self-center">
                                            <Button variant="outline" size="sm" onClick={() => onEdit(workflow)}>
                                                <EditIcon className="h-4 w-4 mr-2" />
                                                {t('workflows.edit')}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={() => executeBatchAction('delete')}
                title={t('workflows.deleteModal.title')}
                description={t('workflows.deleteModal.description')}
                confirmText={t('workflows.deleteConfirm')}
                confirmButtonVariant="destructive"
            />
        </>
    );
};
export default WorkflowDashboard;
