import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import { WorkflowHistory, WorkflowHistoryActionLog } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useTranslation } from '../../contexts/LanguageContext';

// --- ICONS ---
const BackArrowIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>;
const HistoryIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>;
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z" clipRule="evenodd" /></svg>;
const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.06 0l4-5.5Z" clipRule="evenodd" /></svg>;
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>;

const PAGE_SIZE = 20;

const StatusBadge: React.FC<{ status: WorkflowHistory['status'] }> = ({ status }) => {
    const styles = {
        completed: 'bg-status-green/10 text-status-green',
        failed: 'bg-status-red/10 text-status-red',
        running: 'bg-blue-500/10 text-blue-400 animate-pulse',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[status]}`}>{status}</span>;
};

const timeAgo = (isoTimestamp?: string | null): string => {
    if (!isoTimestamp) return '';
    const date = new Date(isoTimestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return "just now";
};

interface HistoryItemProps {
    item: WorkflowHistory;
    isExpanded: boolean;
    onToggle: () => void;
}
const HistoryItem: React.FC<HistoryItemProps> = ({ item, isExpanded, onToggle }) => {
    const { t } = useTranslation();
    return (
        <Card className="overflow-hidden">
            <button onClick={onToggle} className="w-full text-left p-4 flex items-center justify-between hover:bg-brand-secondary/50">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <StatusBadge status={item.status} />
                        <h3 className="font-semibold text-brand-text-primary truncate">{item.workflow_name}</h3>
                    </div>
                    <p className="text-sm text-brand-text-secondary mt-1">
                        <span className="font-medium">{t('workflows.triggeredAt')}:</span> {new Date(item.triggered_at).toLocaleString()} ({timeAgo(item.triggered_at)})
                    </p>
                </div>
                 <ChevronDownIcon className={`w-5 h-5 transition-transform text-brand-text-secondary flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="bg-brand-secondary/30 p-4 border-t border-brand-border grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <h4 className="font-semibold text-sm mb-2">{t('workflows.runDetails')}</h4>
                        <div className="text-xs space-y-1 text-brand-text-secondary">
                             <p><strong className="text-brand-text-primary">Trigger:</strong> {item.trigger_event.type}</p>
                             {Object.entries(item.trigger_event).filter(([k]) => k !== 'type').map(([key, value]) => (
                                <p key={key}><strong className="text-brand-text-primary capitalize">{key}:</strong> {JSON.stringify(value)}</p>
                             ))}
                             {item.error_message && <p><strong className="text-status-red">Error:</strong> {item.error_message}</p>}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                         <h4 className="font-semibold text-sm mb-2">{t('workflows.actionLog')}</h4>
                         <ul className="space-y-2">
                            {item.actions_log?.map((log, index) => (
                                <li key={index} className="flex items-start gap-3 text-xs">
                                    {log.status === 'success' ? <CheckCircleIcon className="w-4 h-4 text-status-green mt-0.5 flex-shrink-0" /> : <XCircleIcon className="w-4 h-4 text-status-red mt-0.5 flex-shrink-0" />}
                                    <div className="flex-1">
                                        <p><strong className="text-brand-text-primary capitalize">{log.action_type.replace(/_/g, ' ')}</strong> - <span className="text-brand-text-secondary">{new Date(log.timestamp).toLocaleTimeString()}</span></p>
                                        <p className="text-brand-text-secondary">{log.details}</p>
                                    </div>
                                </li>
                            ))}
                         </ul>
                    </div>
                </div>
            )}
        </Card>
    );
};


interface WorkflowHistoryViewProps {
    onBack: () => void;
}
export const WorkflowHistoryView: React.FC<WorkflowHistoryViewProps> = ({ onBack }) => {
    const [history, setHistory] = useState<WorkflowHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const { addToast } = useToast();
    const { t } = useTranslation();

    const fetchHistory = async (pageNum: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await supabase.getWorkflowHistory(pageNum, PAGE_SIZE);
            if (pageNum === 1) {
                setHistory(data);
            } else {
                setHistory(prev => [...prev, ...data]);
            }
            if (data.length < PAGE_SIZE) {
                setHasMore(false);
            }
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, { type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchHistory(1);
    }, []);

    const loadMore = () => {
        if (!isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchHistory(nextPage);
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
             <header className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={onBack} className="flex-shrink-0"><BackArrowIcon className="h-5 w-5"/></Button>
                <div>
                    <h1 className="text-3xl font-bold text-brand-text-primary">{t('workflows.historyTitle')}</h1>
                    <p className="mt-1 text-brand-text-secondary">{t('workflows.historyDescription')}</p>
                </div>
            </header>

            {error && <div className="p-4 bg-red-500/10 text-red-500 rounded-lg">{error}</div>}

            {isLoading && history.length === 0 ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-brand-border rounded-lg">
                    <HistoryIcon className="mx-auto h-12 w-12 text-brand-text-secondary" />
                    <h3 className="mt-2 text-lg font-semibold text-brand-text-primary">{t('workflows.noHistory')}</h3>
                    <p className="mt-1 text-sm text-brand-text-secondary">{t('workflows.noHistoryDesc')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map(item => (
                        <HistoryItem 
                            key={item.id} 
                            item={item}
                            isExpanded={expandedItem === item.id}
                            onToggle={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                        />
                    ))}
                </div>
            )}
            
            {hasMore && (
                <div className="text-center mt-6">
                    <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                        {isLoading ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}
        </div>
    );
};
export default WorkflowHistoryView;
