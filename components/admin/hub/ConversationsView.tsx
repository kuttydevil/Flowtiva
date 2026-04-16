import React, { useState, useEffect, useCallback } from 'react';
import { WhatsAppInstance, WhatsAppContact, WhatsAppMessage, Priority } from '../../../types';
import { firebaseService } from '../../../services/firebaseService';
import { db } from '../../../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { MESSAGE_PAGE_SIZE } from '../../../services/firebaseService';
import { useToast } from '../../../contexts/ToastContext';
import { ContactList } from '../../whatsapp/ContactList';
import { MessagePane } from '../../whatsapp/MessagePane';
import { useAI } from '../../../contexts/AIContext';
import { ContactDetailsPanel } from '../../whatsapp/ContactDetailsPanel';

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
    useEffect(() => {
        const fetchContacts = async () => {
            setIsContactsLoading(true);
            setContactsError(null);
            try {
                const contactsData = await firebaseService.getWhatsAppContacts(instance.id);
                setContacts(contactsData);
            } catch (err: any) {
                setContactsError(err.message);
            } finally {
                setIsContactsLoading(false);
            }
        };
        fetchContacts();
    }, [instance.id]);

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
                await firebaseService.markMessagesAsRead(instance.id, selectedContact.contact_name);
                const initialMessages = await firebaseService.getWhatsAppMessages(instance.id, selectedContact.contact_name, 1);
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

        const q = query(
            collection(db, 'whatsapp_messages'),
            where('instanceId', '==', instance.id),
            where('contactName', '==', selectedContact.contact_name),
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

        return () => { unsubscribe(); };

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
            const newId = await firebaseService.sendWhatsAppMessage({ 
                instanceId: instance.id, 
                contactName: selectedContact.contact_name, 
                messageText, 
                imageBase64 
            });

            const optimisticMessage: WhatsAppMessage = {
                id: newId || `temp-${Date.now()}`,
                instanceId: instance.id,
                contactName: selectedContact.contact_name,
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

    const handleLoadMore = async () => {
        if (isLoadingMore || !hasMore || !selectedContact) return;
        setIsLoadingMore(true); setLoadMoreError(null);
        const nextPage = currentPage + 1;
        try {
            const olderMessages = await firebaseService.getWhatsAppMessages(instance.id, selectedContact.contact_name, nextPage);
            setMessages(prev => [...olderMessages, ...prev]);
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
            await firebaseService.updateContactTags(instance.id, selectedContact.contact_name, tagsToSave);
            updateContactState(selectedContact.contact_name, { tags: tagsToSave });
            addToast('Tags updated successfully!', { type: 'success' });
            setSuggestedTags(null);
        } catch (error: any) {
            addToast(`Failed to update tags: ${error.message}`, { type: 'error' });
        }
    };
    const handleCrmStageChange = (contactName: string, newStage: string) => {
        updateContactState(contactName, { crm_stage: newStage });
        firebaseService.updateContactCrmStage(instance.id, contactName, newStage).catch(() => addToast('Failed to update stage.', { type: 'error' }));
    };
    const handlePriorityChange = (contactName: string, newPriority: Priority) => {
        updateContactState(contactName, { priority: newPriority });
        firebaseService.updateContactPriority(instance.id, contactName, newPriority).catch(() => addToast('Failed to update priority.', { type: 'error' }));
    };
    const handleDueDateChange = (contactName: string, newDueDate: string | null) => {
        updateContactState(contactName, { due_date: newDueDate });
        firebaseService.updateContactDueDate(instance.id, contactName, newDueDate).catch(() => addToast('Failed to update due date.', { type: 'error' }));
    };

    return (
        <div className="h-full w-full flex bg-[var(--wa-app-bg)]">
             <div className="h-full flex flex-1">
                <div className={`h-full flex-shrink-0 border-e border-[var(--wa-app-bg)] dark:border-[var(--wa-app-bg)] transition-all duration-300 ${selectedContact ? 'hidden md:block w-[30%] lg:w-[25%]' : 'w-full md:w-[30%] lg:w-[25%]'}`}>
                    {/* FIX: Changed onBack to onBackToDashboard and removed instancePhoneNumber */}
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
                <div className="flex-1 min-w-0 flex">
                    {selectedContact ? (
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
                    ) : (
                        <div className="h-full hidden md:flex flex-col items-center justify-center text-center w-full bg-background border-l border-border/50">
                            <div className="text-center flex flex-col items-center max-w-md px-6">
                                <div className="w-24 h-24 bg-muted/50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-border/50">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-muted-foreground">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">Flowtiva Web</h1>
                                <p className="text-muted-foreground text-sm leading-relaxed">Select a conversation from the sidebar to start messaging, or use the menu to connect a new account.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {selectedContact && (
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
            )}
        </div>
    );
};

export default ConversationsView;
