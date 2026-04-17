
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardStats, WhatsAppInstance } from '../../../types';
import { Skeleton } from '../../ui/Skeleton';
import { useAI } from '../../../contexts/AIContext';
import { useTranslation } from '../../../contexts/LanguageContext';
import { cn } from '../../../lib/utils';

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

interface AIInsightCardProps {
    stats: DashboardStats | null;
    instances: WhatsAppInstance[];
}

const INSIGHT_ROTATION_INTERVAL_MS = 10000;

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ stats, instances }) => {
    const { t } = useTranslation();
    const { insights, isLoadingInsights, fetchInsights } = useAI();
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (stats) fetchInsights(stats, instances);
    }, [stats, instances, fetchInsights]);
    
    useEffect(() => {
        if (insights.length <= 1) return;
        const intervalId = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % insights.length);
        }, INSIGHT_ROTATION_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [insights]);

    return (
        <div className="relative p-10 rounded-[40px] bg-[#0A0A0B] text-white shadow-2xl border border-white/5 min-h-[160px] overflow-hidden group">
            {/* Mesh Gradient Background */}
            <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <div className="flex items-center gap-8 relative z-10">
                <div className="relative flex-shrink-0">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-tr from-primary to-violet-500 rounded-[22px] blur-md opacity-50 group-hover:opacity-100 transition-opacity" 
                    />
                    <div className="relative p-4 bg-white/10 rounded-[22px] backdrop-blur-2xl ring-1 ring-white/20 shadow-2xl transition-transform duration-500 group-hover:scale-110">
                        <SparklesIcon className="w-8 h-8 text-white" />
                    </div>
                </div>
                
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-black text-xs uppercase tracking-[0.3em] text-white/40">{t('hub.insights.title')}</h3>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    
                    {isLoadingInsights ? (
                        <div className="space-y-3 mt-4">
                             <Skeleton className="h-5 w-3/4 bg-white/5 rounded-full" />
                             <Skeleton className="h-5 w-1/2 bg-white/5 rounded-full" />
                        </div>
                    ) : (
                        <div className="relative min-h-[50px] flex items-center">
                            <AnimatePresence mode="wait">
                                <motion.p 
                                    key={currentIndex}
                                    initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                    className="text-white/90 text-lg leading-relaxed font-bold tracking-tight italic"
                                >
                                    “{insights[currentIndex] || t('hub.insights.default')}”
                                </motion.p>
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination dots */}
            {!isLoadingInsights && insights.length > 1 && (
                <div className="absolute bottom-6 right-10 flex gap-2">
                    {insights.map((_, i) => (
                        <button 
                            key={i} 
                            onClick={() => setCurrentIndex(i)}
                            className={cn(
                                "h-1 rounded-full transition-all duration-700 outline-none", 
                                i === currentIndex ? 'w-8 bg-primary shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'w-2 bg-white/10 hover:bg-white/30'
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
