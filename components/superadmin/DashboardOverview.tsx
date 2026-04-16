
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { SuperadminDashboardData, TimeSeriesDataPoint } from '../../types';

// --- ICONS ---
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 18.75a9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
const ServerIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z" /></svg>;
const MessageIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.068.158 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l3.66-4.73c.26-.389.687-.634 1.153-.67 1.09-.086 2.17-.206 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.344 48.344 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>;

const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-2.5 bg-brand-accent/10 rounded-lg text-brand-accent">{icon}</div><div><p className="text-sm font-medium text-brand-text-secondary">{title}</p><p className="text-2xl font-bold text-brand-text-primary">{typeof value === 'number' ? value.toLocaleString() : value}</p></div></CardContent></Card>
);

const TimeSeriesChart = ({ title, data }: { title: string; data: TimeSeriesDataPoint[] }) => {
    const maxCount = Math.max(...data.map(d => d.count), 0);
    const yAxisMax = maxCount > 0 ? Math.ceil(maxCount / 5) * 5 : 5;
    const yAxisLabels = [0, yAxisMax / 2, yAxisMax];
    
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (d.count / yAxisMax) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="h-64 relative">
                 <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute top-0 left-0">
                    {yAxisLabels.map((label, i) => (
                        <line key={i} x1="0" y1={`${100 - (label / yAxisMax) * 100}%`} x2="100%" y2={`${100 - (label / yAxisMax) * 100}%`} stroke="hsl(var(--border))" strokeWidth="0.5" />
                    ))}
                    <polyline fill="none" stroke="hsl(var(--accent))" strokeWidth="2" points={points} />
                </svg>
                 <div className="absolute top-0 left-0 h-full flex flex-col justify-between py-2 text-xs text-brand-text-secondary">
                    {yAxisLabels.map(label => <span key={label}>{label}</span>).reverse()}
                </div>
            </CardContent>
        </Card>
    );
};

const DonutChart = ({ title, data }: { title: string; data: { name: string; count: number }[] }) => {
    // Basic donut chart logic, simplified
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const colors = ['#0d9488', '#059669', '#047857']; // Teal shades
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
                {/* Visual representation is complex with SVG, so we'll show a list */}
                <ul className="space-y-2">
                    {data.map((item, i) => (
                        <li key={item.name} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></span>
                                <span>{item.name}</span>
                            </div>
                            <span className="font-semibold">{item.count} <span className="text-xs font-normal text-brand-text-secondary">({total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%)</span></span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};


interface DashboardOverviewProps { data: SuperadminDashboardData | null; }
export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ data }) => {
    if (!data) return <div>Loading overview...</div>;

    const { stats, user_growth, instance_growth, message_volume, revenue_overview, plan_distribution } = data;
    
    return (
        <div className="space-y-6 animate-in fade-in-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={stats.total_users} icon={<UsersIcon className="h-6 w-6"/>} />
                <StatCard title="Total Instances" value={stats.total_instances} icon={<ServerIcon className="h-6 w-6"/>} />
                <StatCard title="Active Instances" value={stats.active_instances} icon={<ServerIcon className="h-6 w-6"/>} />
                <StatCard title="Messages (24h)" value={stats.messages_last_24h} icon={<MessageIcon className="h-6 w-6"/>} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2"><TimeSeriesChart title="User Growth (Last 30 Days)" data={user_growth} /></div>
                <div><DonutChart title="Plan Distribution" data={plan_distribution} /></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TimeSeriesChart title="New Instances (30 Days)" data={instance_growth} />
                <TimeSeriesChart title="Message Volume (30 Days)" data={message_volume} />
                <Card>
                    <CardHeader><CardTitle>Revenue Overview (Simulated)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-brand-text-secondary">Monthly Recurring Revenue</p>
                            <p className="text-3xl font-bold text-status-green">QAR {revenue_overview.mrr.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between text-sm">
                            <div>
                                <p className="text-brand-text-secondary">New Subs (30d)</p>
                                <p className="font-semibold">{revenue_overview.new_subs_30d}</p>
                            </div>
                            <div>
                                <p className="text-brand-text-secondary">Churn Rate (30d)</p>
                                <p className="font-semibold">{revenue_overview.churn_rate_30d.toFixed(1)}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
