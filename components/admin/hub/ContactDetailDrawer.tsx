import React, { useState, useEffect, useCallback } from 'react';
import { WhatsAppInstance, WhatsAppContact, WhatsAppMessage, Priority } from '../../../types';
import { db } from '../../../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { firebaseService } from '../../../services/firebaseService';
import { MESSAGE_PAGE_SIZE } from '../../../services/firebaseService';
import { MessagePane } from '../../whatsapp/MessagePane';
import { useToast } from '../../../contexts/ToastContext';
import { useAI } from '../../../contexts/AIContext';
import { TagEditor } from '../../whatsapp/TagEditor';
import { ContactDetailsPanel } from '../../whatsapp/ContactDetailsPanel';

interface ContactDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    instance: WhatsAppInstance | null;
    contact: WhatsAppContact | null;
    onTagsUpdated: (contactName: string, newTags: string[]) => void;
    onCrmStageChange: (contactName: string, newStage: string) => void;
    onPriorityChange: (contactName: string, newPriority: Priority) => void;
    onDueDateChange: (contactName: string, newDueDate: string | null) => void;
}

const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000;

export const ContactDetailDrawer: React.FC<ContactDetailDrawerProps> = ({
    isOpen,
    onClose,
    instance,
    contact,
    onTagsUpdated,
    onCrmStageChange,
    onPriorityChange,
    onDueDateChange
}) => {
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    
    const [suggestedTags, setSuggestedTags] = useState<string[] | null>(null);
    const { generateTags, isGeneratingTags } = useAI();
    const { addToast } = useToast();
    // FIX: Add state for details panel visibility to fix missing prop error in MessagePane.
    const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(true);
    
    const triggerTagSuggestionIfNeeded = useCallback(async (
        messagesForAnalysis: WhatsAppMessage[], 
        contactForAnalysis: WhatsAppContact
    ) => {
        if (messagesForAnalysis.length < 3 || isGeneratingTags || suggestedTags) return;

        const lastMessage = messagesForAnalysis[messagesForAnalysis.length - 1];
        if (new Date().getTime() - new Date(lastMessage.timestamp).getTime() > INACTIVITY_THRESHOLD_MS) {
            try {
                const tags = await generateTags(messagesForAnalysis);
                if (tags.length > 0) {
                    const newSuggestions = tags.filter(t => !(contactForAnalysis.tags || []).includes(t));
                    if (newSuggestions.length > 0) setSuggestedTags(newSuggestions);
                }
            } catch (e) {
                console.error("Failed to generate tags for inactive conversation:", e);
            }
        }
    }, [isGeneratingTags, suggestedTags, generateTags]);

    useEffect(() => {
        if (!isOpen || !instance || !contact) {
            setMessages([]);
            return;
        };
        
        // When drawer opens, always show the details panel.
        setIsDetailsPanelOpen(true);

        const fetchInitialMessages = async () => {
            setMessagesLoading(true);
            setMessagesError(null);
            try {
                const initialMessages = await firebaseService.getWhatsAppMessages(instance.id, contact.contact_name, 1);
                setMessages(initialMessages);
                setCurrentPage(1);
                setHasMoreMessages(initialMessages.length === MESSAGE_PAGE_SIZE);
                await triggerTagSuggestionIfNeeded(initialMessages, contact);
            } catch (e: any) {
                setMessagesError(e.message || 'Failed to load messages.');
            } finally {
                setMessagesLoading(false);
            }
        };

        fetchInitialMessages();

        const q = query(
            collection(db, 'whatsapp_messages'),
            where('instanceId', '==', instance.id),
            where('contactName', '==', contact.contact_name),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    const newMessage = firebaseService.toWhatsAppMessage(change.doc);
                    setMessages(prev => {
                        const existingMsgIndex = prev.findIndex(m => m.id === newMessage.id);
                        if (existingMsgIndex > -1) {
                            const newMessages = [...prev];
                            newMessages[existingMsgIndex] = newMessage;
                            return newMessages;
                        }
                        return [...prev, newMessage];
                    });
                }
            });
        });

        return () => {
            unsubscribe();
            setMessages([]);
            setSuggestedTags(null);
        };
    }, [isOpen, instance, contact, triggerTagSuggestionIfNeeded]);
    
    const handleSendMessage = async (messageText: string, imageBase64: string | null) => {
        if (isSending || !instance || !contact) return;
        setIsSending(true);

        try {
            const newId = await firebaseService.sendWhatsAppMessage({
                instanceId: instance.id,
                contactName: contact.contact_name,
                messageText,
                imageBase64,
            });

            const optimisticMessage: WhatsAppMessage = {
                id: newId || `temp-${Date.now()}`,
                instanceId: instance.id,
                contactName: contact.contact_name,
                sender: 'agent',
                messageText: messageText || undefined,
                imageUrl: imageBase64 || undefined,
                isRead: true,
                timestamp: new Date().toISOString(),
                status: 'sending',
            };
            setMessages(prev => [...prev, optimisticMessage]);

        } catch (error: any) {
             addToast(`Error: ${error.message}`, { type: 'error' });
        } finally {
            setIsSending(false);
        }
    };

    const handleLoadMoreMessages = async () => {
        if (isLoadingMore || !hasMoreMessages || !instance || !contact) return;
        setIsLoadingMore(true);
        setLoadMoreError(null);
        const nextPage = currentPage + 1;

        try {
            const olderMessages = await firebaseService.getWhatsAppMessages(instance.id, contact.contact_name, nextPage);
            if (olderMessages.length > 0) {
                setMessages(prev => [...olderMessages, ...prev]);
            }
            setCurrentPage(nextPage);
            setHasMoreMessages(olderMessages.length === MESSAGE_PAGE_SIZE);
        } catch (e: any) {
            setLoadMoreError(e.message || "Failed to load older messages.");
        } finally {
            setIsLoadingMore(false);
        }
    };
    
    const handleSaveSuggestedTags = async (tagsToSave: string[]) => {
        if (!instance || !contact) return;
        try {
            await firebaseService.updateContactTags(instance.id, contact.contact_name, tagsToSave);
            onTagsUpdated(contact.contact_name, tagsToSave);
            addToast('Tags updated successfully!', { type: 'success' });
            setSuggestedTags(null);
        } catch (error: any) {
            addToast(`Failed to update tags: ${error.message}`, { type: 'error' });
        }
    };
    
    if (!contact || !instance) return null;

    return (
        <>
            {/* Overlay */}
            <div 
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-4xl bg-brand-primary shadow-2xl z-50 flex transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <MessagePane
                    instance={instance}
                    contact={contact}
                    messages={messages}
                    isLoading={messagesLoading}
                    onSendMessage={handleSendMessage}
                    isSending={isSending}
                    onLoadMore={handleLoadMoreMessages}
                    hasMore={hasMoreMessages}
                    isLoadingMore={isLoadingMore}
                    error={messagesError}
                    loadMoreError={loadMoreError}
                    onBack={onClose}
                    suggestedTags={suggestedTags}
                    onSaveSuggestedTags={handleSaveSuggestedTags}
                    onDismissSuggestions={() => setSuggestedTags(null)}
                    onToggleDetailsPanel={() => setIsDetailsPanelOpen(p => !p)}
                    isDetailsPanelOpen={isDetailsPanelOpen}
                />
                 {isDetailsPanelOpen && <ContactDetailsPanel 
                    contact={contact}
                    instance={instance}
                    onClose={onClose}
                    onTagsUpdated={onTagsUpdated}
                    onCrmStageChange={onCrmStageChange}
                    onPriorityChange={onPriorityChange}
                    onDueDateChange={onDueDateChange}
                />}
            </div>
        </>
    );
};
export default ContactDetailDrawer;
