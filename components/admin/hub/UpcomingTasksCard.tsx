
import React, { useMemo } from 'react';
import { WhatsAppContact } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Skeleton } from '../../ui/Skeleton';
import { Avatar } from '../../ui/Avatar';
import { useTranslation } from '../../../contexts/LanguageContext';

const ClipboardListIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75c0-.231-.035-.454-.1-.664M6.75 7.5H18a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25-2.25H6.75A2.25 2.25 0 0 1 4.5 18.75V9.75A2.25 2.25 0 0 1 6.75 7.5Z" />
    </svg>
);

const getDueDateStatus = (dueDateStr: string | null, t: (key: string, replacements?: any) => string): { text: string; color: string; sortKey: number } => {
    if (!dueDateStr) return { text: '', color: '', sortKey: Infinity };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: t('time.overdue', { count: -diffDays }), color: 'bg-status-red/10 text-status-red', sortKey: diffDays };
    }
    if (diffDays === 0) {
        return { text: t('time.today'), color: 'bg-status-yellow/10 text-status-yellow', sortKey: 0 };
    }
    if (diffDays === 1) {
        return { text: t('time.tomorrow'), color: 'bg-blue-500/10 text-blue-500', sortKey: 1 };
    }
    return { text: t('time.inDays', { count: diffDays }), color: 'bg-brand-secondary text-brand-text-secondary', sortKey: diffDays };
};


interface UpcomingTasksCardProps {
    contacts: WhatsAppContact[];
    onViewContact: (contact: WhatsAppContact) => void;
    isLoading: boolean;
}

export const UpcomingTasksCard: React.FC<UpcomingTasksCardProps> = ({ contacts, onViewContact, isLoading }) => {
    const { t } = useTranslation();
    
    const tasks = useMemo(() => {
        return contacts
            .filter(c => c.due_date)
            .map(c => ({
                ...c,
                dueDateStatus: getDueDateStatus(c.due_date, t),
            }))
            .sort((a, b) => a.dueDateStatus.sortKey - b.dueDateStatus.sortKey)
            .slice(0, 7); // Show up to 7 tasks
    }, [contacts, t]);

    return (
        <Card className="bg-card/50 backdrop-blur-md border-border/50 shadow-sm overflow-hidden rounded-[24px] group">
            <CardHeader className="pb-4 bg-muted/20 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
                    <div className="p-1.5 bg-muted/50 rounded-lg">
                        <ClipboardListIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"/>
                    </div>
                    {t('hub.upcomingTasks.title')}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                {isLoading ? (
                    <div className="space-y-4 p-2">
                        {[...Array(3)].map((_, i) => (
                             <div key={i} className="flex items-center space-x-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-3 w-3/4 rounded-full" />
                                    <Skeleton className="h-2 w-1/2 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
                            <ClipboardListIcon className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{t('hub.upcomingTasks.empty')}</p>
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {tasks.map(task => (
                            <li key={task.phone_number || task.contact_name}>
                                <button onClick={() => onViewContact(task)} className="w-full flex items-center gap-4 text-left p-3 rounded-2xl hover:bg-muted/50 transition-all group/item outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]">
                                    <Avatar name={task.contact_name} className="w-10 h-10 flex-shrink-0 ring-2 ring-background shadow-md group-hover/item:scale-105 transition-transform" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-foreground truncate group-hover/item:text-primary transition-colors">{task.contact_name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-current/10 ${task.dueDateStatus.color}`}>
                                                {task.dueDateStatus.text}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-muted-foreground">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
};
