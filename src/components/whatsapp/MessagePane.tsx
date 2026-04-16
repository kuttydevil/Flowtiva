

import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { WhatsAppInstance, WhatsAppContact, WhatsAppMessage } from '../../types';
import { ChatMessage } from './ChatMessage';
import { Textarea } from '../ui/Textarea';
import { Skeleton } from '../ui/Skeleton';
import { Avatar } from '../ui/Avatar';
import { useTranslation } from '../../contexts/LanguageContext';
import { Icons } from '../ui/Icons';
import { Button } from '../ui/Button';

interface MessageComposerProps {
    onSendMessage: (text: string, imageBase64: string | null) => void;
    isSending: boolean;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ onSendMessage, isSending }) => {
    const [text, setText] = useState('');
    const handleSend = () => { if (!text.trim() || isSending) return; onSendMessage(text, null); setText(''); };

    return (
        <footer className="p-3 border-t border-brand-border bg-brand-primary flex-shrink-0">
            <div className="bg-brand-secondary rounded-xl p-1 flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-brand-text-secondary"><Icons.Icon id="smiley" className="w-6 h-6"/></Button>
                <Textarea
                    placeholder="Send a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                    className="flex-1 resize-none h-10 min-h-[40px] max-h-32 py-2 bg-transparent border-none focus-visible:ring-0"
                    disabled={isSending}
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 text-brand-text-secondary"><Icons.Icon id="attach" className="w-5 h-5"/></Button>
                <Button size="icon" onClick={handleSend} disabled={!text.trim() || isSending} className="h-9 w-9 rounded-full">
                    {text ? <Icons.Icon id="send" className="w-5 h-5"/> : <Icons.Icon id="microphone" className="w-5 h-5"/>}
                </Button>
            </div>
        </footer>
    );
};

const MessagePaneSkeleton = () => (
    <div className="space-y-4 p-6">
        {[...Array(5)].map((_, i) => (
             <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <Skeleton className={`h-10 rounded-lg ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
            </div>
        ))}
    </div>
);

// FIX: Add missing props to align with usage in ConversationsView.tsx
interface MessagePaneProps {
    instance: WhatsAppInstance;
    contact: WhatsAppContact;
    messages: WhatsAppMessage[];
    isLoading: boolean;
    onSendMessage: (text: string, imageBase64: string | null) => void;
    isSending: boolean;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
    error: string | null;
    loadMoreError: string | null;
    onBack: () => void;
    suggestedTags: string[] | null;
    onSaveSuggestedTags: (tagsToSave: string[]) => void;
    onDismissSuggestions: () => void;
    onToggleDetailsPanel: () => void;
    isDetailsPanelOpen: boolean;
}

export const MessagePane: React.FC<MessagePaneProps> = ({ 
    instance,
    contact, 
    messages, 
    isLoading, 
    onSendMessage, 
    isSending, 
    onLoadMore, 
    hasMore, 
    isLoadingMore, 
    error, 
    loadMoreError, 
    onBack,
    suggestedTags,
    onSaveSuggestedTags,
    onDismissSuggestions,
    onToggleDetailsPanel,
    isDetailsPanelOpen
}) => {
    const { t } = useTranslation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const prevScrollHeightRef = useRef(0);
    const shouldAutoScrollRef = useRef(true);
    
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        shouldAutoScrollRef.current = isNearBottom;

        if (container.scrollTop < 50 && hasMore && !isLoadingMore) {
            prevScrollHeightRef.current = container.scrollHeight;
            onLoadMore();
        }
    }, [hasMore, isLoadingMore, onLoadMore]);

    useEffect(() => {
        shouldAutoScrollRef.current = true;
    }, [contact]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        container?.addEventListener('scroll', handleScroll);
        return () => container?.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        
        const didLoadMore = prevScrollHeightRef.current > 0;

        if (didLoadMore) {
            container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
            prevScrollHeightRef.current = 0;
        } else if (shouldAutoScrollRef.current) {
            container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
        }
    }, [messages]);

    const renderContent = () => {
        if (isLoading) return <MessagePaneSkeleton />;
        if (error) return (
            <div className="flex justify-center items-center h-full text-center p-4">
                <div className="text-status-red bg-status-red/10 p-4 rounded-lg">
                    <p className="font-semibold">{t('common.error')}</p>
                    <p className="text-sm mt-1">{t('common.errorWithMessage', { message: error })}</p>
                </div>
            </div>
        );
        return (
            <div className="space-y-2">
                {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col bg-brand-secondary w-full min-w-0">
            <header className="p-3 border-b border-brand-border flex-shrink-0 flex items-center gap-3 bg-brand-primary">
                <button onClick={onBack} className="md:hidden p-2 text-brand-text-secondary rounded-full hover:bg-brand-secondary -ml-2"><Icons.Icon id="back" className="h-5 w-5"/></button>
                <Avatar name={contact.contact_name} className="w-10 h-10 cursor-pointer" />
                <div className="flex-1 min-w-0">
                     <h3 className="font-semibold text-brand-text-primary truncate cursor-pointer">{contact.contact_name}</h3>
                     <p className="text-xs text-brand-text-secondary">online</p>
                </div>
                <div className="flex items-center gap-1 text-brand-text-secondary">
                    <Button variant="ghost" size="icon" className="h-9 w-9"><Icons.Icon id="search" className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleDetailsPanel}><Icons.Icon id="details" className="h-5 w-5" /></Button>
                </div>
            </header>
            <div ref={scrollContainerRef} className="flex-1 px-[calc(4%)] pt-4 pb-2 overflow-y-auto">
                {loadMoreError && (
                    <div className="text-center my-4"><p className="text-xs text-status-red">{loadMoreError}</p></div>
                )}
                {isLoadingMore && (
                    <div className="flex justify-center my-4"><p className="text-brand-text-secondary text-sm">{t('whatsapp.messagePane.loadingMore')}</p></div>
                )}
                {!hasMore && messages.length > 0 && !isLoadingMore && (
                    <div className="text-center my-4"><p className="text-brand-text-secondary text-xs">{t('whatsapp.messagePane.beginning')}</p></div>
                )}
                {renderContent()}
            </div>
            <MessageComposer onSendMessage={onSendMessage} isSending={isSending} />
        </div>
    );
};