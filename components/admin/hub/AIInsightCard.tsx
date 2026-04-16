
import React, { useState, useEffect, useRef } from 'react';
import { DashboardStats, WhatsAppInstance } from '../../../types';
import { Skeleton } from '../../ui/Skeleton';
import { useAI } from '../../../contexts/AIContext';
import { useTranslation } from '../../../contexts/LanguageContext';

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

interface AIInsightCardProps {
    stats: DashboardStats | null;
    instances: WhatsAppInstance[];
}

const INSIGHT_ROTATION_INTERVAL_MS = 10000; // 10 seconds

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ stats, instances }) => {
    const { t } = useTranslation();
    const { insights, isLoadingInsights, fetchInsights } = useAI();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (stats) {
            fetchInsights(stats, instances);
        }
    }, [stats, instances, fetchInsights]);
    
    useEffect(() => {
        if (insights.length <= 1) return;

        const intervalId = setInterval(() => {
            setIsFading(true);
            
            timeoutRef.current = window.setTimeout(() => {
                setCurrentIndex(prevIndex => (prevIndex + 1) % insights.length);
                setIsFading(false);
            }, 300);

        }, INSIGHT_ROTATION_INTERVAL_MS);

        return () => {
            clearInterval(intervalId);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [insights]);


    return (
        <div className="xl:col-span-3 p-8 rounded-[32px] bg-gradient-to-br from-indigo-600 via-primary to-violet-600 text-primary-foreground shadow-2xl shadow-primary/30 border border-white/10 min-h-[140px] relative overflow-hidden group">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-[80px] group-hover:bg-white/20 transition-all duration-1000 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-primary-foreground/5 rounded-full blur-[60px] group-hover:bg-primary-foreground/10 transition-all duration-1000 pointer-events-none" />
            
            <div className="flex items-start gap-6 relative z-10">
                <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md shadow-xl ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-500">
                    <SparklesIcon className="w-7 h-7 text-white animate-pulse" />
                </div>
                <div className="flex-1 pt-1">
                    <h3 className="font-bold text-xl tracking-tight mb-2 opacity-90">{t('hub.insights.title')}</h3>
                    {isLoadingInsights ? (
                        <div className="space-y-3 mt-3">
                             <Skeleton className="h-4 w-3/4 bg-white/15 rounded-full" />
                             <Skeleton className="h-4 w-1/2 bg-white/15 rounded-full" />
                        </div>
                    ) : (
                        <div className="relative h-12">
                            <p 
                                className={`text-white/95 text-[15px] leading-relaxed font-medium transition-all duration-500 ease-in-out absolute inset-0 ${isFading ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
                                key={currentIndex}
                            >
                                {insights[currentIndex] || t('hub.insights.default')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination dots */}
            {!isLoadingInsights && insights.length > 1 && (
                <div className="absolute bottom-4 right-8 flex gap-1.5">
                    {insights.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
