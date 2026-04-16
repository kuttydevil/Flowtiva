
import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../../services/firebaseService';
import { ActivityLog } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Skeleton } from '../../ui/Skeleton';
import { Avatar } from '../../ui/Avatar';
import { useTranslation } from '../../../contexts/LanguageContext';

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
    const months = Math.floor(days / 30);
    if (months < 12) return t('time.monthsAgo', { count: months });
    const years = Math.floor(days / 365);
    return t('time.yearsAgo', { count: years });
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
                setActivity(data);
            } catch (error) {
                console.error("Error fetching recent activity:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchActivity();
    }, []);

    return (
        <Card className="bg-card/50 backdrop-blur-md border-border/50 shadow-sm overflow-hidden rounded-[24px] group">
            <CardHeader className="pb-4 bg-muted/20 border-b border-border/50">
                <CardTitle className="text-lg font-bold tracking-tight text-foreground">{t('hub.recentActivity.title')}</CardTitle>
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
                ) : activity.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-muted-foreground/50">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{t('hub.recentActivity.empty')}</p>
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {activity.map((log, idx) => (
                            <li key={`${log.timestamp}-${log.contact_name}-${idx}`}>
                                <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-muted/50 transition-all group/item">
                                    <Avatar name={log.contact_name} className="w-10 h-10 flex-shrink-0 ring-2 ring-background shadow-md group-hover/item:scale-105 transition-transform" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-sm text-foreground truncate group-hover/item:text-primary transition-colors">{log.contact_name}</p>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 ml-2">{timeAgo(log.timestamp, t)}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-1 italic leading-relaxed">"{log.message_text}"</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
};
