import React from 'react';
import { Workflow } from '../../../types';
import { Button } from '../../ui/Button';
import { Skeleton } from '../../ui/Skeleton';
import { Card, CardContent } from '../../ui/Card';

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>;
const WandIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-2.122.398l-4.435 4.435a1.5 1.5 0 0 0-.435 1.06c.003.828.672 1.5 1.5 1.5l4.435-4.435a3 3 0 0 0 .398-2.122Zm0 0a3 3 0 0 1-2.122-.398m2.122.398a3 3 0 0 0 2.122-.398M12.75 9.322a3 3 0 0 0-2.122.398l-4.435 4.435a1.5 1.5 0 0 0-.435 1.06c.003.828.672 1.5 1.5 1.5l4.435-4.435a3 3 0 0 0 .398-2.122Zm0 0a3 3 0 0 1-2.122-.398m2.122.398a3 3 0 0 0 2.122-.398M16 5.322a3 3 0 0 0-2.122.398l-4.435 4.435a1.5 1.5 0 0 0-.435 1.06c.003.828.672 1.5 1.5 1.5l4.435-4.435a3 3 0 0 0 .398-2.122Zm0 0a3 3 0 0 1-2.122-.398m2.122.398a3 3 0 0 0 2.122-.398" /></svg>;
const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-4.991-2.691v4.99" /></svg>;


interface AIWorkflowSuggestionsProps {
    suggestions: Partial<Workflow>[];
    isLoading: boolean;
    onImplement: (suggestion: Partial<Workflow>) => void;
    onRegenerate: () => void;
}

const SuggestionSkeleton = () => (
    <Card className="bg-brand-secondary/50 border-brand-border/50">
        <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex justify-end pt-2">
                <Skeleton className="h-9 w-24" />
            </div>
        </CardContent>
    </Card>
);

export const AIWorkflowSuggestions: React.FC<AIWorkflowSuggestionsProps> = ({ suggestions, isLoading, onImplement, onRegenerate }) => {
    
    const getTriggerText = (s: Partial<Workflow>) => {
        if (!s.trigger) return "Invalid";
        switch (s.trigger.type) {
            case 'new_contact_message': return 'When a new contact messages,';
            case 'crm_stage_changed': return `When contact stage becomes "${s.trigger.config?.stage}",`;
            default: `When ${s.trigger.type},`;
        }
    };

    const getActionsText = (s: Partial<Workflow>) => {
        if (!s.actions || s.actions.length === 0) return "do nothing.";
        return s.actions.map(a => {
            switch (a.type) {
                case 'send_whatsapp_message': return 'send a message';
                case 'add_tag': return `add tag "${a.config.tag}"`;
                case 'change_crm_stage': return `change stage to "${a.config.stage}"`;
                case 'wait': return `wait for ${a.config.days} day(s)`;
                default: return a.type;
            }
        }).join(', then ');
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-semibold text-brand-text-primary flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-brand-accent" />
                    AI Workflow Suggestions
                </h2>
                <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={isLoading}>
                    <RefreshIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Regenerate
                </Button>
            </div>
           
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    [...Array(3)].map((_, i) => <SuggestionSkeleton key={i} />)
                ) : suggestions.length === 0 ? (
                    <div className="lg:col-span-3 text-center p-8 bg-brand-secondary/30 rounded-lg border border-brand-border/50">
                        <p className="text-sm text-brand-text-secondary">Could not generate suggestions at this time. Please try again.</p>
                    </div>
                ) : (
                    suggestions.map((s, i) => (
                        <Card key={i} className="bg-brand-secondary/50 border-brand-border/50 flex flex-col justify-between">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-brand-text-primary mb-2">{s.name}</h3>
                                <p className="text-sm text-brand-text-secondary">
                                    <span className="font-medium">{getTriggerText(s)}</span> {getActionsText(s)}.
                                </p>
                            </CardContent>
                             <div className="p-3 border-t border-brand-border/50 text-right">
                                <Button variant="outline" size="sm" onClick={() => onImplement(s)}>
                                    <WandIcon className="w-4 h-4 mr-2" />
                                    Implement
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};