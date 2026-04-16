
import React, { useState, useEffect } from 'react';
import { InstagramInstance, WhatsAppInstanceStatus } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { firebaseService } from '../../services/firebaseService';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Skeleton } from '../ui/Skeleton';
import { Avatar } from '../ui/Avatar';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { InstanceSettingsModal } from '../ui/InstanceSettingsModal';
import { AddInstanceModal } from './AddInstanceModal';
import { useTranslation } from '../../contexts/LanguageContext';
import { InstagramReposter } from './InstagramReposter';

const StatusIndicator: React.FC<{ status: InstagramInstance['status'] }> = ({ status }) => {
    const styles: Record<WhatsAppInstanceStatus, { dot: string; text: string }> = {
        [WhatsAppInstanceStatus.Pending]: { dot: 'bg-gray-400', text: 'text-gray-400' },
        [WhatsAppInstanceStatus.Linking]: { dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400' },
        [WhatsAppInstanceStatus.Running]: { dot: 'bg-status-green', text: 'text-status-green' },
        [WhatsAppInstanceStatus.Inactive]: { dot: 'bg-gray-400', text: 'text-gray-400' },
        [WhatsAppInstanceStatus.Failed]: { dot: 'bg-status-red', text: 'text-status-red' },
        [WhatsAppInstanceStatus.Stopped]: { dot: 'bg-status-red', text: 'text-status-red' },
    };
    const currentStyle = styles[status];
    return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${currentStyle.dot}`} />
            <span className={`text-sm font-semibold capitalize ${currentStyle.text}`}>{status}</span>
        </div>
    );
};

interface InstagramDashboardProps {
    onViewInstance: (instance: InstagramInstance) => void;
}

export const InstagramDashboard: React.FC<InstagramDashboardProps> = ({ onViewInstance }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'accounts' | 'reposter'>('accounts');
    const [instances, setInstances] = useState<InstagramInstance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [instanceForDelete, setInstanceForDelete] = useState<InstagramInstance | null>(null);
    const [instanceForSettings, setInstanceForSettings] = useState<InstagramInstance | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        const q = query(collection(db, 'instagram_instances'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(firebaseService.toInstagramInstance) as any;
            setInstances(data);
            setIsLoading(false);
        }, (err) => {
            setError(err.message);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleToggleInstance = async (instance: InstagramInstance) => {
        // Implement toggle logic
    };

    const handleConfirmDelete = async () => {
        if (!instanceForDelete) return;
        try {
            await firebaseService.deleteInstagramInstance(instanceForDelete.id);
            addToast(t('instagram.toasts.deleteSuccess', { username: instanceForDelete.username }), { type: 'success' });
        } catch (error: any) {
            addToast(`Error: ${error.message}`, { type: 'error' });
        } finally {
            setInstanceForDelete(null);
        }
    };
    
    const handleSaveSettings = async (instanceId: string, updates: { customPrompt: string, context: string }) => {
       addToast(t('app.toasts.settingsSaved'), { type: 'success' });
       setInstanceForSettings(null);
    };

    return (
        <>
        <div className="p-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{t('instagram.dashboard.title')}</h1>
                    <p className="text-brand-text-secondary">{t('instagram.dashboard.description')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant={activeTab === 'accounts' ? 'primary' : 'ghost'} 
                        onClick={() => setActiveTab('accounts')}
                    >
                        Accounts
                    </Button>
                    <Button 
                        variant={activeTab === 'reposter' ? 'primary' : 'ghost'} 
                        onClick={() => setActiveTab('reposter')}
                    >
                        Reels Reposter
                    </Button>
                    {activeTab === 'accounts' && (
                        <Button onClick={() => setIsAddModalOpen(true)} className="ml-2">{t('instagram.dashboard.connectNew')}</Button>
                    )}
                </div>
            </header>

            {activeTab === 'reposter' ? (
                <InstagramReposter instances={instances} />
            ) : (
                isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
                    </div>
                ) : error ? (
                    <p className="text-center text-status-red">{error}</p>
                ) : instances.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-brand-text-secondary">{t('instagram.dashboard.noAccounts')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {instances.map(instance => (
                            <Card key={instance.id}>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={instance.username} />
                                            <div>
                                                <p className="font-bold text-lg">@{instance.username}</p>
                                                <StatusIndicator status={instance.status} />
                                            </div>
                                        </div>
                                        <Switch checked={instance.isActive} onCheckedChange={() => handleToggleInstance(instance)} />
                                    </div>
                                    {instance.status === 'failed' && <p className="text-xs text-status-red">{instance.last_error}</p>}
                                    <div className="flex items-center justify-between pt-3 border-t border-brand-border">
                                        <Button size="sm" variant="outline" onClick={() => onViewInstance(instance)}>View DMs</Button>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => setInstanceForSettings(instance as any)}>{t('common.settings')}</Button>
                                            <Button size="sm" variant="ghost" className="text-status-red hover:bg-status-red/10" onClick={() => setInstanceForDelete(instance)}>{t('common.delete')}</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )
            )}
        </div>
        <AddInstanceModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onInstanceAdded={() => {}} />
        <ConfirmationModal 
            isOpen={!!instanceForDelete} 
            onClose={() => setInstanceForDelete(null)} 
            onConfirm={handleConfirmDelete}
            title={t('instagram.deleteModal.title')}
            description={t('instagram.deleteModal.description', { username: instanceForDelete?.username || '' })}
            confirmText={t('common.delete')}
            confirmButtonVariant="destructive"
        />
        <InstanceSettingsModal 
            isOpen={!!instanceForSettings}
            onClose={() => setInstanceForSettings(null)}
            instance={instanceForSettings as any}
            onSave={handleSaveSettings as any}
        />
        </>
    );
};
export default InstagramDashboard;
