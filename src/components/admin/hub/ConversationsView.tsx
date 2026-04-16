import React, { useState, useEffect, useCallback } from 'react';
import { WhatsAppInstance, WhatsAppContact, WhatsAppMessage, Priority } from '../../../../types';
import { supabase, whatsAppMessageFromSupabase, MESSAGE_PAGE_SIZE } from '../../../../services/supabaseService';
import { useToast } from '../../../../contexts/ToastContext';
import { ContactList } from '../../../../components/whatsapp/ContactList';
import { MessagePane } from '../../../../components/whatsapp/MessagePane';
import { Home as WhatsAppHome } from '../../../components/whatsapp/Home';
import { useAI } from '../../../../contexts/AIContext';
import { ContactDetailsPanel } from '../../../../components/whatsapp/ContactDetailsPanel';

interface ConversationsViewProps {
    instance: WhatsAppInstance;
    onBack: () => void;
    onAddContact: () => void;
}

const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 mins

export const ConversationsView: React.FC<ConversationsViewProps> = ({ instance, onBack, onAddContact }) => {
    const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
    const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);
    const [isContactsLoading, setIsContactsLoading] = useState(true);
    const [contactsError, setContactsError] = useState<string | null>(null);

    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    
    const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

    const [suggestedTags, setSuggestedTags] = useState<string[] | null>(null);
    const { generateTags, isGeneratingTags } = useAI();
    const { addToast } = useToast();

    // Fetch contacts for the instance
    const fetchContacts = useCallback(async () => {
        setIsContactsLoading(true);
        setContactsError(null);
        try {
            const contactsData = await supabase.getWhatsAppContacts(instance.id);
            setContacts(contactsData);
        } catch (err: any) {
            setContactsError(err.message);
        } finally {
            setIsContactsLoading(false);
        }
    }, [instance.id]);
    
    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const triggerTagSuggestionIfNeeded = useCallback(async (
        messagesForAnalysis: WhatsAppMessage[], 
        contactForAnalysis: WhatsAppContact
    ) => {
        if (messagesForAnalysis.length < 3 || isGeneratingTags || suggestedTags) return;

        const lastMessage = messagesForAnalysis[messagesForAnalysis.length - 1];
        if (new Date().getTime() - new Date(lastMessage.timestamp).getTime() > INACTIVITY_THRESHOLD_MS) {
            try {
                const tags = await generateTags(messagesForAnalysis);
                const newSuggestions = tags.filter(t => !(contactForAnalysis.tags || []).includes(t));
                if (newSuggestions.length > 0) setSuggestedTags(newSuggestions);
            } catch (e) { console.error("Failed to generate tags:", e); } 
        }
    }, [isGeneratingTags, suggestedTags, generateTags]);

    // Fetch messages when a contact is selected
    useEffect(() => {
        if (!selectedContact) {
            setMessages([]);
            return;
        }

        setIsMessagesLoading(true);
        setMessagesError(null);
        const fetchInitialMessages = async () => {
            try {
                await supabase.markMessagesAsRead(instance.id, selectedContact.contact_name);
                const initialMessages = await supabase.getWhatsAppMessages(instance.id, selectedContact.contact_name, 1);
                setMessages(initialMessages);
                setCurrentPage(1);
                setHasMore(initialMessages.length === MESSAGE_PAGE_SIZE);
                triggerTagSuggestionIfNeeded(initialMessages, selectedContact);
            } catch (err: any) {
                setMessagesError(err.message);
            } finally {
                setIsMessagesLoading(false);
            }
        };

        fetchInitialMessages();

        const channel = supabase.channel(`conversations-chat-${instance.id}-${selectedContact.contact_name}`);
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages', filter: `instance_id=eq.${instance.id}` },
            (payload) => {
                const newMessage = whatsAppMessageFromSupabase(payload.new);
                if (newMessage.contactName !== selectedContact.contact_name) return;

                setMessages(prev => {
                    const existingMsgIndex = prev.findIndex(m => m.id === newMessage.id);
                    if (existingMsgIndex > -1) {
                        const newMessages = [...prev];
                        newMessages[existingMsgIndex] = newMessage;
                        return newMessages;
                    }
                    // Prevent duplicate if logic somehow missed it or ID collision
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
            }
        ).subscribe();

        return () => { supabase.removeChannel(channel); };

    }, [selectedContact, instance.id, triggerTagSuggestionIfNeeded]);
    
    const handleSelectContact = (contact: WhatsAppContact) => {
        setSelectedContact(contact);
        setContacts(prev => 
            prev.map(c => c.contact_name === contact.contact_name ? { ...c, unread_count: 0 } : c)
        );
        setSuggestedTags(null);
        setIsDetailsPanelOpen(false);
    };

    const handleSendMessage = async (messageText: string, imageBase64: string | null) => {
        if (!selectedContact || isSending) return;
        setIsSending(true);

        try {
            const newId = await supabase.sendWhatsAppMessage({ 
                instanceId: instance.id, 
                contactName: selectedContact.contact_name, 
                messageText, 
                imageBase64 
            });

            const optimisticMessage: WhatsAppMessage = {
                id: newId, instanceId: instance.id, contactName: selectedContact.contact_name,
                sender: 'agent', messageText: messageText || undefined, imageUrl: imageBase64 || undefined,
                isRead: true, timestamp: new Date().toISOString(), status: 'sending',
            };
            
            // Check for duplicates just in case
            setMessages(prev => {
                if (prev.some(m => m.id === newId)) return prev;
                return [...prev, optimisticMessage];
            });

        } catch (error: any) {
            addToast(`Error: ${error.message}`, { type: 'error' });
        } finally {
            setIsSending(false);
        }
    };

    const handleLoadMore = async () => {
        if (isLoadingMore || !hasMore || !selectedContact) return;
        setIsLoadingMore(true); setLoadMoreError(null);
        const nextPage = currentPage + 1;
        try {
            const olderMessages = await supabase.getWhatsAppMessages(instance.id, selectedContact.contact_name, nextPage);
            
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const uniqueOlderMessages = olderMessages.filter(m => !existingIds.has(m.id));
                
                if (uniqueOlderMessages.length === 0) {
                    // If no new unique messages, we might have reached the end effectively
                    // or just fetched a completely overlapping page.
                    if (olderMessages.length < MESSAGE_PAGE_SIZE) setHasMore(false);
                    return prev;
                }
                return [...uniqueOlderMessages, ...prev];
            });
            
            setCurrentPage(nextPage);
            setHasMore(olderMessages.length === MESSAGE_PAGE_SIZE);
        } catch (err: any) { setLoadMoreError(err.message); } 
        finally { setIsLoadingMore(false); }
    };
    
    // --- CRM Handlers ---
    const updateContactState = (contactName: string, updates: Partial<WhatsAppContact>) => {
        const updater = (prev: WhatsAppContact[]) => prev.map(c => c.contact_name === contactName ? { ...c, ...updates } : c);
        setContacts(updater);
        if (selectedContact?.contact_name === contactName) {
            setSelectedContact(prev => prev ? { ...prev, ...updates } : null);
        }
    };
    const handleTagsUpdated = (contactName: string, newTags: string[]) => {
        updateContactState(contactName, { tags: newTags });
    };
    const handleSaveSuggestedTags = async (tagsToSave: string[]) => {
        if (!selectedContact) return;
        try {
            await supabase.updateContactTags(instance.id, selectedContact.contact_name, tagsToSave);
            updateContactState(selectedContact.contact_name, { tags: tagsToSave });
            addToast('Tags updated successfully!', { type: 'success' });
            setSuggestedTags(null);
        } catch (error: any) {
            addToast(`Failed to update tags: ${error.message}`, { type: 'error' });
        }
    };
    const handleCrmStageChange = (contactName: string, newStage: string) => {
        updateContactState(contactName, { crm_stage: newStage });
        supabase.updateContactCrmStage(instance.id, contactName, newStage).catch(() => addToast('Failed to update stage.', { type: 'error' }));
    };
    const handlePriorityChange = (contactName: string, newPriority: Priority) => {
        updateContactState(contactName, { priority: newPriority });
        supabase.updateContactPriority(instance.id, contactName, newPriority).catch(() => addToast('Failed to update priority.', { type: 'error' }));
    };
    const handleDueDateChange = (contactName: string, newDueDate: string | null) => {
        updateContactState(contactName, { due_date: newDueDate });
        supabase.updateContactDueDate(instance.id, contactName, newDueDate).catch(() => addToast('Failed to update due date.', { type: 'error' }));
    };

    return (
        <div className="h-full w-full flex bg-brand-secondary overflow-hidden">
            <div className={`
                w-full flex-shrink-0 transition-transform duration-300 ease-in-out
                md:w-[400px] md:relative md:translate-x-0
                ${selectedContact ? '-translate-x-full' : 'translate-x-0'}
            `}>
                <ContactList
                    contacts={contacts}
                    selectedContactName={selectedContact?.contact_name || null}
                    onSelectContact={handleSelectContact}
                    isLoading={isContactsLoading}
                    error={contactsError}
                    onBackToDashboard={onBack}
                    onAddContact={onAddContact}
                />
            </div>
            <div className="absolute top-0 left-0 w-full h-full md:relative flex-1 min-w-0 flex transition-transform duration-300 ease-in-out">
                 {selectedContact ? (
                    <>
                        <MessagePane
                            instance={instance}
                            contact={selectedContact}
                            messages={messages}
                            isLoading={isMessagesLoading}
                            onSendMessage={handleSendMessage}
                            isSending={isSending}
                            onLoadMore={handleLoadMore}
                            hasMore={hasMore}
                            isLoadingMore={isLoadingMore}
                            error={messagesError}
                            loadMoreError={loadMoreError}
                            onBack={() => setSelectedContact(null)}
                            suggestedTags={suggestedTags}
                            onSaveSuggestedTags={handleSaveSuggestedTags}
                            onDismissSuggestions={() => setSuggestedTags(null)}
                            onToggleDetailsPanel={() => setIsDetailsPanelOpen(p => !p)}
                            isDetailsPanelOpen={isDetailsPanelOpen}
                        />
                        <div className={`transition-all duration-300 ease-in-out ${isDetailsPanelOpen ? 'w-full max-w-xs' : 'w-0'}`}>
                            {isDetailsPanelOpen && (
                                <ContactDetailsPanel
                                    contact={selectedContact}
                                    instance={instance}
                                    onClose={() => setIsDetailsPanelOpen(false)}
                                    onTagsUpdated={handleTagsUpdated}
                                    onCrmStageChange={handleCrmStageChange}
                                    onPriorityChange={handlePriorityChange}
                                    onDueDateChange={handleDueDateChange}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <WhatsAppHome />
                )}
            </div>
        </div>
    );
};

export default ConversationsView;