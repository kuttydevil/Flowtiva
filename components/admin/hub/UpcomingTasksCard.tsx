
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { WhatsAppContact } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Skeleton } from '../../ui/Skeleton';
import { Avatar } from '../../ui/Avatar';
import { useTranslation } from '../../../contexts/LanguageContext';
import { cn } from '../../../lib/utils';

const ClipboardListIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
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

    if (diffDays < 0) return { text: t('time.overdue', { count: -diffDays }), color: 'text-red-500 bg-red-500/10 border-red-500/20', sortKey: diffDays };
    if (diffDays === 0) return { text: t('time.today'), color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', sortKey: 0 };
    if (diffDays === 1) return { text: t('time.tomorrow'), color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', sortKey: 1 };
    return { text: t('time.inDays', { count: diffDays }), color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', sortKey: diffDays };
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
            .slice(0, 5); 
    }, [contacts, t]);

    return (
        <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden rounded-[32px] group transition-all duration-500 relative z-0">
            <CardHeader className="pb-6 bg-muted/[0.03] border-b border-border/10">
                <CardTitle className="flex items-center gap-4 text-xl font-black tracking-tight text-foreground/90">
                    <div className="p-3 bg-primary/10 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <ClipboardListIcon className="h-6 w-6 text-primary" />
                    </div>
                    {t('hub.upcomingTasks.title')}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                {isLoading ? (
                    <div className="space-y-6">
                        {[...Array(3)].map((_, i) => (
                             <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-12 w-12 rounded-2xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4 rounded-full" />
                                    <Skeleton className="h-3 w-1/2 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-16">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-16 h-16 bg-muted/20 rounded-3xl flex items-center justify-center mx-auto mb-4"
                        >
                            <ClipboardListIcon className="h-8 w-8 text-muted-foreground/30" />
                        </motion.div>
                        <p className="text-sm font-bold text-muted-foreground/60 tracking-tight">{t('hub.upcomingTasks.empty')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {tasks.map((task, i) => (
                            <motion.div
                                key={task.phone_number || task.contact_name}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <button 
                                    onClick={() => onViewContact(task)} 
                                    className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-muted/30 transition-all group/item outline-none active:scale-[0.98]"
                                >
                                    <Avatar name={task.contact_name} className="w-12 h-12 flex-shrink-0 ring-4 ring-background shadow-xl group-hover/item:scale-110 transition-transform duration-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-base text-foreground/90 truncate group-hover/item:text-primary transition-colors">{task.contact_name}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border",
                                                task.dueDateStatus.color
                                            )}>
                                                {task.dueDateStatus.text}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all">
                                        <div className="p-2 bg-muted/50 rounded-xl">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4 text-primary">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                            </svg>
                                        </div>
                                    </div>
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
