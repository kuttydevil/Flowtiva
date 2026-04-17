
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WhatsAppInstance, WhatsAppInstanceStatus } from '../../../types';
import { Card, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Switch } from '../../ui/Switch';
import { useTranslation } from '../../../contexts/LanguageContext';
import { cn } from '../../../lib/utils';
import { Portal } from '../../ui/Portal';

// --- ICONS ---
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226l.55-.22a2.25 2.25 0 0 1 2.97 1.583l.22.549a2.25 2.25 0 0 0 1.956 1.956l.55.22a2.25 2.25 0 0 1 1.583 2.97l-.22.549a2.25 2.25 0 0 0 1.956 1.956l.549.22a2.25 2.25 0 0 1-1.226 1.11l-.22.55a2.25 2.25 0 0 1-2.97-1.583l-.22-.549a2.25 2.25 0 0 0-1.956-1.956l-.549-.22a2.25 2.25 0 0 1-1.583-2.97l.22-.55a2.25 2.25 0 0 0-1.956-1.956l-.55-.22a2.25 2.25 0 0 1-1.11-1.226z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const TerminalIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>;
const EllipsisVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /></svg>;

const HEARTBEAT_THRESHOLD_SECONDS = 90;

const StatusIndicator: React.FC<{ status: WhatsAppInstanceStatus }> = ({ status }) => {
    const { t } = useTranslation();
    const styles: Record<WhatsAppInstanceStatus, { dot: string; text: string; title: string; glow?: string }> = {
        [WhatsAppInstanceStatus.Pending]: { dot: 'bg-zinc-400', text: 'text-zinc-400', title: t('hub.instanceCard.tooltips.pending') },
        [WhatsAppInstanceStatus.Linking]: { dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400', title: t('hub.instanceCard.tooltips.linking') },
        [WhatsAppInstanceStatus.Running]: { dot: 'bg-status-green', text: 'text-status-green', title: t('hub.instanceCard.tooltips.running'), glow: 'shadow-[0_0_12px_rgba(34,197,94,0.4)]' },
        [WhatsAppInstanceStatus.Inactive]: { dot: 'bg-zinc-400', text: 'text-zinc-400', title: t('hub.instanceCard.tooltips.inactive') },
        [WhatsAppInstanceStatus.Failed]: { dot: 'bg-status-red', text: 'text-status-red', title: t('hub.instanceCard.tooltips.failed') },
        [WhatsAppInstanceStatus.Stopped]: { dot: 'bg-status-red', text: 'text-status-red', title: t('hub.instanceCard.tooltips.stopped') },
    };
    const currentStyle = styles[status] || styles[WhatsAppInstanceStatus.Inactive];
    const statusKey = status ? status.toLowerCase() : 'unknown';
    const statusLabel = t(`hub.instanceCard.status.${statusKey}`);

    return (
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-background rounded-full border border-border/50 shadow-sm" title={currentStyle.title}>
            <div className={cn("w-2 h-2 rounded-full", currentStyle.dot, currentStyle.glow)} />
            <span className={cn("text-[13px] font-bold tracking-tight", currentStyle.text)}>{statusLabel}</span>
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

    // NEW: Log instance errors to developer console for easier debugging
    useEffect(() => {
        if (instance.status === WhatsAppInstanceStatus.Failed && instance.last_error) {
            console.error(
                `%c[Nexus Instance Error] %c+974 ${instance.phoneNumber}`, 
                "color: #ef4444; font-weight: bold; font-size: 11px;",
                "color: #71717a; font-family: monospace; font-size: 11px;",
                "\n\n" + instance.last_error
            );
        }
    }, [instance.status, instance.last_error, instance.phoneNumber]);

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
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="hover:border-primary/40 transition-all duration-300 group bg-card/50 backdrop-blur-sm shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] relative overflow-visible rounded-[28px] border border-border/50"
        >
            <CardContent className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black text-2xl shadow-inner ring-1 ring-primary/20 transition-transform group-hover:scale-105 duration-300">
                            {String(instance?.name || 'I').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground text-lg tracking-tight group-hover:text-primary transition-colors">{instance.name || 'Instance'}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[13px] text-muted-foreground/80 font-mono tracking-tighter" dir="ltr">+974 {instance.phoneNumber}</p>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">{instance.agentType || 'Personal'}</span>
                            </div>
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

                {/* Body */}
                <div className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl border border-border/40 shadow-inner group/body transition-all">
                    <StatusIndicator status={instance.status} />
                    
                    <AnimatePresence>
                        {instance.status === 'running' && instance.isActive && (
                            <motion.div 
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="relative group w-fit"
                            >
                                <div className="flex items-center gap-2.5 px-3 py-1.5 bg-background rounded-full border border-border/50 shadow-sm transition-all hover:border-primary/30">
                                    <span className={cn(
                                        "relative flex h-2 w-2",
                                        !isHealthy && "animate-pulse"
                                    )}>
                                        <span className={cn(
                                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                            isHealthy ? "bg-status-green" : "bg-status-red"
                                        )}></span>
                                        <span className={cn(
                                            "relative inline-flex rounded-full h-2 w-2",
                                            isHealthy ? "bg-status-green" : "bg-status-red"
                                        )}></span>
                                    </span>
                                    <span className={cn("font-bold text-[12px] tracking-tight", isHealthy ? 'text-status-green' : 'text-status-red')}>
                                        {isHealthy ? t('hub.instanceCard.tooltips.healthy') : t('hub.instanceCard.tooltips.unresponsive')}
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                <AnimatePresence>
                    {instance.status === 'failed' && instance.last_error && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 bg-destructive/[0.02] rounded-[24px] border border-destructive/10 shadow-sm transition-all hover:bg-destructive/[0.04] group/diag">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5 text-destructive">
                                        <div className="p-2 bg-destructive/10 rounded-xl group-hover/diag:scale-110 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                                        </div>
                                        <span className="font-bold text-[13px] tracking-tight uppercase opacity-90">{t('hub.instanceCard.tooltips.chromeError')}</span>
                                    </div>
                                    <div className="px-2 py-0.5 rounded-full bg-destructive/10 text-[9px] font-black uppercase tracking-tighter text-destructive">CRITICAL_FAULT</div>
                                </div>
                                
                                <div className="relative group/error">
                                    <div className="font-mono text-[11px] leading-[1.6] break-words bg-[#08080a] text-zinc-300 p-4 rounded-[18px] border border-white/5 shadow-inner overflow-hidden max-h-48 overflow-y-auto scrollbar-hide">
                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5 opacity-40">
                                            <div className="w-2 h-2 rounded-full bg-destructive/40" />
                                            <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
                                            <div className="w-2 h-2 rounded-full bg-status-green/40" />
                                            <span className="text-[9px] ml-1 font-black tracking-widest uppercase">nexus_cli_trace</span>
                                        </div>
                                        <span className="text-destructive/80 font-bold select-none mr-2">$</span>
                                        <span className="whitespace-pre-wrap">{instance.last_error}</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between px-1">
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                                            {t('hub.instanceCard.tooltips.diagnosticInfo')}
                                        </span>
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(instance.last_error || '');
                                            }}
                                            className="text-[10px] font-bold text-destructive hover:text-white hover:bg-destructive transition-all bg-destructive/5 px-3 py-1.5 rounded-xl border border-destructive/20 active:scale-95"
                                        >
                                            Copy Trace
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border/30">
                    <div>{getPrimaryAction()}</div>
                    <div className="relative" ref={menuRef}>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsMenuOpen(prev => !prev)} 
                            className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-2xl transition-all active:scale-90"
                        >
                            <EllipsisVerticalIcon className={cn("h-5 w-5 transition-transform duration-300", isMenuOpen && "rotate-90")} />
                        </Button>
                        <AnimatePresence>
                            {isMenuOpen && (
                                <Portal>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="fixed mt-2 w-56 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] z-[9999] py-2.5 overflow-hidden"
                                        style={{
                                            top: menuRef.current?.getBoundingClientRect().bottom,
                                            left: (menuRef.current?.getBoundingClientRect().right || 0) - 224
                                        }}
                                    >
                                        <button onClick={() => { onEditSettings(instance); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors outline-none">
                                            <div className="p-1.5 bg-muted rounded-lg text-muted-foreground"><SettingsIcon className="h-3.5 w-3.5"/></div>
                                            {t('hub.instanceCard.menu.settings')}
                                        </button>
                                        <button onClick={() => { onViewLogs(instance); setIsMenuOpen(false); }} className={cn(
                                            "w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors outline-none",
                                            isLogViewerOpen ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                                        )}>
                                            <div className={cn("p-1.5 rounded-lg", isLogViewerOpen ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                                                <TerminalIcon className="h-3.5 w-3.5"/> 
                                            </div>
                                            {t('hub.instanceCard.menu.viewLogs')}
                                        </button>
                                        <div className="my-2 h-px bg-border/20 mx-4"></div>
                                        <button onClick={() => { onDelete(instance); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors outline-none">
                                            <div className="p-1.5 bg-destructive/10 rounded-lg"><TrashIcon className="h-3.5 w-3.5"/></div>
                                            {t('hub.instanceCard.menu.delete')}
                                        </button>
                                    </motion.div>
                                </Portal>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            </CardContent>
        </motion.div>
    );
};
