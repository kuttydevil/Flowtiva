
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { supabase } from '../../services/supabaseService';
import { BillingDashboardData, Plan, InvoiceDetails } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { InvoiceViewModal } from './InvoiceViewModal';
import { initiatePayment, getPaymentDetails } from '../../services/myFatoorahService';

// --- ICONS ---
const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20" {...props}>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16Zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);
const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.43-7.582a1.012 1.012 0 0 1 1.737 0l4.43 7.582a1.012 1.012 0 0 1 0 .639l-4.43 7.582a1.012 1.012 0 0 1-1.737 0l-4.43-7.582Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
);
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 18.75a9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
);
const AlertTriangleIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = ({ title, ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
);

const UsageStatCard = ({ title, used, limit, unit }: { title: string; used: number; limit: number; unit: string; }) => {
  const { t } = useTranslation();
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const isExceeded = percentage > 100;
  const isApproaching = percentage >= 80 && !isExceeded;

  let progressColor = 'bg-brand-accent';
  let textColor = 'text-brand-text-primary';
  let warningText = '';
  let warningIconColor = '';

  if (isExceeded) {
    progressColor = 'bg-status-red';
    textColor = 'text-status-red';
    warningText = t('billing.usage.limitExceeded');
    warningIconColor = 'text-status-red';
  } else if (isApproaching) {
    progressColor = 'bg-status-yellow';
    textColor = 'text-status-yellow';
    warningText = t('billing.usage.approachingLimit');
    warningIconColor = 'text-status-yellow';
  }

  return (
    <Card className={`transition-all ${isExceeded ? 'border-status-red/50 ring-2 ring-status-red/20' : isApproaching ? 'border-status-yellow/50' : ''}`}>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-brand-text-secondary flex items-center gap-2">
          {title}
          {(isApproaching || isExceeded) && <AlertTriangleIcon className={`h-4 w-4 ${warningIconColor}`} title={warningText} />}
        </p>
        <p className={`text-2xl font-bold mt-1 ${textColor}`}>
            {used.toLocaleString()}
            <span className="text-base font-normal text-brand-text-secondary"> / {limit > 0 ? limit.toLocaleString() : '∞'} {unit}</span>
        </p>
        <div className="w-full bg-brand-secondary rounded-full h-2 mt-3" title={`${percentage.toFixed(1)}% used`}>
          <div
            className={`transition-all duration-500 ease-out h-2 rounded-full ${progressColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {warningText && <p className={`text-xs font-medium mt-2 ${textColor}`}>{warningText}</p>}
      </CardContent>
    </Card>
  );
};


const TotalStatCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode; }) => (
    <Card>
        <CardContent className="p-5">
             <p className="text-sm font-medium text-brand-text-secondary flex items-center gap-2">{icon} {title}</p>
            <p className="text-3xl font-bold text-brand-text-primary mt-2">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </CardContent>
    </Card>
);

interface BillingDashboardProps {
    subscriptionStatus: 'loading' | 'active' | 'trialing' | 'inactive';
    onSubscriptionUpdate: () => void;
}

// --- MAIN COMPONENT ---
export const BillingDashboard: React.FC<BillingDashboardProps> = ({ subscriptionStatus, onSubscriptionUpdate }) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [data, setData] = useState<BillingDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    const { t } = useTranslation();

    // Generate plans with translations
    const plans = useMemo(() => {
        return [
            {
                id: 'starter-plan',
                name: 'Starter',
                price_monthly: 79,
                price_yearly: 790,
                description: t('billing.plans.starter.description'),
                subheaderText: t('billing.plans.starter.subheader'),
                features: [
                    t('billing.plans.starter.f1'),
                    t('billing.plans.starter.f2'),
                    t('billing.plans.starter.f3'),
                    t('billing.plans.starter.f4'),
                    t('billing.plans.starter.f5')
                ],
                message_limit: 2000,
                account_limit: 1,
                is_popular: false
            },
            {
                id: 'pro-plan',
                name: 'Pro',
                subheader: t('billing.plans.pro.subheader'),
                price_monthly: 149,
                price_yearly: 1490,
                description: t('billing.plans.pro.description'),
                subheaderText: t('billing.plans.pro.subheader'),
                features: [
                    t('billing.plans.pro.f1'),
                    t('billing.plans.pro.f2'),
                    t('billing.plans.pro.f3'),
                    t('billing.plans.pro.f4'),
                    t('billing.plans.pro.f5'),
                    t('billing.plans.pro.f6')
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
                description: t('billing.plans.business.description'),
                subheaderText: t('billing.plans.business.subheader'),
                features: [
                    t('billing.plans.business.f1'),
                    t('billing.plans.business.f2'),
                    t('billing.plans.business.f3'),
                    t('billing.plans.business.f4'),
                    t('billing.plans.business.f5'),
                    t('billing.plans.business.f6')
                ],
                message_limit: 30000,
                account_limit: 15,
                is_popular: false,
                subheader: 'Enterprise'
            }
        ] as (Plan & { subheaderText?: string })[];
    }, [t]);

    // Modals State
    const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [invoiceToView, setInvoiceToView] = useState<InvoiceDetails | null>(null);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    
    const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const billingData = await supabase.getBillingDashboardData();
            setData(billingData);
        } catch (err: any) {
            setError(err.message || t('billing.errors.loadFailed'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchData();
        
        const query = new URLSearchParams(window.location.search);
        const paymentStatus = query.get('payment_status');
        const paymentId = query.get('paymentId');
        
        if (paymentStatus === 'success' && paymentId) {
            addToast(t('billing.verifying'), { type: 'info' });
            // Verify payment with MyFatoorah API via backend/service
            getPaymentDetails(paymentId).then(async details => {
                if (details.IsSuccess && details.Data.InvoiceStatus === 'Paid') {
                    addToast(t('billing.paymentSuccess', { id: details.Data.InvoiceId }), { type: 'success' });
                    
                    // Check for pending plan change stored before redirect
                    const pendingPlanId = localStorage.getItem('pendingPlanId');
                    const pendingBillingCycle = localStorage.getItem('pendingBillingCycle') as 'monthly' | 'yearly';

                    if (pendingPlanId && pendingBillingCycle) {
                        try {
                            // Update subscription in database
                            await supabase.changeSubscriptionPlan(pendingPlanId, pendingBillingCycle);
                            addToast(t('billing.subscriptionUpdated'), { type: 'success' });
                        } catch (err: any) {
                            console.error("Failed to update subscription:", err);
                            addToast("Payment successful but failed to update subscription. Please contact support.", { type: 'error' });
                        } finally {
                            // Clean up
                            localStorage.removeItem('pendingPlanId');
                            localStorage.removeItem('pendingBillingCycle');
                        }
                    }

                    onSubscriptionUpdate();
                } else {
                    addToast("Payment verification failed or payment not completed.", { type: 'error' });
                }
            }).catch(err => {
                console.error(err);
                addToast("Error verifying payment status.", { type: 'error' });
            });
            window.history.replaceState(null, '', window.location.pathname);
        } else if (paymentStatus === 'failed') {
            addToast(t('billing.paymentFailed'), { type: 'error' });
            // Clean up potentially stale intents
            localStorage.removeItem('pendingPlanId');
            localStorage.removeItem('pendingBillingCycle');
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, [fetchData, addToast, onSubscriptionUpdate, t]);

    const handleCheckout = async (amount: number, currency: string, planId?: string) => {
        setIsProcessingPayment(true);
        addToast("Redirecting to MyFatoorah payment gateway...", { type: 'info' });
        
        // Persist purchase intent to localStorage so we can update the DB after redirect
        if (planId) {
            localStorage.setItem('pendingPlanId', planId);
            localStorage.setItem('pendingBillingCycle', billingCycle);
        } else {
            // Just updating payment method or miscellaneous charge
            localStorage.removeItem('pendingPlanId');
            localStorage.removeItem('pendingBillingCycle');
        }

        try {
            // Get user details from session if possible, or use defaults
            const { data: { session } } = await supabase.client.auth.getSession();
            const customerName = session?.user?.displayName || 'Valued Customer';
            const customerEmail = session?.user?.email || 'customer@example.com';

            const response = await initiatePayment(amount, currency, customerName, customerEmail);
            
            if (response.IsSuccess && response.Data.PaymentURL) {
                window.location.href = response.Data.PaymentURL;
            } else {
                throw new Error(response.Message || "Failed to get payment URL");
            }
        } catch (err: any) {
            addToast(err.message, { type: 'error' });
            setIsProcessingPayment(false);
        }
    };


    const handleViewInvoice = async (invoiceId: string) => {
        setIsModalLoading(true);
        try {
            const invoiceDetails = await supabase.getInvoiceDetails(invoiceId);
            if (invoiceDetails) {
                setInvoiceToView(invoiceDetails);
                setInvoiceModalOpen(true);
            } else {
                addToast(t('billing.errors.invoiceNotFound'), { type: 'error' });
            }
        } catch (err: any) {
            addToast(err.message, { type: 'error' });
        } finally {
            setIsModalLoading(false);
        }
    };


    const renderPricingSection = () => {
        const isCurrentPlan = (plan: Plan, cycle: 'monthly' | 'yearly') => 
            data?.currentPlan && plan.id === data.currentPlan.planId && cycle === data.currentPlan.billingCycle;
        
        const isCurrentPlanFamily = (plan: Plan) => data?.currentPlan && plan.id === data.currentPlan.planId;
            
        const isOnTrial = data?.currentPlan?.status === 'trialing';

        return (
            <div>
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold tracking-tight text-brand-text-primary sm:text-4xl">{t('billing.changePlanTitle')}</h2>
                    <p className="mt-4 text-lg text-brand-text-secondary">
                        {t('billing.changePlanDesc')}
                    </p>
                </div>
                <div className="flex justify-center items-center mb-10">
                    <div className="relative flex w-full max-w-sm items-center justify-center p-1 bg-brand-secondary rounded-full">
                        <span 
                            className="absolute top-1 left-1 h-[calc(100%-0.5rem)] w-[calc(50%-0.25rem)] bg-brand-primary dark:bg-brand-accent/20 rounded-full shadow-md transition-transform duration-300 ease-in-out rtl:right-1 rtl:left-auto" 
                            style={{ transform: billingCycle === 'yearly' ? (document.documentElement.dir === 'rtl' ? 'translateX(-100%)' : 'translateX(100%)') : 'translateX(0)' }}
                        ></span>
                        <button 
                            onClick={() => setBillingCycle('monthly')} 
                            className={`relative z-10 w-1/2 py-2 text-sm font-semibold transition-colors ${billingCycle === 'monthly' ? 'text-brand-accent' : 'text-brand-text-secondary'}`}
                        >
                            {t('billing.monthly')}
                        </button>
                        <button 
                            onClick={() => setBillingCycle('yearly')} 
                            className={`relative z-10 w-1/2 py-2 text-sm font-semibold transition-colors ${billingCycle === 'yearly' ? 'text-brand-accent' : 'text-brand-text-secondary'}`}
                        >
                            {t('billing.yearly')} <span className="text-status-green hidden sm:inline">({t('billing.saveYearly')})</span>
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {plans.map((plan) => {
                        const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;

                        return (
                        <Card key={plan.name} className={`flex flex-col relative ${plan.is_popular ? 'border-brand-accent shadow-lg ring-2 ring-brand-accent' : ''}`}>
                            {plan.is_popular && (
                                <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                                    <span className="bg-brand-accent text-white px-3 py-1 text-sm font-semibold rounded-full">{t('billing.plans.mostPopular')}</span>
                                </div>
                            )}
                            <CardHeader className="pt-10">
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col">
                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-brand-text-primary">QAR {price}</span>
                                    <span className="text-brand-text-secondary">/{billingCycle === 'monthly' ? t('homepage.pricing.month') : t('homepage.pricing.year')}</span>
                                </div>
                                <ul className="space-y-3 text-brand-text-secondary mb-8">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3">
                                            <CheckCircleIcon className="text-status-green flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-auto">
                                    <Button
                                        onClick={() => handleCheckout(price, 'QAR', plan.id)}
                                        variant={isCurrentPlanFamily(plan) && !isOnTrial ? 'outline' : (plan.is_popular ? 'primary' : 'outline')}
                                        className="w-full text-base py-3 h-auto"
                                        disabled={(isCurrentPlan(plan, billingCycle) && !isOnTrial) || isProcessingPayment}
                                    >
                                        {isProcessingPayment ? t('common.loading') : (isCurrentPlanFamily(plan) && !isOnTrial ? t('billing.currentPlanButton') : t('billing.choosePlanButton'))}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )})}
                </div>
            </div>
        )
    };
    
    if (isLoading) {
        return (
            <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-12 animate-pulse">
                <Skeleton className="h-10 w-1/3 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                </div>
                <Skeleton className="h-10 w-1/3 my-6" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Skeleton className="h-48 lg:col-span-2 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-64 lg:col-span-3 rounded-xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="p-10 text-center text-status-red bg-status-red/10 rounded-lg m-10">{error}</div>;
    }

    if (!data || !data.currentPlan) {
        return (
             <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-12">
                 <div className="text-center py-10">
                    <h1 className="text-2xl font-bold text-brand-text-primary mb-2">
                        {subscriptionStatus === 'inactive' ? t('billing.inactive.title') : t('billing.noSubscription.title')}
                    </h1>
                    <p className="text-brand-text-secondary">
                        {subscriptionStatus === 'inactive' ? t('billing.inactive.description') : t('billing.noSubscription.description')}
                    </p>
                </div>
                {renderPricingSection()}
            </div>
        );
    }
    
    const { currentPlan, usageStats, paymentMethod, invoices } = data;

    return (
      <>
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-12">
             {/* --- INACTIVE/TRIAL EXPIRED BANNER --- */}
            {subscriptionStatus === 'inactive' && !isLoading && (
                <div className="bg-status-red/10 border border-status-red/20 text-status-red p-4 rounded-lg text-center animate-in">
                    <p className="font-semibold">{t('billing.inactive.title')}</p>
                    <p className="text-sm">{t('billing.inactive.description')}</p>
                </div>
            )}
            {/* --- TRIAL BANNER --- */}
            {currentPlan.status === 'trialing' && (
                <div className="bg-brand-accent/10 border border-brand-accent/20 text-brand-accent p-4 rounded-lg text-center animate-in">
                    <p className="font-semibold">{t('billing.trial.title', { planName: currentPlan.name.replace(' (Free Trial)', '')})}</p>
                    <p className="text-sm">{t('billing.trial.description', { date: formatDate(currentPlan.renewalDate)})}</p>
                </div>
            )}
            {/* --- USAGE OVERVIEW SECTION --- */}
            {usageStats && (
                <div>
                    <h1 className="text-3xl font-bold text-brand-text-primary mb-2">{t('billing.usage.title')}</h1>
                    <p className="text-sm text-brand-text-secondary mb-6">{t('billing.usage.description', { date: formatDate(usageStats.resetsOn)})}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <UsageStatCard title={t('billing.usage.messages')} used={usageStats.messages.used} limit={usageStats.messages.limit} unit={t('billing.usage.messagesUnit')} />
                        <UsageStatCard title={t('billing.usage.accounts')} used={usageStats.accounts.used} limit={usageStats.accounts.limit} unit={t('billing.usage.accountsUnit')} />
                        <TotalStatCard title={t('billing.usage.contacts')} value={usageStats.contacts} icon={<UsersIcon className="h-4 w-4" />} />
                    </div>
                </div>
            )}

            {/* --- BILLING MANAGEMENT SECTION --- */}
            <div>
                <h1 className="text-3xl font-bold text-brand-text-primary mb-6">{t('billing.manageTitle')}</h1>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Current Plan */}
                    <Card className="lg:col-span-2">
                        <CardHeader><CardTitle>{t('billing.currentPlan')}</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                <div>
                                    <p className="text-xl font-semibold text-brand-text-primary">{currentPlan.name}</p>
                                    <p className="text-brand-text-secondary">
                                        {currentPlan.status === 'trialing' ? 'QAR 0 (Free Trial)' : `QAR ${currentPlan.price}/${currentPlan.billingCycle}`}
                                    </p>
                                </div>
                                <Button variant="outline" className="mt-4 sm:mt-0">{t('billing.cancelSubscription')}</Button>
                            </div>
                            <div className="mt-4 pt-4 border-t border-brand-border">
                                <p className="text-sm text-brand-text-secondary">
                                    {currentPlan.status === 'trialing' ? t('billing.trial.description', { date: formatDate(currentPlan.renewalDate)}) : t('billing.renewOn', { date: formatDate(currentPlan.renewalDate) })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Method */}
                    <Card>
                        <CardHeader><CardTitle>{t('billing.paymentMethod')}</CardTitle></CardHeader>
                        <CardContent>
                            {paymentMethod ? (
                                <>
                                <div className="flex items-center gap-4">
                                    {/* Placeholder icon */}
                                    <div className="h-8 w-12 bg-brand-secondary rounded flex items-center justify-center text-xs font-bold text-brand-text-secondary">CARD</div>
                                    <div>
                                        <p className="font-semibold text-brand-text-primary">{paymentMethod.cardType} {paymentMethod.last4}</p>
                                        <p className="text-sm text-brand-text-secondary">{t('billing.expires', { date: paymentMethod.expiry })}</p>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full mt-4" onClick={() => handleCheckout(10, 'QAR')}>{t('billing.updatePayment')}</Button>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-brand-text-secondary">{t('billing.noPaymentMethod')}</p>
                                    <Button variant="outline" className="w-full mt-4" onClick={() => handleCheckout(10, 'QAR')}>{t('billing.updatePayment')}</Button>
                                </>
                            )}
                        </CardContent>
                    </Card>

                     {/* Invoice History */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>{t('billing.invoiceHistory')}</CardTitle>
                            <CardDescription>{t('billing.invoiceHistoryDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {invoices.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-brand-text-secondary uppercase bg-brand-secondary">
                                            <tr>
                                                <th scope="col" className="px-6 py-3">{t('billing.invoiceDate')}</th>
                                                <th scope="col" className="px-6 py-3">{t('billing.invoiceAmount')}</th>
                                                <th scope="col" className="px-6 py-3">{t('billing.invoiceStatus')}</th>
                                                <th scope="col" className="px-6 py-3 text-right">{t('billing.invoiceAction')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoices.map(invoice => (
                                                <tr key={invoice.id} className="border-b border-brand-border">
                                                    <td className="px-6 py-4 font-medium text-brand-text-primary">{formatDate(invoice.date)}</td>
                                                    <td className="px-6 py-4">QAR {invoice.amount.toFixed(2)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-green/10 text-status-green">{invoice.status}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice.id)}>
                                                            <EyeIcon className="h-4 w-4 mr-2" />
                                                            {t('common.view')}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-brand-text-secondary text-center py-4">{t('billing.errors.invoiceNotFound')}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* --- PRICING PLANS SECTION --- */}
            {renderPricingSection()}

            {/* --- FAQ SECTION --- */}
            <div className="mt-10">
                <h2 className="text-3xl font-bold text-center text-brand-text-primary">{t('billing.faqTitle')}</h2>
                <div className="mt-8 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {[...Array(4)].map((_, index) => (
                        <div key={index}>
                            <h3 className="font-semibold text-brand-text-primary">{t(`billing.faq.q${index + 1}`)}</h3>
                            <p className="mt-1 text-brand-text-secondary">{t(`billing.faq.a${index + 1}`)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* --- MODALS --- */}
        <InvoiceViewModal
            isOpen={isInvoiceModalOpen}
            onClose={() => setInvoiceModalOpen(false)}
            invoice={invoiceToView}
        />
      </>
    );
};

export default BillingDashboard;
