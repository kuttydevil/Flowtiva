

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { AllInstances } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../services/supabaseService';

const ShieldExclamationIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>;
const DonutChart = ({ data }: { data: { name: string; count: number }[] }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const colors: {[key: string]: string} = { 'running': '#10b981', 'linking': '#3b82f6', 'inactive': '#6b7280', 'failed': '#ef4444', 'pending': '#f59e0b' };
    return (
        <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-brand-secondary"></div>
            <ul className="space-y-2">
                {data.map((item, i) => (
                    <li key={item.name} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[item.name] || '#9ca3af' }}></span>
                            <span className="capitalize">{item.name}</span>
                        </div>
                        <span className="font-semibold ml-4">{item.count} <span className="text-xs font-normal text-brand-text-secondary">({total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%)</span></span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
const formatTimeAgo = (dateString: string | null) => { if (!dateString) return 'N/A'; const date = new Date(dateString); const now = new Date(); const seconds = Math.floor((now.getTime() - date.getTime()) / 1000); if (seconds < 60) return 'Just now'; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; const days = Math.floor(hours / 24); return `${days}d ago`; };
const HEARTBEAT_THRESHOLD_SECONDS = 90;

interface InstanceManagementProps { instances: AllInstances[]; }

export const InstanceManagement: React.FC<InstanceManagementProps> = ({ instances }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const { addToast } = useToast();

    const filteredInstances = useMemo(() => {
        return instances
            .filter(inst => statusFilter === 'all' ? true : inst.status === statusFilter)
            .filter(inst => inst.phone_number.includes(searchTerm) || inst.owner_email?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [instances, searchTerm, statusFilter]);
    
    const statusCounts: Record<string, number> = useMemo(() => {
        return instances.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [instances]);

    const chartData = Object.entries(statusCounts).map(([name, count]) => ({ name, count }));

    const handleForceStop = async (instanceId: string) => { if (!window.confirm("Are you sure? This can interrupt tasks.")) return; try { await supabase.forceStopInstance(instanceId); addToast(`Stop command sent to ${instanceId}.`, { type: 'info' }); } catch (e: any) { addToast(e.message, { type: 'error' }); } };

    return (
        <div className="space-y-6 animate-in fade-in-0">
            <Card>
                <CardHeader><CardTitle>Instance Status Distribution</CardTitle></CardHeader>
                <CardContent>
                    <DonutChart data={chartData} />
                </CardContent>
            </Card>
            <Card>
                 <div className="p-4 border-b border-brand-border flex items-center justify-between gap-4">
                    <Input 
                        placeholder="Search by phone or owner email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-brand-border bg-brand-primary px-3 text-sm">
                        <option value="all">All Statuses</option>
                        {Object.keys(statusCounts).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                </div>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-brand-text-secondary uppercase bg-brand-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Instance</th>
                                    <th scope="col" className="px-6 py-3">Owner</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3">Worker</th>
                                    <th scope="col" className="px-6 py-3">Last Heartbeat</th>
                                    <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-brand-border">
                                {filteredInstances.map(instance => {
                                    const isHealthy = instance.last_heartbeat ? (new Date().getTime() - new Date(instance.last_heartbeat).getTime()) / 1000 < HEARTBEAT_THRESHOLD_SECONDS : false;
                                    return (
                                        <tr key={instance.id} className="hover:bg-brand-secondary">
                                            <td className="px-6 py-4 font-medium text-brand-text-primary">+974{instance.phone_number}</td>
                                            <td className="px-6 py-4 text-xs truncate max-w-xs">{instance.owner_email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${instance.status === 'running' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>{instance.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono">{instance.worker_hostname}:{instance.worker_pid}</td>
                                            <td className="px-6 py-4 text-xs">
                                                <div className="flex items-center gap-2">
                                                    {instance.last_heartbeat ? <>
                                                        <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} title={isHealthy ? 'Healthy' : 'Unresponsive'}></div>
                                                        <span>{formatTimeAgo(instance.last_heartbeat)}</span>
                                                    </> : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleForceStop(instance.id)} title="Force Stop Instance">
                                                    <ShieldExclamationIcon className="h-4 w-4 text-red-500"/>
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};