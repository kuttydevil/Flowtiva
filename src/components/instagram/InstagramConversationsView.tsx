
import React, { useState, useEffect, useCallback } from 'react';
import { InstagramInstance, InstagramContact, InstagramMessage } from '../../types';
import { supabase, instagramMessageFromSupabase, MESSAGE_PAGE_SIZE } from '../../services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { InstagramContactList } from './InstagramContactList';
import { InstagramMessagePane } from './InstagramMessagePane';
import { InstagramHome } from './InstagramHome';

interface InstagramConversationsViewProps {
  instance: InstagramInstance;
  onBack: () => void;
}

const InstagramConversationsView: React.FC<InstagramConversationsViewProps> = ({ instance, onBack }) => {
    const [contacts, setContacts] = useState<InstagramContact[]>([]);
    const [selectedContact, setSelectedContact] = useState<InstagramContact | null>(null);
    const [isContactsLoading, setIsContactsLoading] = useState(true);
    const [contactsError, setContactsError] = useState<string | null>(null);
    const [messages, setMessages] = useState<InstagramMessage[]>([]);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchContacts = async () => {
            setIsContactsLoading(true);
            try {
                const data = await supabase.getInstagramContacts(instance.id);
                setContacts(data);
            } catch (err: any) {
                setContactsError(err.message);
            } finally {
                setIsContactsLoading(false);
            }
        };
        fetchContacts();
    }, [instance.id]);

    useEffect(() => {
        if (!selectedContact) {
            setMessages([]);
            return;
        }

        const fetchInitialMessages = async () => {
            setIsMessagesLoading(true);
            setMessagesError(null);
            try {
                const initialMessages = await supabase.getInstagramMessages(instance.id, selectedContact.contact_username, 1);
                setMessages(initialMessages);
                setCurrentPage(1);
                setHasMore(initialMessages.length === MESSAGE_PAGE_SIZE);
            } catch (err: any) {
                setMessagesError(err.message);
            } finally {
                setIsMessagesLoading(false);
            }
        };
        fetchInitialMessages();

        const channel = supabase.channel(`instagram-dms-${instance.id}`);
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'instagram_messages', filter: `instance_id=eq.${instance.id}` },
            (payload) => {
                const newMessage = instagramMessageFromSupabase(payload.new);
                if (newMessage.contactUsername === selectedContact.contact_username) {
                    setMessages(prev => {
                        const existingMsgIndex = prev.findIndex(m => m.id === newMessage.id);
                        if (existingMsgIndex > -1) {
                            const newMessages = [...prev];
                            newMessages[existingMsgIndex] = newMessage;
                            return newMessages;
                        }
                        if (prev.some(m => m.id === newMessage.id)) return prev;
                        return [...prev, newMessage];
                    });
                }
            }
        ).subscribe();
        return () => { supabase.removeChannel(channel); };

    }, [selectedContact, instance.id]);

    const handleSelectContact = (contact: InstagramContact) => {
        setSelectedContact(contact);
        setContacts(prev => prev.map(c => c.contact_username === contact.contact_username ? { ...c, unread_count: 0 } : c));
    };

    const handleSendMessage = async (messageText: string) => {
        if (!selectedContact || isSending) return;
        setIsSending(true);
        addToast(`Sending "${messageText}" to ${selectedContact.contact_username}`, { type: 'info' });
        // NOTE: The backend function for sending Instagram DMs is not implemented in the provided files.
        // This will be a UI-only optimistic update.
        setTimeout(() => {
            const optimisticMessage: InstagramMessage = {
                id: `temp-${Date.now()}`, instanceId: instance.id, contactUsername: selectedContact.contact_username,
                sender: 'agent', messageText, isRead: true, timestamp: new Date().toISOString(), status: 'sent'
            };
            setMessages(prev => {
                if (prev.some(m => m.id === optimisticMessage.id)) return prev;
                return [...prev, optimisticMessage];
            });
            setIsSending(false);
            addToast(`Message sent (simulated).`, { type: 'success' });
        }, 1000);
    };

    const handleLoadMore = async () => {
        if (isLoadingMore || !hasMore || !selectedContact) return;
        setIsLoadingMore(true); setLoadMoreError(null);
        const nextPage = currentPage + 1;
        try {
            const olderMessages = await supabase.getInstagramMessages(instance.id, selectedContact.contact_username, nextPage);
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const uniqueOlderMessages = olderMessages.filter(m => !existingIds.has(m.id));
                
                if (uniqueOlderMessages.length === 0) {
                    if (olderMessages.length < MESSAGE_PAGE_SIZE) setHasMore(false);
                    return prev;
                }
                return [...uniqueOlderMessages, ...prev];
            });
            setCurrentPage(nextPage);
            setHasMore(olderMessages.length === MESSAGE_PAGE_SIZE);
        } catch (err: any) {
            setLoadMoreError(err.message);
        } finally {
            setIsLoadingMore(false);
        }
    };

    return (
        <div className="h-full w-full flex bg-brand-secondary overflow-hidden">
            <div className={`
                w-full flex-shrink-0 transition-transform duration-300 ease-in-out
                md:w-[400px] md:relative md:translate-x-0
                ${selectedContact ? '-translate-x-full' : 'translate-x-0'}
            `}>
                <InstagramContactList
                    contacts={contacts}
                    selectedContactUsername={selectedContact?.contact_username || null}
                    onSelectContact={handleSelectContact}
                    isLoading={isContactsLoading}
                    error={contactsError}
                    onBack={onBack}
                    instanceUsername={instance.username}
                />
            </div>
            <div className="absolute top-0 left-0 w-full h-full md:relative flex-1 min-w-0 flex transition-transform duration-300 ease-in-out">
                 {selectedContact ? (
                    <InstagramMessagePane
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
                    />
                ) : (
                    <InstagramHome />
                )}
            </div>
        </div>
    );
};

export default InstagramConversationsView;
