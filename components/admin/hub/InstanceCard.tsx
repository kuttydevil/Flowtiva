
import React, { useState, useEffect, useRef } from 'react';
import { WhatsAppInstance, WhatsAppInstanceStatus } from '../../../types';
import { Card, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Switch } from '../../ui/Switch';
import { useTranslation } from '../../../contexts/LanguageContext';

// --- ICONS ---
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226l.55-.22a2.25 2.25 0 0 1 2.97 1.583l.22.549a2.25 2.25 0 0 0 1.956 1.956l.55.22a2.25 2.25 0 0 1 1.583 2.97l-.22.549a2.25 2.25 0 0 0 1.956 1.956l.549.22a2.25 2.25 0 0 1-1.226 1.11l-.22.55a2.25 2.25 0 0 1-2.97-1.583l-.22-.549a2.25 2.25 0 0 0-1.956-1.956l-.549-.22a2.25 2.25 0 0 1-1.583-2.97l.22-.55a2.25 2.25 0 0 0-1.956-1.956l-.55-.22a2.25 2.25 0 0 1-1.11-1.226z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const TerminalIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>;
const EllipsisVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /></svg>;

const HEARTBEAT_THRESHOLD_SECONDS = 90;

const StatusIndicator: React.FC<{ status: WhatsAppInstanceStatus }> = ({ status }) => {
    const { t } = useTranslation();
    const styles: Record<WhatsAppInstanceStatus, { dot: string; text: string; title: string }> = {
        [WhatsAppInstanceStatus.Pending]: { dot: 'bg-gray-400', text: 'text-gray-400', title: t('hub.instanceCard.tooltips.pending') },
        [WhatsAppInstanceStatus.Linking]: { dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400', title: t('hub.instanceCard.tooltips.linking') },
        [WhatsAppInstanceStatus.Running]: { dot: 'bg-status-green', text: 'text-status-green', title: t('hub.instanceCard.tooltips.running') },
        [WhatsAppInstanceStatus.Inactive]: { dot: 'bg-gray-400', text: 'text-gray-400', title: t('hub.instanceCard.tooltips.inactive') },
        [WhatsAppInstanceStatus.Failed]: { dot: 'bg-status-red', text: 'text-status-red', title: t('hub.instanceCard.tooltips.failed') },
        [WhatsAppInstanceStatus.Stopped]: { dot: 'bg-status-red', text: 'text-status-red', title: t('hub.instanceCard.tooltips.stopped') },
    };
    const currentStyle = styles[status] || { dot: 'bg-gray-400', text: 'text-gray-400', title: 'Unknown' };
    // Map status key to translation
    const statusKey = status ? status.toLowerCase() : 'unknown';
    const statusLabel = t(`hub.instanceCard.status.${statusKey}`);

    return (
        <div className="flex items-center gap-2" title={currentStyle.title}>
            <div className={`w-2 h-2 rounded-full ${currentStyle.dot}`} />
            <span className={`text-sm font-semibold capitalize ${currentStyle.text}`}>{statusLabel}</span>
        </div>
    );
};

interface InstanceCardProps {
    instance: WhatsAppInstance;
    onToggle: (instance: WhatsAppInstance) => void;
    onClick: (instance: WhatsAppInstance) => void;
    onDelete: (instance: WhatsAppInstance) => void;
    onEditSettings: (instance: WhatsAppInstance) => void;
    onViewLogs: (instance: WhatsAppInstance) => void;
    isLogViewerOpen: boolean;
}

export const InstanceCard: React.FC<InstanceCardProps> = ({ instance, onToggle, onClick, onDelete, onEditSettings, onViewLogs, isLogViewerOpen }) => {
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    // NEW: state for real-time health check
    const [isHealthy, setIsHealthy] = useState(false);
    const [lastCheckText, setLastCheckText] = useState('');

    useEffect(() => {
        const updateHealth = () => {
            const secondsSinceHeartbeat = instance.last_heartbeat 
                ? (new Date().getTime() - new Date(instance.last_heartbeat).getTime()) / 1000 
                : Infinity;
            
            setIsHealthy(secondsSinceHeartbeat < HEARTBEAT_THRESHOLD_SECONDS);
            
            // Localized time ago logic
            if (!instance.last_heartbeat) {
                setLastCheckText(t('common.notAvailable'));
                return;
            }
            const date = new Date(instance.last_heartbeat);
            const now = new Date();
            const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (seconds < 5) setLastCheckText(t('time.justNow'));
            else if (seconds < 60) setLastCheckText(t('time.secondsAgo', { count: seconds }));
            else {
                const minutes = Math.floor(seconds / 60);
                setLastCheckText(t('time.minutesAgo', { count: minutes }));
            }
        };
        
        updateHealth(); // Initial check
        const interval = setInterval(updateHealth, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [instance.last_heartbeat, t]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getPrimaryAction = () => {
        let buttonText = "";
        if (instance.status === WhatsAppInstanceStatus.Running || instance.status === WhatsAppInstanceStatus.Inactive) {
            buttonText = t('hub.instanceCard.buttons.viewChats');
        } else if (instance.status === WhatsAppInstanceStatus.Pending || instance.status === WhatsAppInstanceStatus.Linking) {
            buttonText = t('hub.instanceCard.buttons.continueLinking');
        } else {
            buttonText = t('hub.instanceCard.buttons.viewErrorLogs');
        }

        const variant = instance.status === WhatsAppInstanceStatus.Failed ? "destructive" : "outline";

        return <Button variant={variant} size="sm" onClick={() => onClick(instance)} className="rounded-xl font-medium shadow-sm">{buttonText}</Button>;
    };

    return (
        <Card className="hover:border-primary/30 transition-all duration-300 group bg-card/50 backdrop-blur-sm shadow-sm relative overflow-visible rounded-[24px]">
            <CardContent className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shadow-sm ring-1 ring-primary/20">
                            {(instance.name || 'I').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground text-base tracking-tight">{instance.name || 'Instance'}</h3>
                            <p className="text-[13px] text-muted-foreground font-mono mt-0.5" dir="ltr">+974 {instance.phoneNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={instance.isActive}
                            onCheckedChange={() => onToggle(instance)}
                            label={t('common.active')}
                            aria-label={`Toggle instance ${instance.phoneNumber}`}
                        />
                    </div>
                </div>

                {/* Body - UPDATED */}
                <div className="flex items-center justify-between bg-muted/20 p-4 rounded-[16px] border border-border/50 shadow-sm">
                    <StatusIndicator status={instance.status} />
                    {instance.status === 'running' && instance.isActive && (
                        <div className="relative group w-fit">
                            <div className="flex items-center gap-2 text-sm cursor-help">
                                <span className={`w-2.5 h-2.5 rounded-full ${isHealthy ? 'bg-status-green' : 'bg-status-red animate-pulse'} ring-2 ring-background`} />
                                <span className={`font-semibold text-[13px] ${isHealthy ? 'text-status-green' : 'text-status-red'}`}>
                                    {isHealthy ? t('hub.instanceCard.tooltips.healthy') : t('hub.instanceCard.tooltips.unresponsive')}
                                </span>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full right-0 mb-2 w-max px-3 py-2 bg-popover text-popover-foreground border border-border/50 shadow-md text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-medium">
                                {t('hub.healthCard.lastChecked')}: {lastCheckText}
                            </div>
                        </div>
                    )}
                </div>
                
                {instance.status === 'failed' && instance.last_error && (
                     <div className="p-4 bg-destructive/10 rounded-[16px] border border-destructive/20 text-xs text-destructive font-medium shadow-sm">
                        <strong>{t('common.error')}:</strong> {instance.last_error}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-5 border-t border-border/50 mt-2">
                    <div>{getPrimaryAction()}</div>
                    <div className="relative" ref={menuRef}>
                        <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(prev => !prev)} className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <EllipsisVerticalIcon className="h-5 w-5" />
                        </Button>
                        {isMenuOpen && (
                            <div className="absolute top-full end-0 mt-2 w-56 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 py-2 animate-in fade-in zoom-in-95 overflow-hidden">
                                <button onClick={() => { onEditSettings(instance); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors outline-none focus-visible:bg-muted">
                                    <SettingsIcon className="h-4 w-4 text-muted-foreground"/> {t('hub.instanceCard.menu.settings')}
                                </button>
                                <button onClick={() => { onViewLogs(instance); setIsMenuOpen(false); }} className={`w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors outline-none focus-visible:bg-muted ${isLogViewerOpen ? 'bg-primary/10 text-primary' : 'text-foreground'}`}>
                                    <TerminalIcon className={`h-4 w-4 ${isLogViewerOpen ? 'text-primary' : 'text-muted-foreground'}`}/> {t('hub.instanceCard.menu.viewLogs')}
                                </button>
                                <div className="my-2 h-px bg-border/50 mx-3"></div>
                                <button onClick={() => { onDelete(instance); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors outline-none focus-visible:bg-destructive/10">
                                    <TrashIcon className="h-4 w-4"/> {t('hub.instanceCard.menu.delete')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </CardContent>
        </Card>
    );
};
