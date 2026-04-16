
import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from './Modal';
import { Button } from './Button';
import { Textarea } from './Textarea';
import { WhatsAppInstance } from '../../types';
import { PromptGenerator } from '../whatsapp/PromptGenerator';
import { useTranslation } from '../../contexts/LanguageContext';

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);
const ToolsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.495-2.495a1.125 1.125 0 0 1 1.591 1.591l-2.495 2.495M11.42 15.17 1.071 4.717A4.5 4.5 0 0 1 4.717 1.07l10.551 10.55M2.101 5.772 6.84 1.03m-4.74 4.74 1.746-1.746" />
    </svg>
);


interface InstanceSettingsModalProps {
  instance: WhatsAppInstance | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (instanceId: string, updates: { customPrompt: string, enabled_tools: string[], context: string }) => Promise<void>;
}

export const InstanceSettingsModal: React.FC<InstanceSettingsModalProps> = ({ instance, isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [customPrompt, setCustomPrompt] = useState('');
  const [context, setContext] = useState('');
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const ALL_TOOLS = [
    { id: 'update_crm_stage', label: t('whatsapp.settingsModal.tools.update_crm_stage.label'), description: t('whatsapp.settingsModal.tools.update_crm_stage.description')},
    { id: 'add_tag', label: t('whatsapp.settingsModal.tools.add_tag.label'), description: t('whatsapp.settingsModal.tools.add_tag.description') },
    { id: 'set_due_date', label: t('whatsapp.settingsModal.tools.set_due_date.label'), description: t('whatsapp.settingsModal.tools.set_due_date.description') },
    { id: 'update_priority', label: t('whatsapp.settingsModal.tools.update_priority.label'), description: t('whatsapp.settingsModal.tools.update_priority.description')},
  ];

  useEffect(() => {
    if (instance) {
      setCustomPrompt(instance.customPrompt);
      setContext(instance.context || '');
      setEnabledTools(instance.enabled_tools || []);
      setIsGenerating(false); // Reset generator view on instance change
      setError(null); // Clear previous errors
    }
  }, [instance]);

  const handleSave = async () => {
    if (!instance) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(instance.id, { customPrompt, enabled_tools: enabledTools, context });
      onClose();
    } catch (e: any) {
      // Check for the specific database schema error and provide a more helpful message.
      if (e.message && e.message.includes("Could not find the 'enabled_tools' column")) {
        setError(t('whatsapp.settingsModal.errors.schemaUpdate'));
      } else {
        setError(e.message || t('whatsapp.settingsModal.errors.saveFailed'));
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleToolToggle = (toolId: string) => {
      setEnabledTools(prev => 
        prev.includes(toolId) ? prev.filter(id => id !== toolId) : [...prev, toolId]
      );
  };

  if (!isOpen || !instance) return null;

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        <ModalHeader className="border-b">
          <ModalTitle>{t('whatsapp.settingsModal.title', { phoneNumber: instance.phoneNumber })}</ModalTitle>
          <ModalDescription>{t('whatsapp.settingsModal.description')}</ModalDescription>
        </ModalHeader>
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md p-3" role="alert">
              {error}
            </div>
          )}
          {isGenerating ? (
              <PromptGenerator 
                useCase={instance.agentType}
                onPromptGenerated={(prompt) => {
                  setCustomPrompt(prompt);
                  setIsGenerating(false);
                }} 
                onCancel={() => setIsGenerating(false)}
              />
          ) : (
            <>
              <div>
                <label htmlFor="context" className="text-sm font-medium text-foreground">{t('whatsapp.settingsModal.context.label')}</label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('whatsapp.settingsModal.context.help')}
                </p>
                <Textarea 
                  id="context" 
                  value={context} 
                  onChange={e => setContext(e.target.value)} 
                  className="mt-1 h-32 font-mono text-xs" 
                  placeholder={t('whatsapp.settingsModal.context.placeholder')}
                  disabled={isSaving}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="custom-prompt" className="text-sm font-medium text-foreground">{t('whatsapp.settingsModal.prompt.label')}</label>
                  <Button variant="outline" size="sm" onClick={() => setIsGenerating(true)}>
                      <SparklesIcon className="h-4 w-4 mr-2"/>
                      {t('whatsapp.settingsModal.prompt.generate')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('whatsapp.settingsModal.prompt.help')}
                </p>
                <Textarea 
                  id="custom-prompt" 
                  value={customPrompt} 
                  onChange={e => setCustomPrompt(e.target.value)} 
                  className="mt-1 h-32 font-mono text-xs" 
                  disabled={isSaving}
                />
              </div>

               <div>
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                    <ToolsIcon className="h-5 w-5"/>
                    {t('whatsapp.settingsModal.tools.title')}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('whatsapp.settingsModal.tools.help')}
                </p>
                <div className="space-y-3">
                    {ALL_TOOLS.map(tool => (
                        <label key={tool.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enabledTools.includes(tool.id)}
                                onChange={() => handleToolToggle(tool.id)}
                                className="mt-1 h-4 w-4 rounded text-accent focus:ring-accent border-border"
                            />
                            <div>
                                <p className="font-medium text-sm text-foreground">{tool.label}</p>
                                <p className="text-xs text-muted-foreground">{tool.description}</p>
                            </div>
                        </label>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
        {!isGenerating && (
          <ModalFooter>
            <Button variant="outline" onClick={onClose} disabled={isSaving}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={isSaving || !customPrompt.trim()}>
              {isSaving ? t('whatsapp.settingsModal.saving') : t('whatsapp.settingsModal.save')}
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
};
// FIX: Add default export for compatibility with React.lazy
export default InstanceSettingsModal;
