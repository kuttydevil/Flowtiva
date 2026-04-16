import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseService';
import { WhatsAppInstance, InstanceLog } from '../../types';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const TerminalIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
);

const levelColors: { [key in InstanceLog['level']]: string } = {
    INFO: 'text-blue-400/90',
    WARN: 'text-amber-400/90',
    ERROR: 'text-rose-500/90',
    FATAL: 'text-rose-600 font-bold bg-rose-500/10 px-1 rounded',
    DEBUG: 'text-slate-500',
};

const LogEntry: React.FC<{ log: InstanceLog }> = React.memo(({ log }) => {
    const timestamp = new Date(log.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    return (
        <div className="flex gap-4 group/log py-0.5 hover:bg-white/5 transition-colors rounded px-1 -mx-1">
            <span className="text-white/30 font-mono tabular-nums select-none">{timestamp}</span>
            <span className={`flex-shrink-0 font-black text-[10px] uppercase tracking-tighter w-10 ${levelColors[log.level]}`}>{log.level}</span>
            <p className={`flex-1 break-words whitespace-pre-wrap font-mono leading-relaxed ${levelColors[log.level]}`}>{log.message}</p>
        </div>
    );
});

interface InstanceLogViewerProps {
    instance: WhatsAppInstance | null;
}

export const InstanceLogViewer: React.FC<InstanceLogViewerProps> = ({ instance }) => {
    const [logs, setLogs] = useState<InstanceLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!instance) {
            setLogs([]);
            return;
        }

        setIsLoading(true);
        setLogs([]);

        // Subscribe to real-time updates first to prevent race conditions and ensure cleanup.
        const channel = supabase.subscribeToInstanceLogs(instance.id, (newLog) => {
            setLogs(prevLogs => {
                // Avoid adding duplicates that might come from the initial fetch.
                if (prevLogs.some(log => log.id === newLog.id)) {
                    return prevLogs;
                }
                return [...prevLogs, newLog];
            });
        });
        
        // Fetch historical logs after subscribing.
        const fetchHistoricalLogs = async () => {
            try {
                const historicalLogs = await supabase.getInstanceLogs(instance.id);
                setLogs(prevLogs => {
                    const existingIds = new Set(prevLogs.map(log => log.id));
                    const uniqueHistorical = historicalLogs.filter(log => !existingIds.has(log.id));
                    // Combine and sort by ID to ensure correct chronological order.
                    return [...uniqueHistorical, ...prevLogs].sort((a, b) => a.id - b.id);
                });
            } catch (error) {
                console.error("Failed to fetch historical logs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistoricalLogs();

        // Return the cleanup function to remove the channel subscription on unmount or instance change.
        return () => {
            supabase.removeChannel(channel);
        };
    }, [instance]);


    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <Card className="h-[450px] flex flex-col bg-[#0a0f1d] border-border/50 text-white shadow-2xl rounded-[24px] overflow-hidden ring-1 ring-white/5">
            <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5 mr-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <TerminalIcon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-bold text-sm tracking-tight text-white/90">System Logs {instance && <span className="text-primary ml-2 font-mono text-xs opacity-80">@{instance.phoneNumber}</span>}</h3>
                </div>
                {instance && (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-500/80">Live</span>
                    </div>
                )}
            </div>
            <div ref={logContainerRef} className="flex-1 p-6 font-mono text-[11px] overflow-y-auto space-y-2.5 selection:bg-primary/30 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {!instance ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                        <TerminalIcon className="h-12 w-12 mb-4" />
                        <p className="text-sm font-medium">Select an instance's "View Logs" to begin.</p>
                    </div>
                ) : isLoading ? (
                     <div className="space-y-3">
                        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-3 w-full bg-white/5 rounded-full" />)}
                    </div>
                ) : logs.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full opacity-40">
                        <div className="relative w-10 h-10 mb-4">
                            <div className="absolute inset-0 border-2 border-primary/20 rounded-full"></div>
                            <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-sm font-medium">Waiting for logs...</p>
                    </div>
                ) : (
                    logs.map(log => <LogEntry key={log.id} log={log} />)
                )}
            </div>
        </Card>
    );
};
