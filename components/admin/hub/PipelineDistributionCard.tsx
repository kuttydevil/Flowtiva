
import React, { useMemo } from 'react';
import { WhatsAppContact } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { useTranslation } from '../../../contexts/LanguageContext';

const STAGES = ['New', 'Contacted', 'Proposal', 'Won', 'Lost'];
const stageColors: { [key: string]: string } = {
    'New': 'bg-blue-500',
    'Contacted': 'bg-purple-500',
    'Proposal': 'bg-yellow-500',
    'Won': 'bg-green-500',
    'Lost': 'bg-red-500',
};

interface PipelineDistributionCardProps {
    contacts: WhatsAppContact[];
}

export const PipelineDistributionCard: React.FC<PipelineDistributionCardProps> = ({ contacts }) => {
    const { t } = useTranslation();
    
    const distribution = useMemo(() => {
        const total = contacts.length;
        if (total === 0) {
             return STAGES.map(stage => ({
                name: stage,
                translatedName: t(`crm.stages.${stage.toLowerCase()}`),
                count: 0,
                percentage: 0,
                color: stageColors[stage] || 'bg-gray-400',
            }));
        }
        return STAGES.map(stage => {
            const count = contacts.filter(c => c.crm_stage === stage).length;
            return {
                name: stage,
                translatedName: t(`crm.stages.${stage.toLowerCase()}`),
                count,
                percentage: total > 0 ? (count / total) * 100 : 0,
                color: stageColors[stage] || 'bg-gray-400',
            };
        });
    }, [contacts, t]);

    return (
        <Card className="bg-card/50 backdrop-blur-md border-border/50 shadow-sm overflow-hidden rounded-[24px] group relative z-0">
            <CardHeader className="pb-4 bg-muted/20 border-b border-border/50">
                <CardTitle className="text-lg font-bold tracking-tight text-foreground">{t('hub.pipelineDistribution.title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="w-full h-4 bg-muted/50 rounded-full flex overflow-hidden mb-8 shadow-inner ring-1 ring-inset ring-black/5 p-0.5">
                    {distribution.map(item => (
                        item.percentage > 0 && (
                            <div
                                key={item.name}
                                className={`${item.color} transition-all duration-700 hover:brightness-110 first:rounded-l-full last:rounded-r-full relative group/bar`}
                                style={{ width: `${item.percentage}%` }}
                            >
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                    {item.translatedName}: {item.count}
                                </div>
                            </div>
                        )
                    ))}
                     {contacts.length === 0 && <div className="w-full h-full bg-muted/50 rounded-full" />}
                </div>
                <ul className="space-y-4">
                    {distribution.map(item => (
                         <li key={item.name} className="flex justify-between items-center group/item">
                            <div className="flex items-center gap-3">
                                <div className={`h-3 w-3 rounded-full ${item.color} shadow-sm ring-2 ring-background group-hover/item:scale-125 transition-transform duration-300`} />
                                <span className="text-foreground font-bold text-sm group-hover/item:text-primary transition-colors">{item.translatedName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-foreground">{item.count}</span>
                                <div className="w-12 text-right">
                                    <span className="text-[11px] text-muted-foreground font-black bg-muted/50 px-2 py-0.5 rounded-full border border-border/50">
                                        {item.percentage.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};
