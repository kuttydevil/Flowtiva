import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plan } from '../../types';
import { Skeleton } from '../ui/Skeleton';
import { useTranslation } from '../../contexts/LanguageContext';

// --- ICONS ---
const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20" {...props}>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16Zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);


// --- HARDCODED DATA (Source of Truth) ---
const hardcodedPlans: (Plan & { subheaderText?: string })[] = [
  {
    id: 'starter-plan',
    name: 'Starter',
    price_monthly: 79,
    price_yearly: 790,
    description: 'For individuals & solo entrepreneurs testing the waters.',
    subheaderText: 'The essentials to get started with AI chat.',
    features: [
      "Connect 1 WhatsApp Account",
      "2,000 AI Messages/month",
      "Capture Leads with AI",
      "Live Chat Dashboard",
      "Standard Email Support"
    ],
    message_limit: 2000,
    account_limit: 1,
    is_popular: false
  },
  {
    id: 'pro-plan',
    name: 'Pro',
    subheader: "Recommended",
    price_monthly: 149,
    price_yearly: 1490,
    description: 'For growing businesses ready to automate & scale.',
    subheaderText: 'Powerful automation and multi-agent support.',
    features: [
      "Connect up to 5 WhatsApp Accounts",
      "10,000 AI Messages/month",
      "Automate Lead Qualification",
      "Seamless AI-to-Human Handoff",
      "Customize your AI's Personality",
      "Priority Email & Chat Support"
    ],
    message_limit: 10000,
    account_limit: 5,
    is_popular: true
  },
  {
    id: 'business-plan',
    name: 'Business',
    price_monthly: 299,
    price_yearly: 2990,
    description: 'For established teams & agencies managing multiple clients.',
    subheaderText: 'Scale operations with advanced tools & support.',
    features: [
        "Connect up to 15 WhatsApp Accounts",
        "30,000 AI Messages / month",
        "All Pro Features, Unlocked",
        "Advanced Workflow Automations",
        "Dedicated Account Manager",
        "API Access (Coming Soon)"
    ],
    message_limit: 30000,
    account_limit: 15,
    is_popular: false,
    subheader: 'Enterprise'
  }
];


