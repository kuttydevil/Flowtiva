
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../../services/firebaseService';
import { WhatsAppInstance, WhatsAppContact, WhatsAppInstanceStatus, DashboardStats } from '../../../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Skeleton } from '../../ui/Skeleton';
import { InstanceLogViewer } from '../../whatsapp/InstanceLogViewer';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useToast } from '../../../contexts/ToastContext';
import { RecentActivityCard } from './RecentActivityCard';
import { PipelineDistributionCard } from './PipelineDistributionCard';
import { UpcomingTasksCard } from './UpcomingTasksCard';
import { useNotifications } from '../../../hooks/useNotifications';
import { AIInsightCard } from './AIInsightCard';
import { InstanceCard } from './InstanceCard';
import { LeadsPipelineChart } from '../../crm/LeadsPipelineChart';
import HealthCard from './HealthCard';
import { useAI } from '../../../contexts/AIContext';

// Icons
const AlertIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>;
const InboxIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.012-1.244h3.859M12 3v10.5m0 0-3-3m3 3 3-3" /></svg>;
const BellIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>;


interface HubOverviewProps {
    instances: WhatsAppInstance[];
    contacts: WhatsAppContact[];
    isLoading: boolean;
    onRefresh: () => void;
    onAddInstance: () => void;
    onToggleInstance: (instance: WhatsAppInstance) => void;
    onDeleteInstance: (instance: WhatsAppInstance) => void;
    onEditSettings: (instance: WhatsAppInstance) => void;
    onViewLogs: (instance: WhatsAppInstance) => void;
    onInstanceClick: (instance: WhatsAppInstance) => void;
    logInstance: WhatsAppInstance | null;
    onViewContact: (contact: WhatsAppContact) => void;
}

export const HubOverview: React.FC<HubOverviewProps> = (props) => {
    const { 
        instances, contacts, isLoading, onRefresh,
        onAddInstance, onToggleInstance, onDeleteInstance, onEditSettings, onViewLogs,
        onInstanceClick,
        logInstance, onViewContact
    } = props;
    const { t } = useTranslation();
    const { addToast } = useToast();
    const { permission, requestPermission } = useNotifications();
    const { aiHealth } = useAI();

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isStatsLoading, setIsStatsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsStatsLoading(true);
            try {
                const statsData = await firebaseService.getDashboardStats();
                setStats(statsData);
            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
            } finally {
                setIsStatsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const newContacts = contacts.filter(c => c.crm_stage === 'New');
    const failedInstances = instances.filter(i => i.status === 'failed');

    const handleRequestPermission = async () => {
        const result = await requestPermission();
        if (result === 'granted') {
            addToast(t('whatsapp.notifications.successToast'), { type: 'success' });
        } else {
            addToast(t('whatsapp.notifications.infoToast'), { type: 'info' });
        }
    };
    
    return (
        <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <AIInsightCard stats={stats} instances={instances} />
            {/* Left Column */}
            <div className="xl:col-span-2 space-y-6">
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm overflow-hidden rounded-[24px]">
                    <CardHeader className="flex-row items-center justify-between pb-4 bg-muted/20 border-b border-border/50">
                        <div>
                            <CardTitle className="text-lg font-semibold tracking-tight text-foreground">{t('hub.instanceManagement.title')}</CardTitle>
                            <CardDescription className="text-[13px] mt-1">{t('hub.instanceManagement.description')}</CardDescription>
                        </div>
                        <Button size="sm" onClick={onAddInstance} className="shadow-sm font-medium rounded-xl">{t('hub.buttons.connectNew')}</Button>
                    </CardHeader>
                    <CardContent className="p-6">
                        {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : instances.length === 0 ? (
                            <div className="text-center py-12 bg-muted/20 rounded-[20px] border border-dashed border-border/60">
                                <p className="text-sm text-muted-foreground">{t('hub.emptyState.noAccounts')}</p>
                                <Button size="sm" onClick={onAddInstance} className="mt-4">{t('hub.buttons.connectFirst')}</Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {instances.map(instance => (
                                    <InstanceCard
                                        key={instance.id}
                                        instance={instance}
                                        onToggle={onToggleInstance}
                                        onClick={onInstanceClick}
                                        onDelete={onDeleteInstance}
                                        onEditSettings={onEditSettings}
                                        onViewLogs={onViewLogs}
                                        isLogViewerOpen={logInstance?.id === instance.id}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <LeadsPipelineChart contacts={contacts} isLoading={isLoading} />

                <InstanceLogViewer instance={logInstance} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
                <HealthCard
                    state={aiHealth}
                    lastCheckedAt={new Date().toISOString()}
                    uptimePercent={99.9}
                    onRefresh={onRefresh}
                    loading={isLoading}
                />
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm overflow-hidden rounded-[24px]">
                    <CardHeader className="pb-4 bg-muted/20 border-b border-border/50"><CardTitle className="text-lg font-semibold tracking-tight text-foreground">{t('hub.actionItems.title')}</CardTitle></CardHeader>
                    <CardContent className="p-6">
                        {isLoading ? <Skeleton className="h-24 rounded-2xl" /> : (
                            <ul className="space-y-4">
                                <li className="flex items-start gap-4 p-3 rounded-2xl hover:bg-muted/50 transition-colors group cursor-pointer">
                                    <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors ring-1 ring-blue-500/20 shadow-sm"><InboxIcon className="h-5 w-5 text-blue-500"/></div>
                                    <div>
                                        <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{newContacts.length} {t('hub.actionItems.newLeads')}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{t('hub.actionItems.newLeadsDesc')}</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4 p-3 rounded-2xl hover:bg-muted/50 transition-colors group cursor-pointer">
                                    <div className="p-2.5 bg-destructive/10 rounded-xl group-hover:bg-destructive/20 transition-colors ring-1 ring-destructive/20 shadow-sm"><AlertIcon className="h-5 w-5 text-destructive"/></div>
                                    <div>
                                        <p className="font-semibold text-foreground text-sm group-hover:text-destructive transition-colors">{failedInstances.length} {t('hub.actionItems.failedInstances')}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{t('hub.actionItems.failedInstancesDesc')}</p>
                                    </div>
                                </li>
                                {permission === 'default' && (
                                    <li className="flex items-start gap-4 p-5 bg-muted/30 rounded-2xl border border-border/50 shadow-sm">
                                        <div className="p-2.5 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/20"><BellIcon className="h-5 w-5 text-yellow-500"/></div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-foreground text-sm">{t('whatsapp.notifications.title')}</p>
                                            <p className="text-xs text-muted-foreground mt-1 mb-3 leading-relaxed">{t('whatsapp.notifications.description')}</p>
                                            <Button size="sm" variant="outline" onClick={handleRequestPermission} className="w-full shadow-sm font-medium rounded-xl">{t('whatsapp.notifications.button')}</Button>
                                        </div>
                                    </li>
                                )}
                            </ul>
                        )}
                    </CardContent>
                </Card>
                <UpcomingTasksCard
                    contacts={contacts}
                    isLoading={isLoading}
                    onViewContact={onViewContact}
                />
                <RecentActivityCard />
                <PipelineDistributionCard contacts={contacts} />
            </div>
        </div>
    );
};
export default HubOverview;
