
import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { WhatsAppContact } from '../../types';
import { Skeleton } from '../ui/Skeleton';
import { useTranslation } from '../../contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STAGES = ['New', 'Contacted', 'Proposal', 'Won', 'Lost'];
const stageColors: { [key: string]: string } = {
    'New': '#3b82f6', // blue-500
    'Contacted': '#8b5cf6', // violet-500
    'Proposal': '#f59e0b', // amber-500
    'Won': '#10b981', // emerald-500
    'Lost': '#ef4444', // red-500
};

interface LeadsPipelineChartProps {
    contacts: WhatsAppContact[];
    isLoading: boolean;
}

export const LeadsPipelineChart: React.FC<LeadsPipelineChartProps> = ({ contacts, isLoading }) => {
    const { t } = useTranslation();

    const chartData = useMemo(() => {
        return STAGES.map(stage => {
            const count = contacts.filter(c => c.crm_stage === stage).length;
            return {
                name: t(`crm.stages.${stage.toLowerCase()}`),
                originalName: stage,
                count,
                color: stageColors[stage] || '#9ca3af',
            };
        });
    }, [contacts, t]);

    if (isLoading) {
        return (
            <Card className="bg-card/50 backdrop-blur-md border-border/50 shadow-sm overflow-hidden rounded-[24px]">
                <CardHeader className="pb-4 bg-muted/20 border-b border-border/50">
                    <CardTitle className="text-lg font-bold tracking-tight text-foreground">{t('crm.pipelineChart.title')}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Skeleton className="h-[300px] w-full rounded-2xl" />
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="bg-card/50 backdrop-blur-md border-border/50 shadow-sm overflow-hidden rounded-[24px] group">
            <CardHeader className="pb-4 bg-muted/20 border-b border-border/50">
                <CardTitle className="text-lg font-bold tracking-tight text-foreground">{t('crm.pipelineChart.title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                {contacts.length === 0 ? (
                    <div className="h-[300px] flex flex-col items-center justify-center bg-muted/20 rounded-[20px] border border-dashed border-border/60">
                        <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center mb-3">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-muted-foreground/50">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V19.875c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                            </svg>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">{t('crm.pipelineChart.noData')}</p>
                    </div>
                ) : (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }} 
                                    className="text-muted-foreground/70"
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }} 
                                    className="text-muted-foreground/70"
                                    allowDecimals={false}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'currentColor', opacity: 0.03 }}
                                    contentStyle={{ 
                                        backgroundColor: 'hsl(var(--popover))', 
                                        borderColor: 'hsl(var(--border) / 0.5)',
                                        borderRadius: '1rem',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                                        color: 'hsl(var(--popover-foreground))',
                                        padding: '12px 16px',
                                        borderWidth: '1px'
                                    }}
                                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 700, fontSize: '12px' }}
                                    labelStyle={{ fontWeight: 800, color: 'hsl(var(--primary))', marginBottom: '4px', fontSize: '13px' }}
                                    formatter={(value: any) => [value, t('crm.pipelineChart.tooltip.contacts') || 'Contacts']}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={40}>
                                    {chartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color} 
                                            className="transition-all duration-500 hover:brightness-110"
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