// --- MAIN COMPONENT ---
interface PricingSectionProps {
    onAuthNavigate: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onAuthNavigate }) => {
    const { t } = useTranslation();
    const plans = hardcodedPlans;
    const isLoading = false;
    const error = null;
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const tickers = t('homepage.pricing.socialProofTicker');
    const [tickerIndex, setTickerIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);
    
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const storedEndTime = localStorage.getItem('promoEndTime');
            let endTime;
            if (storedEndTime) {
                endTime = parseInt(storedEndTime, 10);
            } else {
                const newEndTime = new Date().getTime() + 72 * 60 * 60 * 1000; // 72 hours
                localStorage.setItem('promoEndTime', newEndTime.toString());
                endTime = newEndTime;
            }

            const now = new Date().getTime();
            const distance = endTime - now;

            if (distance < 0) {
                return { hours: 0, minutes: 0, seconds: 0 };
            }
            
            const hours = Math.floor(distance / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            return { hours, minutes, seconds };
        };

        setTimeLeft(calculateTimeLeft());

        const intervalId = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!Array.isArray(tickers) || tickers.length === 0) return;

        const intervalId = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setTickerIndex(prevIndex => (prevIndex + 1) % tickers.length);
                setIsFading(false);
            }, 300); // Matches transition duration
        }, 4000); // Change every 4 seconds

        return () => clearInterval(intervalId);
    }, [tickers]);

    const CtaButton = ({ plan }: { plan: (Plan & { subheaderText?: string }) }) => {
        if (plan.name === 'Business') {
            return (
                <Button
                    onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    variant='outline'
                    className="w-full text-base py-3 h-auto"
                >
                    {t('homepage.pricing.ctaBusiness')}
                </Button>
            );
        }
    
        return (
            <Button
                onClick={onAuthNavigate}
                variant={plan.is_popular ? 'primary' : 'outline'}
                className="w-full text-base py-3 h-auto"
            >
                {plan.is_popular ? t('homepage.pricing.ctaPro') : t('homepage.pricing.ctaStarter')}
            </Button>
        );
    };

    return (
        <section id="pricing" className="py-20 sm:py-28 bg-brand-primary">
            <div className="container mx-auto px-6">
                 <div className="text-center max-w-3xl mx-auto scroll-target mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-brand-text-primary">{t('homepage.pricing.lossAversionTitle')}</h2>
                    <p className="mt-4 text-lg text-brand-text-secondary">{t('homepage.pricing.lossAversionDescription')}</p>
                </div>
                
                 <div className="max-w-3xl mx-auto mb-10 text-center">
                    <div className="inline-block bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg font-semibold text-sm animate-fade-in-up">
                        ✨ {t('homepage.pricing.urgencyBanner', timeLeft)}
                    </div>
                </div>

                <div className="flex justify-center items-center mb-10">
                    <div className="p-1 border border-blue-300/30 dark:border-blue-700/30 rounded-xl">
                        <div className="relative flex w-auto items-center justify-center p-1 bg-slate-100/80 dark:bg-slate-800 rounded-lg">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`relative z-10 w-auto py-2.5 px-8 text-sm font-semibold transition-colors duration-300 rounded-md ${
                                    billingCycle === 'monthly'
                                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                {t('billing.monthly')}
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`relative z-10 w-auto py-1.5 px-4 text-sm font-semibold transition-colors duration-300 rounded-md ${
                                    billingCycle === 'yearly'
                                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2">
                                        <span>{t('billing.yearly')}</span>
                                        <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                            BEST VALUE
                                        </span>
                                    </div>
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                        2 Months Free
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch justify-center max-w-6xl mx-auto">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-[550px] rounded-xl" />)
                    ) : error ? (
                        <div className="lg:col-span-3 text-center p-8 bg-card rounded-lg border">
                            <p className="text-muted-foreground">Could not load pricing plans at this time.</p>
                        </div>
                    ) : (
                        plans.map((plan, i) => {
                            const cardBaseClass = 'flex flex-col relative scroll-target transition-all duration-300 rounded-2xl';
                            let cardStyleClass;
                            if (plan.is_popular) {
                                cardStyleClass = 'bg-slate-50/50 dark:bg-slate-800/80 border-2 border-teal-500 dark:border-teal-400 shadow-2xl shadow-teal-500/10';
                            } else {
                                cardStyleClass = 'bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700';
                            }
                            return (
                                <Card key={plan.id} className={`${cardBaseClass} ${cardStyleClass}`} style={{animationDelay: `${i * 100}ms`}}>
                                    {plan.is_popular && (
                                        <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                                            <span className="bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 px-3 py-1 text-xs font-semibold rounded-full">{t('homepage.pricing.mostPopular')}</span>
                                        </div>
                                    )}
                                    <CardHeader className="pt-10">
                                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                        {(plan as any).subheaderText && <p className="text-accent font-semibold text-sm pt-1">{(plan as any).subheaderText}</p>}
                                        <CardDescription className="pt-2 min-h-[40px]">{plan.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow flex flex-col">
                                        <div className="mb-6">
                                            <span className="text-5xl font-bold text-foreground">
                                                QAR {billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly}
                                            </span>
                                            <span className="text-muted-foreground">/{billingCycle === 'yearly' ? t('homepage.pricing.year') : t('homepage.pricing.month')}</span>
                                        </div>
                                        <ul className="space-y-3 text-muted-foreground mb-8 flex-grow">
                                            {plan.features.map((feature: string) => (
                                                <li key={feature} className="flex items-start gap-3">
                                                    <CheckCircleIcon className="text-status-green flex-shrink-0 mt-1" />
                                                    <span className="text-foreground">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-auto">
                                            <CtaButton plan={plan} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    )}
                </div>
                <div className="mt-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2 h-5">
                   <CheckCircleIcon className="w-5 h-5 text-status-green flex-shrink-0"/>
                   {Array.isArray(tickers) && tickers.length > 0 && (
                        <span className={`transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                            {tickers[tickerIndex]}
                        </span>
                    )}
                </div>
            </div>
        </section>
    );
};