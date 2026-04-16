
import React, { useState, useEffect } from 'react';
import { supabase, whatsAppInstanceFromSupabase } from '../../services/supabaseService';
import { WhatsAppInstance } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PromptGenerator } from './PromptGenerator';
import { useTranslation } from '../../contexts/LanguageContext';

const BusinessIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 11.25h6m-6 4.5h6M6.75 21v-2.25a2.25 2.25 0 0 1 2.25-2.25h6a2.25 2.25 0 0 1 2.25 2.25V21" /></svg>;
const PersonIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>;
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z" clipRule="evenodd" /></svg>;

const LinkingStatusViewer = () => {
    const { t } = useTranslation();
    const messages = [
        t('whatsapp.connectModal.linkingStatus.init'),
        t('whatsapp.connectModal.linkingStatus.connect'),
        t('whatsapp.connectModal.linkingStatus.request'),
        t('whatsapp.connectModal.linkingStatus.wait'),
        t('whatsapp.connectModal.linkingStatus.prepare')
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setIndex(prev => (prev + 1) % messages.length);
        }, 3000);
        return () => clearInterval(intervalId);
    }, [messages.length]);

    return (
        <div className="text-center py-8">
            <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p key={index} className="text-sm font-medium text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">{messages[index]}</p>
        </div>
    );
};


interface AddInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkSuccess: (instance: WhatsAppInstance) => void;
}

