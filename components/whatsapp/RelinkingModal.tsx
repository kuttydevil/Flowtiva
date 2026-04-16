import React, { useState, useEffect } from 'react';
import { supabase, whatsAppInstanceFromSupabase } from '../../services/supabaseService';
import { WhatsAppInstance, WhatsAppLinkingCode } from '../../types';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';

const LinkingStatusViewer = () => {
    const messages = [
        "Initializing worker process on our server...",
        "Establishing a secure connection to WhatsApp...",
        "Requesting linking code from Meta...",
        "This can sometimes take up to 30 seconds.",
        "Almost there, preparing your secure code..."
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setIndex(prev => (prev + 1) % messages.length);
        }, 3000);
        return () => clearInterval(intervalId);
    }, []);

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

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z" clipRule="evenodd" /></svg>;


interface RelinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: WhatsAppInstance | null;
  onDelete: (instance: WhatsAppInstance) => void;
  onLinkSuccess: (instance: WhatsAppInstance) => void;
}

export const RelinkingModal: React.FC<RelinkingModalProps> = ({ isOpen, onClose, instance, onDelete, onLinkSuccess }) => {
  const [linkingCode, setLinkingCode] = useState<WhatsAppLinkingCode | null>(null);
  const [currentInstance, setCurrentInstance] = useState<WhatsAppInstance | null>(instance);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentInstance(instance);
  }, [instance]);

  useEffect(() => {
    if (!isOpen || !instance) return;

    const fetchCode = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const code = await supabase.getLatestLinkingCode(instance.id);
        setLinkingCode(code);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCode();

    const channel = supabase.channel(`relinking-${instance.id}`);
    
    channel.on<any>('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'whatsapp_linking_codes', filter: `instance_id=eq.${instance.id}`
    }, (payload: any) => {
        if (payload.new.code) {
            setLinkingCode(payload.new);
            setIsLoading(false);
        }
    })
    .on<any>('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'whatsapp_instances', filter: `id=eq.${instance.id}`
    }, (payload: any) => {
        const updatedInstance = whatsAppInstanceFromSupabase(payload.new);
        setCurrentInstance(updatedInstance);
    })
    .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [isOpen, instance]);

  if (!isOpen || !currentInstance) return null;

  const isLinked = currentInstance.status === 'running';

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        {isLinked ? (
            <>
                <ModalHeader className="text-center pb-2">
                    <div className="w-20 h-20 bg-status-green/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-status-green/5">
                        <CheckCircleIcon className="h-12 w-12 text-status-green" />
                    </div>
                    <ModalTitle className="text-2xl font-bold text-status-green">Account Linked Successfully!</ModalTitle>
                    <ModalDescription className="text-[15px]">Your account for +974{currentInstance.phoneNumber} is now connected and running.</ModalDescription>
                </ModalHeader>
                <div className="p-6">
                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 text-center">
                        <p className="text-sm text-muted-foreground">Your instance is now active and ready to handle conversations.</p>
                    </div>
                </div>
                <ModalFooter className="bg-muted/10 border-t border-border/50">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl font-medium">Done</Button>
                    <Button onClick={() => onLinkSuccess(currentInstance)} className="rounded-xl font-bold px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">View Chats</Button>
                </ModalFooter>
            </>
        ) : (
            <>
                <ModalHeader className="pb-2">
                    <ModalTitle className="text-2xl font-bold tracking-tight">Account Linking</ModalTitle>
                    <ModalDescription className="text-[15px]">Complete the linking process on your phone for +974{currentInstance.phoneNumber}.</ModalDescription>
                </ModalHeader>
                <div className="p-10 text-center">
                    {isLoading ? (
                        <div className="py-8">
                            <div className="relative w-12 h-12 mx-auto mb-4">
                                <div className="absolute inset-0 border-3 border-primary/20 rounded-full"></div>
                                <div className="absolute inset-0 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Fetching linking status...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-sm text-destructive font-medium">
                            {error}
                        </div>
                    ) : linkingCode?.code ? (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Enter this code on your phone:</p>
                            <div className="mb-6 text-5xl font-black tracking-[0.2em] text-primary bg-primary/5 border border-primary/10 py-8 rounded-[32px] shadow-inner shadow-primary/5">
                                {linkingCode.code}
                            </div>
                            <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 max-w-sm mx-auto">
                                <p className="text-[13px] text-muted-foreground leading-relaxed">Go to WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a device &gt; Link with phone number instead.</p>
                            </div>
                        </div>
                    ) : (
                        <LinkingStatusViewer />
                    )}
                </div>
                <ModalFooter className="bg-muted/10 border-t border-border/50">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl font-medium">Close</Button>
                    <Button variant="destructive" onClick={() => onDelete(currentInstance)} className="rounded-xl font-bold px-4 transition-all active:scale-95">Cancel Linking</Button>
                </ModalFooter>
            </>
        )}
      </ModalContent>
    </Modal>
  );
};
// FIX: Add default export for compatibility with React.lazy
export default RelinkingModal;
