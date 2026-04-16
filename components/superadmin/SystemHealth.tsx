
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { SystemLog } from '../../types';

const ShieldExclamationIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>;
const levelColors: { [key in SystemLog['level']]: string } = { ERROR: 'text-red-400', FATAL: 'text-red-400 font-bold bg-red-500/10' };

const LogEntry: React.FC<{ log: SystemLog }> = React.memo(({ log }) => {
    const timestamp = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return (
        <div className="flex gap-3"><span className="text-gray-500">{timestamp}</span><span className={`flex-shrink-0 font-bold ${levelColors[log.level]}`}>{log.level.padEnd(5)}</span><p className={`flex-1 break-words whitespace-pre-wrap ${levelColors[log.level]}`}>[+{log.phone_number}] {log.message}</p></div>
    );
});

interface SystemHealthProps { logs: SystemLog[]; }
export const SystemHealth: React.FC<SystemHealthProps> = ({ logs }) => {
    return (
        <div className="animate-in fade-in-0">
             <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                    <ShieldExclamationIcon className="h-6 w-6 text-red-500"/>
                    <CardTitle>System Error Logs</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="bg-[#0f172a] border border-brand-border text-white rounded-b-lg h-96 flex flex-col">
                        <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2">
                            {logs.length === 0 
                                ? <p className="text-gray-500">No system errors recorded recently. All clear!</p> 
                                : logs.map(log => <LogEntry key={log.id} log={log} />)
                            }
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