export const AddInstanceModal: React.FC<AddInstanceModalProps> = ({ isOpen, onClose, onLinkSuccess }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [agentType, setAgentType] = useState<'business' | 'personal' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [newlyCreatedInstance, setNewlyCreatedInstance] = useState<WhatsAppInstance | null>(null);
  const { addToast } = useToast();
  const [isLinked, setIsLinked] = useState(false);

  useEffect(() => {
    // Reset state when modal is closed/reopened
    if (isOpen) {
      setStep(1);
      setAgentType(null);
      setPhoneNumber('');
      setCustomPrompt('');
      setIsLoading(false);
      setLinkingCode(null);
      setNewlyCreatedInstance(null);
      setIsLinked(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!newlyCreatedInstance) return;

    const channel = supabase.channel(`linking-code-${newlyCreatedInstance.id}`);
    channel.on<any>('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_linking_codes',
        filter: `instance_id=eq.${newlyCreatedInstance.id}`
    }, (payload: any) => {
        if (payload.new.code) {
            setLinkingCode(payload.new.code);
            setIsLoading(false);
        }
    })
    .on<any>('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'whatsapp_instances', filter: `id=eq.${newlyCreatedInstance.id}`
    }, (payload: any) => {
        if (payload.new.status === 'running') {
            setIsLinked(true);
            setNewlyCreatedInstance(whatsAppInstanceFromSupabase(payload.new));
        }
    })
    .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [newlyCreatedInstance]);

  const handleCreateInstance = async () => {
    setIsLoading(true);
    try {
        const instance = await supabase.addWhatsAppInstance(phoneNumber, customPrompt, agentType!);
        setNewlyCreatedInstance(instance);
        setStep(3);
    } catch (error: any) {
        addToast(error.message, { type: 'error' });
        setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch(step) {
      case 1:
        return (
          <>
            <ModalHeader className="pb-2">
              <ModalTitle className="text-2xl font-bold tracking-tight">{t('whatsapp.connectModal.step1.title')}</ModalTitle>
              <ModalDescription className="text-[15px]">{t('whatsapp.connectModal.step1.description')}</ModalDescription>
            </ModalHeader>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => { setAgentType('business'); setStep(2); }} className="p-6 bg-muted/20 border border-border/50 rounded-[24px] text-left hover:border-primary/30 hover:bg-primary/5 transition-all group active:scale-[0.98]">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                    <BusinessIcon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-1">{t('whatsapp.connectModal.step1.businessTitle')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t('whatsapp.connectModal.step1.businessDesc')}</p>
              </button>
              <button onClick={() => { setAgentType('personal'); setStep(2); }} className="p-6 bg-muted/20 border border-border/50 rounded-[24px] text-left hover:border-primary/30 hover:bg-primary/5 transition-all group active:scale-[0.98]">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                    <PersonIcon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-1">{t('whatsapp.connectModal.step1.personalTitle')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t('whatsapp.connectModal.step1.personalDesc')}</p>
              </button>
            </div>
            <ModalFooter className="bg-muted/10 border-t border-border/50">
                <Button variant="ghost" onClick={onClose} className="rounded-xl font-medium">{t('whatsapp.connectModal.buttons.cancel')}</Button>
            </ModalFooter>
          </>
        );
      case 2:
        return (
          <>
            <ModalHeader className="pb-2">
              <ModalTitle className="text-2xl font-bold tracking-tight">{agentType === 'business' ? t('whatsapp.connectModal.step2.businessTitle') : t('whatsapp.connectModal.step2.personalTitle')}</ModalTitle>
              <ModalDescription className="text-[15px]">{t('whatsapp.connectModal.step2.description')}</ModalDescription>
            </ModalHeader>
            <div className="p-6 space-y-6">
               <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">{t('whatsapp.connectModal.step2.phoneLabel')}</label>
                <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder={t('whatsapp.connectModal.step2.phonePlaceholder')} className="mt-2 h-12 bg-muted/30 border-border/50 rounded-xl focus-visible:ring-2 focus-visible:ring-ring text-lg font-medium px-4" />
              </div>
              <div>
                 <label className="text-xs font-bold text-foreground uppercase tracking-wider">{t('whatsapp.connectModal.step2.aiLabel')}</label>
                 <PromptGenerator 
                    useCase={agentType!}
                    onPromptGenerated={(prompt) => setCustomPrompt(prompt)}
                    onCancel={() => setStep(1)}
                 />
              </div>
            </div>
             <ModalFooter className="bg-muted/10 border-t border-border/50">
                <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl font-medium">{t('whatsapp.connectModal.buttons.back')}</Button>
                <Button onClick={handleCreateInstance} disabled={isLoading || !phoneNumber || !customPrompt} className="rounded-xl font-bold px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">
                    {isLoading ? t('whatsapp.connectModal.step2.generating') : t('whatsapp.connectModal.step2.generateCode')}
                </Button>
            </ModalFooter>
          </>
        );
      case 3:
        if (isLinked && newlyCreatedInstance) {
            return (
                 <>
                    <ModalHeader className="text-center pb-2">
                        <div className="w-20 h-20 bg-status-green/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-status-green/5">
                            <CheckCircleIcon className="h-12 w-12 text-status-green" />
                        </div>
                        <ModalTitle className="text-2xl font-bold text-status-green">{t('whatsapp.connectModal.step3.successTitle')}</ModalTitle>
                        <ModalDescription className="text-[15px]">{t('whatsapp.connectModal.step3.successDesc', { phoneNumber: newlyCreatedInstance.phoneNumber })}</ModalDescription>
                    </ModalHeader>
                    <div className="p-6">
                        <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 text-center">
                            <p className="text-sm text-muted-foreground mb-2">{t('whatsapp.connectModal.step3.successMessage') || 'Your instance is now active and ready to handle conversations.'}</p>
                        </div>
                    </div>
                    <ModalFooter className="bg-muted/10 border-t border-border/50">
                        <Button variant="ghost" onClick={onClose} className="rounded-xl font-medium">{t('whatsapp.connectModal.buttons.done')}</Button>
                        <Button onClick={() => onLinkSuccess(newlyCreatedInstance)} className="rounded-xl font-bold px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">{t('whatsapp.connectModal.buttons.viewChats')}</Button>
                    </ModalFooter>
                </>
            );
        }
        return (
          <>
            <ModalHeader className="pb-2">
              <ModalTitle className="text-2xl font-bold tracking-tight">{t('whatsapp.connectModal.step3.linkTitle')}</ModalTitle>
              <ModalDescription className="text-[15px]">{t('whatsapp.connectModal.step3.linkDesc', { phoneNumber: phoneNumber })}</ModalDescription>
            </ModalHeader>
            <div className="p-10 text-center">
              {isLoading && (
                 <LinkingStatusViewer />
              )}
              {linkingCode && (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">{t('whatsapp.connectModal.step3.codeLabel')}</p>
                    <div className="mb-6 text-5xl font-black tracking-[0.2em] text-primary bg-primary/5 border border-primary/10 py-8 rounded-[32px] shadow-inner shadow-primary/5">
                        {linkingCode}
                    </div>
                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 max-w-sm mx-auto">
                        <p className="text-[13px] text-muted-foreground leading-relaxed">{t('whatsapp.connectModal.step3.instructions')}</p>
                    </div>
                </div>
              )}
               {!isLoading && !linkingCode && (
                   <LinkingStatusViewer />
               )}
            </div>
            <ModalFooter className="bg-muted/10 border-t border-border/50">
              <Button variant="ghost" onClick={onClose} className="rounded-xl font-medium">{t('whatsapp.connectModal.buttons.close')}</Button>
            </ModalFooter>
          </>
        )
      default: return null;
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>{renderStepContent()}</ModalContent>
    </Modal>
  );
};

export default AddInstanceModal;
