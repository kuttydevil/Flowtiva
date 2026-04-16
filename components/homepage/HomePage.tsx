
import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Footer } from '../layout/Footer';
import { ThemeToggle } from '../layout/Header';
import { Avatar } from '../ui/Avatar';
import { useTranslation } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { PricingSection } from './PricingSection';
import { useSEO } from '../../hooks/useSEO';
import { useStructuredData } from '../../hooks/useStructuredData';
import { Input } from '../ui/Input';
import { LegalModal } from '../legal/LegalModal';
import { PrivacyPolicyContent, TermsOfServiceContent } from '../legal/legalContent';
import { InteractiveDemo } from './InteractiveDemo';

// --- ICONS ---
const LogoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-primary">
        <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM6 8.83v6.34L11.03 12 6 8.83zm7 0v6.34L18.03 12 13 8.83z"/>
    </svg>
);
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>;
const LockClosedIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
  </svg>
);

interface HomePageProps {
    onAuthNavigate: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onAuthNavigate }) => {
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const { t } = useTranslation();
    const [viewingPolicy, setViewingPolicy] = useState<'privacy' | 'terms' | null>(null);

    useSEO({
        title: t('seo.home.title'),
        description: t('seo.home.description'),
    });
    
    const faqs = useMemo(() => [
        { q: t('homepage.faq.q1'), a: t('homepage.faq.a1') },
        { q: t('homepage.faq.q2'), a: t('homepage.faq.a2') },
        { q: t('homepage.faq.q3'), a: t('homepage.faq.a3') },
        { q: t('homepage.faq.q4'), a: t('homepage.faq.a4') }
    ], [t]);
    
    const faqStructuredData = useMemo(() => ({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.a
            }
        }))
    }), [faqs]);

    useStructuredData(faqStructuredData);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-fade-in-up');
                    }
                });
            },
            { threshold: 0.1 }
        );

        const targets = document.querySelectorAll('.scroll-target');
        targets.forEach((target) => observer.observe(target));

        return () => {
            targets.forEach((target) => observer.unobserve(target));
        };
    }, []);

    const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const href = event.currentTarget.getAttribute('href');
        if (!href || !href.startsWith('#')) return;

        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            const header = document.querySelector<HTMLElement>('header.fixed');
            const headerHeight = header ? header.offsetHeight : 0;
            
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    const handleContactScroll = (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleOpenPolicy = (policy: 'privacy' | 'terms') => {
        setViewingPolicy(policy);
    };

    const handleClosePolicy = () => {
        setViewingPolicy(null);
    };

    return (
        <div className="bg-background text-foreground font-sans antialiased overflow-x-hidden">
            {/* Header */}
            <header className="fixed top-0 inset-x-0 z-40 glass border-b border-white/10 transition-all duration-300">
                <div className="container mx-auto px-6 h-16 flex justify-between items-center">
                    <a href="#" className="flex items-center gap-2 group">
                        <LogoIcon />
                        <span className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">Flowtiva</span>
                    </a>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                        <a href="#solution" onClick={handleNavClick} className="hover:text-foreground transition-colors">{t('homepage.nav.solution')}</a>
                        <a href="#testimonials" onClick={handleNavClick} className="hover:text-foreground transition-colors">{t('homepage.nav.testimonials')}</a>
                        <a href="#pricing" onClick={handleNavClick} className="hover:text-foreground transition-colors">{t('homepage.nav.pricing')}</a>
                        <a href="#faq" onClick={handleNavClick} className="hover:text-foreground transition-colors">{t('homepage.nav.faq')}</a>
                    </nav>
                    <div className="flex items-center gap-2">
                         <LanguageSwitcher />
                         <ThemeToggle />
                         <Button onClick={onAuthNavigate} variant="ghost" size="sm" className="hidden sm:inline-flex">{t('homepage.nav.signIn')}</Button>
                         <Button onClick={onAuthNavigate} size="sm" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">{t('homepage.nav.getStarted')}</Button>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-24 sm:pt-40 sm:pb-32 text-center overflow-hidden">
                    {/* Abstract Background Gradient */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[1000px] h-[500px] opacity-30 dark:opacity-20 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-normal animate-in fade-in zoom-in duration-1000"></div>
                    </div>

                     <div className="container mx-auto px-6 relative z-10">
                        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8 animate-in slide-in-from-bottom-4 fade-in duration-700">
                            <span>🚀 Introducing Flowtiva 2.0</span>
                        </div>
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100">
                            {t('homepage.hero.title')} <br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">{t('homepage.hero.subtitle')}</span>
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200">
                           {t('homepage.hero.description')}
                        </p>
                        
                        <div className="mt-10 max-w-md mx-auto flex flex-col sm:flex-row gap-3 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300">
                            <form onSubmit={(e) => { e.preventDefault(); onAuthNavigate(); }} className="flex-1 flex gap-2 w-full">
                                <Input
                                    type="email"
                                    placeholder={t('homepage.hero.emailPlaceholder')}
                                    className="h-12 text-base shadow-sm"
                                    aria-label="Business email"
                                />
                                <Button type="submit" size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
                                    {t('homepage.hero.trialCta')}
                                </Button>
                            </form>
                        </div>
                        <p className="text-sm text-muted-foreground mt-4 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-400">{t('homepage.hero.formMicrocopy')}</p>

                        <div className="mt-20 max-w-6xl mx-auto scroll-target">
                             <div className="flex justify-center items-center gap-2 mb-6 opacity-70">
                                <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Powered By</span>
                                <img src="https://raw.githubusercontent.com/kuttydevil/root/refs/heads/master/assets/gemini.svg" alt="Gemini AI" className="h-6 grayscale hover:grayscale-0 transition-all duration-300" />
                            </div>
                            <div className="relative rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-2 shadow-2xl hero-glow-animation ring-1 ring-white/10">
                                <InteractiveDemo />
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Social Proof Logos */}
                <section className="py-12 border-y border-border bg-muted/30">
                    <div className="container mx-auto px-6 text-center">
                        <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-8">{t('homepage.socialProof.trustedBy')}</h2>
                        <div className="flex justify-center items-center gap-x-12 gap-y-8 flex-wrap grayscale opacity-60 hover:opacity-100 transition-opacity duration-500">
                            {/* Placeholder Logos with better styling */}
                            <span className="text-2xl font-bold font-mono text-foreground">DIBANK</span>
                            <span className="text-2xl font-bold tracking-tight text-foreground">Ooredoo</span>
                            <span className="text-2xl font-serif font-black text-foreground">QNB</span>
                            <span className="text-2xl font-extrabold tracking-widest text-foreground">INAYA</span>
                            <span className="text-2xl font-bold text-foreground">CIVO</span>
                        </div>
                        <div className="mt-10 flex justify-center items-center scroll-target">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border text-sm font-medium text-muted-foreground shadow-sm">
                                <LockClosedIcon className="h-4 w-4 text-green-500" />
                                <span>{t('homepage.socialProof.security')}</span>
                            </div>
                        </div>
                    </div>
                </section>


                {/* Solution Section */}
                <section id="solution" className="py-24 bg-background">
                    <div className="container mx-auto px-6">
                        <div className="text-center max-w-3xl mx-auto scroll-target mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t('homepage.solution.title')}</h2>
                            <p className="mt-4 text-lg text-muted-foreground">{t('homepage.solution.description')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {['step1', 'step2', 'step3'].map((step, i) => (
                                <div key={step} className="group relative p-8 bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 scroll-target" style={{animationDelay: `${i * 100}ms`}}>
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <span className="text-8xl font-black text-foreground">{i + 1}</span>
                                    </div>
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                                        {i + 1}
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground mb-3">{t(`homepage.solution.${step}.title`)}</h3>
                                    <p className="text-muted-foreground leading-relaxed">{t(`homepage.solution.${step}.description`)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                
                {/* Testimonials Section */}
                <section id="testimonials" className="py-24 bg-muted/30">
                    <div className="container mx-auto px-6">
                        <div className="text-center max-w-3xl mx-auto scroll-target mb-16">
                           <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t('homepage.testimonials.title')}</h2>
                            <p className="mt-4 text-lg text-muted-foreground">{t('homepage.testimonials.description')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-card p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow scroll-target" style={{animationDelay: `${i * 100}ms`}}>
                                    <div className="flex gap-1 text-yellow-400 mb-4">
                                        {[...Array(5)].map((_, j) => (
                                            <svg key={j} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                        ))}
                                    </div>
                                    <p className="text-foreground text-lg mb-6 leading-relaxed">"{t(`homepage.testimonials.t${i}.quote`)}"</p>
                                    <div className="flex items-center gap-4 pt-6 border-t border-border">
                                        <Avatar name={t(`homepage.testimonials.t${i}.name`)} className="w-10 h-10 ring-2 ring-background" />
                                        <div>
                                            <p className="font-bold text-foreground text-sm">{t(`homepage.testimonials.t${i}.name`)}</p>
                                            <p className="text-xs text-muted-foreground">{t(`homepage.testimonials.t${i}.title`)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                
                <PricingSection onAuthNavigate={onAuthNavigate} />
                
                {/* FAQ Section */}
                <section id="faq" className="py-24 bg-background">
                    <div className="container mx-auto px-6">
                        <div className="scroll-target max-w-3xl mx-auto">
                            <div className="text-center mb-12">
                                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t('homepage.faq.title')}</h2>
                            </div>
                            <div className="space-y-4">
                                {faqs.map((faq, i) => (
                                    <div key={i} className="border border-border rounded-lg bg-card overflow-hidden scroll-target transition-all duration-200" style={{animationDelay: `${i * 100}ms`}}>
                                        <button 
                                            className="w-full flex justify-between items-center text-left p-6 font-semibold text-lg hover:bg-muted/50 transition-colors"
                                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                            aria-expanded={openFaq === i}
                                        >
                                            <span className="text-foreground/90">{faq.q}</span>
                                            <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 text-muted-foreground ${openFaq === i ? 'rotate-180 text-primary' : ''}`} />
                                        </button>
                                        <div className={`transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="p-6 pt-0 text-muted-foreground leading-relaxed">
                                                {faq.a}
                                                {i === 0 && (
                                                    <span className="block mt-2">
                                                        <a href="#" onClick={(e) => { e.preventDefault(); handleOpenPolicy('privacy'); }} className="text-primary hover:underline font-medium text-sm">
                                                            {t('homepage.faq.learnMore')} &rarr;
                                                        </a>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                 {/* CTA Section */}
                <section className="py-24 bg-background">
                    <div className="container mx-auto px-6">
                        <div className="relative rounded-3xl overflow-hidden bg-primary px-6 py-16 sm:px-16 sm:py-24 text-center shadow-2xl scroll-target">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-600 mix-blend-multiply"></div>
                            
                            <div className="relative z-10 max-w-2xl mx-auto">
                                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6">
                                    {t('homepage.cta.title')}
                                </h2>
                                <p className="text-lg text-white/90 mb-10 leading-relaxed">
                                    {t('homepage.cta.description')}
                                </p>
                                <Button 
                                    onClick={onAuthNavigate} 
                                    size="lg" 
                                    className="bg-white text-primary hover:bg-white/90 border-none shadow-xl h-14 px-8 text-lg font-semibold"
                                >
                                    {t('homepage.hero.trialCta')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer onOpenPolicy={handleOpenPolicy} />

            {viewingPolicy && (
                <LegalModal
                    isOpen={true}
                    onClose={handleClosePolicy}
                    title={viewingPolicy === 'privacy' ? t('legal.privacy.title') : t('legal.terms.title')}
                    content={viewingPolicy === 'privacy' ? <PrivacyPolicyContent /> : <TermsOfServiceContent />}
                />
            )}
        </div>
    );
};
export default HomePage;
