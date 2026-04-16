import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseService';
import { OutreachCampaign, WhatsAppInstance } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { CreateCampaignModal } from './CreateCampaignModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';

const PaperPlaneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>;
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" /></svg>;
const PauseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Zm6.5 0a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;

const StatusBadge: React.FC<{ status: OutreachCampaign['status'] }> = ({ status }) => {
    const styles = {
        draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        running: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse',
        paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        completed: 'bg-status-green/10 text-status-green border-status-green/20',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize border ${styles[status]}`}>{status}</span>;
};

const StatItem = ({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) => (
    <div className="text-center">
        <p className="text-xs text-brand-text-secondary">{label}</p>
        <p className={`text-xl font-bold ${valueColor || 'text-brand-text-primary'}`}>{value}</p>
    </div>
);


export const OutreachDashboard: React.FC = () => {
    const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState<OutreachCampaign | null>(null);
    const { addToast } = useToast();

    const fetchCampaignsAndInstances = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [campaignsData, instancesData] = await Promise.all([
                supabase.getOutreachCampaigns(),
                supabase.getWhatsAppInstances()
            ]);
            setCampaigns(campaignsData);
            setInstances(instancesData.filter(i => i.status === 'running'));
        } catch (err: any) {
            setError(err.message || 'Failed to load data.');
            addToast(err.message, { type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchCampaignsAndInstances();
    }, [fetchCampaignsAndInstances]);
    
    const handleCampaignCreated = () => {
        setIsModalOpen(false);
        fetchCampaignsAndInstances(); // Refetch to show the new campaign
    };

    const handleToggleStatus = async (campaign: OutreachCampaign) => {
        const newStatus = (campaign.status === 'running') ? 'paused' : 'running';
        try {
            await supabase.updateCampaignStatus(campaign.id, newStatus);
            setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
            addToast(`Campaign "${campaign.name}" is now ${newStatus}.`, { type: 'info' });
        } catch (err: any) {
            addToast(`Failed to update campaign status: ${err.message}`, { type: 'error' });
        }
    };
    
    const handleDeleteCampaign = async () => {
        if (!campaignToDelete) return;
        try {
            await supabase.deleteCampaign(campaignToDelete.id);
            setCampaigns(prev => prev.filter(c => c.id !== campaignToDelete.id));
            addToast(`Campaign "${campaignToDelete.name}" deleted.`, { type: 'success' });
        } catch (err: any) {
            addToast(`Failed to delete campaign: ${err.message}`, { type: 'error' });
        } finally {
            setCampaignToDelete(null);
        }
    };


    return (
        <>
            <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-brand-text-primary">Outreach Campaigns</h1>
                        <p className="mt-1 text-brand-text-secondary">Create and manage bulk messaging and follow-up campaigns.</p>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} disabled={instances.length === 0}>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        New Campaign
                    </Button>
                </header>

                {error && <div className="p-4 bg-red-500/10 text-red-500 rounded-lg">{error}</div>}

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-60" />)}
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-brand-border rounded-lg">
                        <PaperPlaneIcon className="mx-auto h-12 w-12 text-brand-text-secondary" />
                        <h3 className="mt-2 text-lg font-semibold text-brand-text-primary">No Campaigns Yet</h3>
                        <p className="mt-1 text-sm text-brand-text-secondary">Click "New Campaign" to send your first bulk message.</p>
                         {instances.length === 0 && (
                            <p className="mt-4 text-sm bg-yellow-500/10 text-yellow-500 p-3 rounded-md max-w-md mx-auto">
                                You need at least one active WhatsApp account to create a campaign.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.map(campaign => {
                            const replyRate = campaign.contacts_sent > 0
                                ? ((campaign.contacts_replied / campaign.contacts_sent) * 100).toFixed(0)
                                : '0';

                            return (
                             <Card key={campaign.id} className="flex flex-col justify-between">
                                <div className="p-5">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-brand-text-primary pr-4">{campaign.name}</h3>
                                        <StatusBadge status={campaign.status} />
                                    </div>
                                    <p className="text-sm text-brand-text-secondary mt-2 line-clamp-2">Template: "{campaign.message_template}"</p>
                                    <div className="mt-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-brand-text-primary">Progress</span>
                                            <span className="text-xs text-brand-text-secondary">{campaign.contacts_sent} / {campaign.contacts_total} sent</span>
                                        </div>
                                        <div className="w-full bg-brand-secondary rounded-full h-2">
                                            <div
                                                className="bg-brand-accent h-2 rounded-full"
                                                style={{ width: `${(campaign.contacts_sent / (campaign.contacts_total || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                     <div className="mt-4 pt-4 border-t border-brand-border/50 grid grid-cols-3 gap-2">
                                        <StatItem label="Sent" value={`${campaign.contacts_sent} / ${campaign.contacts_total}`} />
                                        <StatItem label="Failed" value={campaign.contacts_failed} valueColor={campaign.contacts_failed > 0 ? "text-status-red" : undefined} />
                                        <StatItem label="Reply Rate" value={`${replyRate}%`} valueColor={parseInt(replyRate) > 0 ? "text-status-green" : undefined} />
                                    </div>
                                </div>
                                <div className="p-3 bg-brand-secondary/50 border-t border-brand-border flex items-center justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleStatus(campaign)}
                                        disabled={campaign.status === 'completed'}
                                        className="h-8"
                                    >
                                        {campaign.status === 'running' ? <PauseIcon className="h-4 w-4 mr-2"/> : <PlayIcon className="h-4 w-4 mr-2"/>}
                                        {campaign.status === 'running' ? 'Pause' : 'Run'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setCampaignToDelete(campaign)}
                                        className="text-status-red hover:bg-status-red/10 hover:text-status-red h-8 w-8"
                                    >
                                        <TrashIcon className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </Card>
                        )})}
                    </div>
                )}
            </div>
            
            <CreateCampaignModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCampaignCreated={handleCampaignCreated}
                instances={instances}
            />

            <ConfirmationModal
                isOpen={!!campaignToDelete}
                onClose={() => setCampaignToDelete(null)}
                onConfirm={handleDeleteCampaign}
                title="Delete Campaign"
                description={`Are you sure you want to delete "${campaignToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmButtonVariant="destructive"
            />
        </>
    );
};

// FIX: Add default export for compatibility with React.lazy
export default OutreachDashboard;
