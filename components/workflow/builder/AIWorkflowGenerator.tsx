import React, { useState } from 'react';
import { Workflow } from '../../../types';
import { Button } from '../../ui/Button';
import { Textarea } from '../../ui/Textarea';
import { Card } from '../../ui/Card';
import { useAI } from '../../../contexts/AIContext';

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

interface AIWorkflowGeneratorProps {
    onWorkflowGenerated: (workflow: Partial<Workflow>) => void;
    onStartFromScratch: () => void;
}

export const AIWorkflowGenerator: React.FC<AIWorkflowGeneratorProps> = ({ onWorkflowGenerated, onStartFromScratch }) => {
    const [prompt, setPrompt] = useState('');
    const { generateWorkflow, isGeneratingWorkflow, workflowError } = useAI();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isGeneratingWorkflow) return;
        try {
            const generatedWorkflow = await generateWorkflow(prompt);
            onWorkflowGenerated(generatedWorkflow);
        } catch (e: any) {
            console.error("Workflow generation failed:", e.message);
        }
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
            <Card className="w-full max-w-lg animate-in fade-in-0 zoom-in-95 backdrop-blur-sm bg-brand-primary/80">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-brand-accent/10 rounded-full text-brand-accent mt-1">
                                <SparklesIcon className="w-6 h-6"/>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-brand-text-primary">Create with AI</h2>
                                <p className="text-sm text-brand-text-secondary mt-1">Describe the automation you want to create, and we'll build it for you.</p>
                            </div>
                        </div>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., When a new contact messages me, send them a welcome message 'Hello! Thanks for reaching out.' and then add the tag 'new-lead'."
                            className="mt-4 h-32 bg-brand-primary/50"
                            disabled={isGeneratingWorkflow}
                        />
                        {workflowError && <p className="text-xs text-status-red mt-2">{workflowError}</p>}
                    </div>
                    <div className="p-4 bg-brand-secondary/50 rounded-b-xl border-t border-brand-border flex justify-between items-center">
                        <Button type="button" variant="ghost" onClick={onStartFromScratch}>
                            or build manually
                        </Button>
                        <Button type="submit" disabled={isGeneratingWorkflow || !prompt.trim()}>
                            {isGeneratingWorkflow ? 'Generating...' : 'Generate Workflow'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};