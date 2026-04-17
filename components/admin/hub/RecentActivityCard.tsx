
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { firebaseService } from '../../../services/firebaseService';
import { ActivityLog } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Skeleton } from '../../ui/Skeleton';
import { Avatar } from '../../ui/Avatar';
import { useTranslation } from '../../../contexts/LanguageContext';
import { cn } from '../../../lib/utils';

const ActivityIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const timeAgo = (isoTimestamp: string | null | undefined, t: (key: string, replacements?: any) => string): string => {
    if (!isoTimestamp) return '';
    const date = new Date(isoTimestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return t('time.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('time.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('time.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t('time.daysAgo', { count: days });
    return t('time.longAgo');
};

export const RecentActivityCard: React.FC = () => {
    const [activity, setActivity] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchActivity = async () => {
            setIsLoading(true);
            try {
                const data = await firebaseService.getRecentActivity();
                setActivity(data.slice(0, 5));
            } catch (error) {
                console.error("Error fetching recent activity:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchActivity();
    }, []);

    return (
        <Card className="bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden rounded-[32px] group transition-all duration-500 relative z-0">
            <CardHeader className="pb-6 bg-muted/[0.03] border-b border-border/10">
                <CardTitle className="flex items-center gap-4 text-xl font-black tracking-tight text-foreground/90">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <ActivityIcon className="h-6 w-6 text-indigo-500" />
                    </div>
                    {t('hub.recentActivity.title')}
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
                ) : activity.length === 0 ? (
                    <div className="text-center py-16">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-16 h-16 bg-muted/20 rounded-3xl flex items-center justify-center mx-auto mb-4"
                        >
                            <ActivityIcon className="h-8 w-8 text-muted-foreground/30" />
                        </motion.div>
                        <p className="text-sm font-bold text-muted-foreground/60 tracking-tight">{t('hub.recentActivity.empty')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {activity.map((log, i) => (
                            <motion.div
                                key={`${log.timestamp}-${log.contact_name}-${i}`}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <div className="flex items-start gap-4 p-4 rounded-3xl hover:bg-muted/30 transition-all group/item shadow-sm hover:shadow-md">
                                    <Avatar name={log.contact_name} className="w-12 h-12 flex-shrink-0 ring-4 ring-background shadow-xl group-hover/item:scale-110 transition-transform duration-500" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="font-black text-base text-foreground/90 truncate group-hover/item:text-primary transition-colors">{log.contact_name}</p>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mt-0.5">{timeAgo(log.timestamp, t)}</span>
                                        </div>
                                        <div className="relative mt-2 p-3 bg-muted/20 rounded-2xl border border-white/5 italic">
                                            <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">
                                                "{log.message_text}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
