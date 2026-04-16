
import React, { useState, useEffect, useRef } from 'react';
import { WhatsAppInstance, WhatsAppInstanceStatus } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';

// --- ICONS ---
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226l.55-.22a2.25 2.25 0 0 1 2.97 1.583l.22.549a2.25 2.25 0 0 0 1.956 1.956l.55.22a2.25 2.25 0 0 1 1.583 2.97l-.22.549a2.25 2.25 0 0 0 1.956 1.956l.549.22a2.25 2.25 0 0 1-1.226 1.11l-.22.55a2.25 2.25 0 0 1-2.97-1.583l-.22-.549a2.25 2.25 0 0 0-1.956-1.956l-.549-.22a2.25 2.25 0 0 1-1.583-2.97l.22-.55a2.25 2.25 0 0 0-1.956-1.956l-.55-.22a2.25 2.25 0 0 1-1.11-1.226z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const TerminalIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>;
const EllipsisVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /></svg>;

const HEARTBEAT_THRESHOLD_SECONDS = 90;

const timeAgo = (isoTimestamp: string | null): string => {
    if (!isoTimestamp) return "never";
    const date = new Date(isoTimestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds} seconds ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return "a minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "an hour ago";
    if (hours < 24) return `${hours} hours ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return "a day ago";
    return `${days} days ago`;
}

const StatusIndicator: React.FC<{ status: WhatsAppInstanceStatus }> = ({ status }) => {
    const styles: Record<WhatsAppInstanceStatus, { dot: string; text: string; title: string }> = {
        [WhatsAppInstanceStatus.Pending]: { dot: 'bg-gray-400', text: 'text-gray-400', title: 'Worker is waiting to be started by the orchestrator.' },
        [WhatsAppInstanceStatus.Linking]: { dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400', title: 'Worker is running and waiting for the user to link their phone.' },
        [WhatsAppInstanceStatus.Running]: { dot: 'bg-status-green', text: 'text-status-green', title: 'Instance is connected and actively processing messages.' },
        [WhatsAppInstanceStatus.Inactive]: { dot: 'bg-gray-400', text: 'text-gray-400', title: "Instance is paused and not processing messages. Toggle 'Active' to restart." },
        [WhatsAppInstanceStatus.Failed]: { dot: 'bg-status-red', text: 'text-status-red', title: 'The worker process crashed. Check logs for details.' },
        [WhatsAppInstanceStatus.Stopped]: { dot: 'bg-status-red', text: 'text-status-red', title: 'The worker process was stopped.' },
    };
    const currentStyle = styles[status];
    return (
        <div className="flex items-center gap-2" title={currentStyle.title}>
            <div className={`w-2 h-2 rounded-full ${currentStyle.dot}`} />
            <span className={`text-sm font-semibold capitalize ${currentStyle.text}`}>{status}</span>
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
            setLastCheckText(timeAgo(instance.last_heartbeat));
        };
        
        updateHealth(); // Initial check
        const interval = setInterval(updateHealth, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [instance.last_heartbeat]);

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
        const buttonText =
            instance.status === WhatsAppInstanceStatus.Running || instance.status === WhatsAppInstanceStatus.Inactive ? "View Chats" :
            instance.status === WhatsAppInstanceStatus.Pending || instance.status === WhatsAppInstanceStatus.Linking ? "Continue Linking" :
            "View Error Logs";

        const variant = instance.status === WhatsAppInstanceStatus.Failed ? "destructive" : "outline";

        return <Button variant={variant} size="sm" onClick={() => onClick(instance)}>{buttonText}</Button>;
    };

    return (
        <Card>
            <CardContent className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg text-brand-text-primary">+974 {instance.phoneNumber}</p>
                        <StatusIndicator status={instance.status} />
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={instance.isActive}
                            onCheckedChange={() => onToggle(instance)}
                            label="Active"
                            aria-label={`Toggle instance ${instance.phoneNumber}`}
                        />
                    </div>
                </div>

                {/* Body - UPDATED */}
                <div>
                    {instance.status === 'running' && instance.isActive && (
                        <div className="relative group w-fit">
                            <div className="flex items-center gap-2 text-sm cursor-help">
                                <span className={`w-2.5 h-2.5 rounded-full ${isHealthy ? 'bg-status-green' : 'bg-status-red animate-pulse'}`} />
                                <span className={`font-semibold ${isHealthy ? 'text-status-green' : 'text-status-red'}`}>
                                    {isHealthy ? 'Healthy' : 'Unresponsive'}
                                </span>
                            </div>
                             {instance.worker_hostname && instance.worker_pid && (
                                <p className="text-xs text-brand-text-secondary mt-1 ms-4">
                                    Running on {instance.worker_hostname} (PID: {instance.worker_pid})
                                </p>
                            )}
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-0 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                Last check: {lastCheckText}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
                            </div>
                        </div>
                    )}
                    {instance.status === 'failed' && instance.last_error && (
                         <div className="mt-2 p-2 bg-status-red/10 rounded-md text-xs text-status-red">
                            <strong>Error:</strong> {instance.last_error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-brand-border">
                    <div>{getPrimaryAction()}</div>
                    <div className="relative" ref={menuRef}>
                        <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(prev => !prev)} className="h-9 w-9">
                            <EllipsisVerticalIcon className="h-5 w-5" />
                        </Button>
                        {isMenuOpen && (
                            <div className="absolute top-full end-0 mt-1 w-48 bg-brand-primary border border-brand-border rounded-lg shadow-lg z-10 py-1">
                                <button onClick={() => { onEditSettings(instance); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-brand-text-primary hover:bg-brand-secondary">
                                    <SettingsIcon className="h-4 w-4 text-brand-text-secondary"/> Settings
                                </button>
                                <button onClick={() => { onViewLogs(instance); setIsMenuOpen(false); }} className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-brand-secondary ${isLogViewerOpen ? 'bg-brand-accent/20 text-brand-accent' : 'text-brand-text-primary'}`}>
                                    <TerminalIcon className="h-4 w-4"/> View Logs
                                </button>
                                <div className="my-1 h-px bg-brand-border"></div>
                                <button onClick={() => { onDelete(instance); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-status-red hover:bg-status-red/10">
                                    <TrashIcon className="h-4 w-4"/> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </CardContent>
        </Card>
    );
};
