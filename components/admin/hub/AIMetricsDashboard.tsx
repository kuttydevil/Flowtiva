/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { firebaseService } from '../../../services/firebaseService';
import { AITelemetryStats, AIReport, AIAlert } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Skeleton } from '../../ui/Skeleton';
import { Button } from '../../ui/Button';
import { useAI } from '../../../contexts/AIContext';

// --- ICONS ---
const ZapIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>;
const DatabaseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5H6A2.25 2.25 0 0 1 3.75 8.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h12a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18v-2.25Z" /></svg>;
const AlertTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>;
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-4.991-2.691v4.99" /></svg>;
const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;


const StatDisplayCard = ({ title, value, icon, unit, isLoading, colorClass = 'text-foreground' }: { title: string, value: string | number, icon: React.ReactNode, unit?: string, isLoading: boolean, colorClass?: string }) => (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
        <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">{icon} {title}</p>
            {isLoading ? <Skeleton className="h-9 w-24 mt-3 rounded-lg" /> : (
                <p className={`text-3xl font-bold mt-2 tracking-tight ${colorClass}`}>
                    {value}
                    {unit && <span className="text-lg font-medium text-muted-foreground ms-1">{unit}</span>}
                </p>
            )}
        </CardContent>
    </Card>
);

export const AIMetricsDashboard: React.FC = () => {
    const [stats, setStats] = useState<AITelemetryStats | null>(null);
    const [reports, setReports] = useState<AIReport[]>([]);
    const [alerts, setAlerts] = useState<AIAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { aiHealth } = useAI();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [statsData, reportsData, alertsData] = await Promise.all([
                firebaseService.getAITelemetryStats(),
                firebaseService.getAIReports(),
                firebaseService.getAIAlerts()
            ]);
            setStats(statsData);
            setReports(reportsData || []);
            setAlerts(alertsData as AIAlert[] || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const healthConfig = {
        normal: { text: 'Normal', color: 'text-status-green', icon: '✅' },
        degraded: { text: 'Degraded', color: 'text-status-yellow', icon: '⚠️' },
        error: { text: 'Error', color: 'text-status-red', icon: '🔥' },
    };

    const errorRateColor = stats && stats.error_rate > 5 ? 'text-status-red' : 'text-brand-text-primary';
    const cacheHitRateColor = stats && stats.cache_hit_rate > 30 ? 'text-status-green' : 'text-brand-text-primary';

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Metrics & Governance</h1>
                    <p className="mt-1 text-muted-foreground">Real-time performance, health, and usage analytics for Gemini AI features.</p>
                </div>
                <Button variant="outline" onClick={fetchData} disabled={isLoading} className="shadow-sm">
                    <RefreshIcon className={`w-4 h-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh Stats
                </Button>
            </header>
            
            {error && <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20">{error}</div>}

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className={`flex items-center gap-2 text-lg font-semibold tracking-tight ${healthConfig[aiHealth].color}`}>{healthConfig[aiHealth].icon} AI System Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                           {aiHealth === 'normal' ? 'All systems are operating normally.' : 'Performance anomalies have been detected.'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold tracking-tight">Recent System Alerts</CardTitle>
                    </CardHeader>
                     <CardContent>
                        {isLoading ? <Skeleton className="h-24 rounded-xl"/> : alerts.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No recent alerts.</p>
                        ) : (
                            <ul className="space-y-3 text-sm">
                                {alerts.map(a => (
                                    <li key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                                        <AlertTriangleIcon className="w-4 h-4 mt-0.5 text-yellow-500 flex-shrink-0"/>
                                        <div>
                                            <p className="font-semibold text-foreground">{a.alert_type}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{a.message} - <span className="italic">{new Date(a.created_at).toLocaleString()}</span></p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatDisplayCard title="Total Calls (30d)" value={(stats?.total_calls ?? 0).toLocaleString()} icon={<ZapIcon className="w-4 h-4"/>} isLoading={isLoading} />
                <StatDisplayCard title="Cache Hit Rate" value={(stats?.cache_hit_rate ?? 0).toFixed(1)} unit="%" icon={<DatabaseIcon className="w-4 h-4"/>} isLoading={isLoading} colorClass={cacheHitRateColor} />
                <StatDisplayCard title="Error Rate" value={(stats?.error_rate ?? 0).toFixed(1)} unit="%" icon={<AlertTriangleIcon className="w-4 h-4"/>} isLoading={isLoading} colorClass={errorRateColor} />
                <StatDisplayCard title="Avg. Latency" value={(stats?.avg_latency ?? 0).toFixed(0)} unit="ms" icon={<ClockIcon className="w-4 h-4"/>} isLoading={isLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold tracking-tight">Calls by Action (30d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-48 rounded-xl" /> : !stats || !stats.calls_by_action || stats.calls_by_action.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No AI actions have been logged yet.</p>
                        ) : (
                             <ul className="space-y-4">
                                {stats.calls_by_action.map(action => {
                                    const percentage = stats.total_calls > 0 ? (action.count / stats.total_calls) * 100 : 0;
                                    return (
                                        <li key={action.action_key}>
                                            <div className="flex justify-between items-center mb-1.5 text-sm">
                                                <span className="font-medium text-foreground">{action.action_key}</span>
                                                <span className="font-semibold text-muted-foreground">{action.count.toLocaleString()} calls</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/50">
                                                <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} title={`${percentage.toFixed(1)}% of total`}></div>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
                     <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold tracking-tight">AI Governance Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-32 rounded-xl" /> : reports.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No automated reports have been generated yet.</p>
                        ) : (
                            <ul className="space-y-2">
                                {reports.slice(0, 5).map(report => (
                                    <li key={report.id}>
                                        <button className="w-full text-left p-3 rounded-xl flex items-center gap-3 hover:bg-muted/50 transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent hover:border-border/50">
                                            <div className="p-2 bg-muted rounded-lg group-hover:bg-background transition-colors">
                                                <DocumentTextIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{String(report.period || '').charAt(0).toUpperCase() + String(report.period || '').slice(1)} Report - {new Date(report.created_at).toLocaleDateString()}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">Click to view summary</p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
// FIX: Add default export for compatibility with React.lazy
export default AIMetricsDashboard;
