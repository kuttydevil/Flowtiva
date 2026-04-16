
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { AgentDetails } from '../../types';
import { Card } from '../ui/Card';
import { useAI } from '../../contexts/AIContext';
import { useTranslation } from '../../contexts/LanguageContext';

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

interface PromptGeneratorProps {
    onPromptGenerated: (prompt: string) => void;
    useCase: 'business' | 'personal';
    onCancel?: () => void;
}

export const PromptGenerator: React.FC<PromptGeneratorProps> = ({ onPromptGenerated, useCase, onCancel }) => {
    const { t } = useTranslation();
    const [details, setDetails] = useState<Partial<AgentDetails>>({});
    const { generateSystemPrompt, isGeneratingPrompt, promptError } = useAI();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const finalDetails: AgentDetails = {
                businessName: details.businessName || '',
                businessType: details.businessType || '',
                services: details.services || '',
                agentName: details.agentName || '',
                agentPersonality: details.agentPersonality || '',
                knowledgeBase: details.knowledgeBase || '',
                specificInstructions: details.specificInstructions || 'None',
            };

            if (useCase === 'business' && !finalDetails.businessName) {
                throw new Error(t('whatsapp.promptGenerator.business.nameLabel') + " required.");
            }
             if (useCase === 'personal' && !finalDetails.agentName) {
                throw new Error(t('whatsapp.promptGenerator.personal.nameLabel') + " required.");
            }

            const generatedPrompt = await generateSystemPrompt(finalDetails, useCase);
            onPromptGenerated(generatedPrompt);
        } catch (e: any) {
           console.error("Prompt generation failed:", e.message);
        }
    };

    const businessForm = (
        <div className="space-y-5">
            <div>
                <label htmlFor="businessName" className="text-xs font-bold text-foreground uppercase tracking-wider">{t('whatsapp.promptGenerator.business.nameLabel')}</label>
                <Input id="businessName" name="businessName" value={details.businessName || ''} onChange={handleInputChange} placeholder={t('whatsapp.promptGenerator.business.namePlaceholder')} required className="mt-2 h-10 bg-background/50 border-border/50 rounded-xl focus-visible:ring-2 focus-visible:ring-ring transition-all" />
            </div>
            <div>
                <label htmlFor="businessType" className="text-xs font-bold text-foreground uppercase tracking-wider">{t('whatsapp.promptGenerator.business.typeLabel')}</label>
                <Input id="businessType" name="businessType" value={details.businessType || ''} onChange={handleInputChange} placeholder={t('whatsapp.promptGenerator.business.typePlaceholder')} className="mt-2 h-10 bg-background/50 border-border/50 rounded-xl focus-visible:ring-2 focus-visible:ring-ring transition-all"/>
            </div>
             <div>
                <label htmlFor="services" className="text-xs font-bold text-foreground uppercase tracking-wider">{t('whatsapp.promptGenerator.business.servicesLabel')}</label>
                <Textarea id="services" name="services" value={details.services || ''} onChange={handleInputChange} placeholder={t('whatsapp.promptGenerator.business.servicesPlaceholder')} className="mt-2 h-32 text-sm bg-background/50 border-border/50 rounded-xl focus-visible:ring-2 focus-visible:ring-ring transition-all resize-none p-3" />
                <p className="text-[11px] text-muted-foreground mt-2 italic">{t('whatsapp.promptGenerator.business.servicesHelp')}</p>
            </div>
        </div>
    );

    const personalForm = (
         <div className="space-y-5">
            <div>
                <label htmlFor="agentName" className="text-xs font-bold text-foreground uppercase tracking-wider">{t('whatsapp.promptGenerator.personal.nameLabel')}</label>
                <Input id="agentName" name="agentName" value={details.agentName || ''} onChange={handleInputChange} placeholder={t('whatsapp.promptGenerator.personal.namePlaceholder')} required className="mt-2 h-10 bg-background/50 border-border/50 rounded-xl focus-visible:ring-2 focus-visible:ring-ring transition-all"/>
            </div>
            <div>
                <label htmlFor="agentPersonality" className="text-xs font-bold text-foreground uppercase tracking-wider">{t('whatsapp.promptGenerator.personal.personalityLabel')}</label>
                <Input id="agentPersonality" name="agentPersonality" value={details.agentPersonality || ''} onChange={handleInputChange} placeholder={t('whatsapp.promptGenerator.personal.personalityPlaceholder')} className="mt-2 h-10 bg-background/50 border-border/50 rounded-xl focus-visible:ring-2 focus-visible:ring-ring transition-all"/>
            </div>
             <div>
                <label htmlFor="knowledgeBase" className="text-xs font-bold text-foreground uppercase tracking-wider">{t('whatsapp.promptGenerator.personal.knowledgeLabel')}</label>
                <Textarea id="knowledgeBase" name="knowledgeBase" value={details.knowledgeBase || ''} onChange={handleInputChange} placeholder={t('whatsapp.promptGenerator.personal.knowledgePlaceholder')} className="mt-2 h-32 text-sm bg-background/50 border-border/50 rounded-xl focus-visible:ring-2 focus-visible:ring-ring transition-all resize-none p-3" />
            </div>
        </div>
    );

    return (
        <div className="mt-2">
            <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">{t('whatsapp.promptGenerator.description', { useCase: useCase === 'business' ? t('whatsapp.connectModal.step1.businessTitle') : t('whatsapp.connectModal.step1.personalTitle') })}</p>
            <Card className="bg-muted/20 border-border/50 shadow-sm overflow-hidden rounded-2xl">
                <form onSubmit={handleSubmit}>
                    <div className="p-5 max-h-[400px] overflow-y-auto space-y-5">
                        {useCase === 'business' ? businessForm : personalForm}
                        <div className="pt-2">
                            <label htmlFor="specificInstructions" className="text-xs font-bold text-foreground uppercase tracking-wider">{t('whatsapp.promptGenerator.instructionsLabel')}</label>
                            <Input id="specificInstructions" name="specificInstructions" value={details.specificInstructions || ''} onChange={handleInputChange} placeholder={t('whatsapp.promptGenerator.instructionsPlaceholder')} className="mt-2 h-10 bg-background/50 border-border/50 rounded-xl focus-visible:ring-2 focus-visible:ring-ring transition-all" />
                            <p className="text-[11px] text-muted-foreground mt-2 italic">{t('whatsapp.promptGenerator.instructionsHelp')}</p>
                        </div>
                        {promptError && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">
                                {promptError}
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-muted/30 border-t border-border/50 flex justify-end items-center gap-3">
                        {onCancel && (
                            <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-xs font-medium rounded-xl hover:bg-muted/50">
                                {t('common.back')}
                            </Button>
                        )}
                        <Button type="submit" size="sm" disabled={isGeneratingPrompt} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-xl px-5 font-bold text-xs h-9 transition-all active:scale-95">
                            <SparklesIcon className="h-3.5 w-3.5 mr-2 animate-pulse"/>
                            {isGeneratingPrompt ? t('whatsapp.promptGenerator.generating') : t('whatsapp.promptGenerator.generateButton')}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
