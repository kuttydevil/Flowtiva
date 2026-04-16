
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
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => { 
        if (!text.trim() || isSending) return; 
        onSendMessage(text, null); 
        setText(''); 
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };
    
    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [text]);

    return (
        <footer className="px-4 py-4 bg-background/80 backdrop-blur-xl flex-shrink-0 flex items-end gap-3 border-t border-border/50">
             <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-full mb-0.5 transition-all active:scale-95">
                <Icons.Icon id="smiley" className="w-6 h-6"/>
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-full mb-0.5 transition-all active:scale-95">
                <Icons.Icon id="attach" className="w-6 h-6"/>
            </Button>

            <div className="flex-1 bg-muted/30 rounded-[22px] border border-border/50 focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all shadow-sm flex items-center min-h-[44px] px-4 py-1.5 hover:bg-muted/40">
                <Textarea
                    ref={textareaRef}
                    placeholder={t('whatsapp.messagePane.writeMessage')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                    className="flex-1 resize-none bg-transparent border-none focus-visible:ring-0 text-[15px] text-foreground placeholder:text-muted-foreground/60 min-h-[24px] py-1 max-h-32"
                    rows={1}
                    disabled={isSending}
                />
            </div>
            
            {text.trim() ? (
                <Button size="icon" onClick={handleSend} disabled={isSending} className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 mb-0.5 transition-all active:scale-90">
                    <Icons.Icon id="send" className="w-5 h-5 ml-0.5"/>
                </Button>
            ) : (
                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-full mb-0.5 transition-all active:scale-95">
                     <Icons.Icon id="microphone" className="w-6 h-6"/>
                </Button>
            )}
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
            <div className="flex justify-center items-center h-full text-center p-4 z-10 relative">
                <div className="text-status-red bg-white/90 p-4 rounded-lg shadow-sm">
                    <p className="font-semibold">{t('common.error')}</p>
                    <p className="text-sm mt-1">{t('common.errorWithMessage', { message: error })}</p>
                </div>
            </div>
        );
        return (
            <div className="space-y-1 relative z-10 px-4 md:px-16 lg:px-24">
                {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-background relative min-w-0">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] pointer-events-none"></div>

            <header className="h-[64px] px-4 border-b border-border/50 flex-shrink-0 flex items-center gap-3 bg-background/80 backdrop-blur-xl relative z-20">
                <button onClick={onBack} className="md:hidden p-2 text-muted-foreground rounded-full hover:bg-muted/50 hover:text-foreground transition-all -ml-2 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95">
                    <Icons.Icon id="back" className="h-5 w-5"/>
                </button>
                <div onClick={onToggleDetailsPanel} className="cursor-pointer">
                    <Avatar name={contact.contact_name} className="w-10 h-10 ring-2 ring-background shadow-sm hover:opacity-90 transition-opacity" />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer group" onClick={onToggleDetailsPanel}>
                     <h3 className="font-semibold text-foreground truncate text-[15px] group-hover:text-primary transition-colors leading-tight">{contact.contact_name}</h3>
                     <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-status-green shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                        <p className="text-[12px] text-muted-foreground truncate font-medium">{t('whatsapp.messagePane.online')}</p>
                     </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-muted/50 hover:text-foreground transition-all active:scale-95"><Icons.Icon id="search" className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" className={`h-10 w-10 rounded-full hover:bg-muted/50 hover:text-foreground transition-all active:scale-95 ${isDetailsPanelOpen ? 'bg-muted/50 text-foreground' : ''}`} onClick={onToggleDetailsPanel}>
                        <Icons.Icon id="details" className="h-5 w-5" />
                    </Button>
                </div>
            </header>
            
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-6 relative scroll-smooth">
                {loadMoreError && (
                    <div className="text-center my-4 relative z-10"><span className="text-xs bg-destructive/10 text-destructive border border-destructive/20 px-4 py-2 rounded-xl shadow-sm font-medium">{loadMoreError}</span></div>
                )}
                {isLoadingMore && (
                    <div className="flex justify-center my-4 relative z-10"><span className="text-muted-foreground bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-[11px] shadow-sm uppercase tracking-wider font-bold border border-border/50">{t('whatsapp.messagePane.loadingMore')}</span></div>
                )}
                {!hasMore && messages.length > 0 && !isLoadingMore && (
                    <div className="text-center my-8 relative z-10">
                        <span className="text-muted-foreground bg-muted/30 backdrop-blur-sm px-5 py-2 rounded-full text-[12px] font-semibold shadow-sm border border-border/50">
                            {t('whatsapp.messagePane.beginning')}
                        </span>
                    </div>
                )}
                {renderContent()}
            </div>
            
            {/* Suggested Tags (AI) */}
            {suggestedTags && suggestedTags.length > 0 && (
                <div className="bg-primary/5 backdrop-blur-xl px-4 py-3 border-t border-primary/10 flex items-center justify-between z-20 animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                         <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg">
                            <Icons.Icon id="ai" className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap">AI Suggests</span>
                         </div>
                        {suggestedTags.map(tag => (
                            <span key={tag} className="text-[11px] font-semibold bg-background border border-border/50 text-foreground px-3 py-1.5 rounded-xl whitespace-nowrap shadow-sm hover:border-primary/30 transition-colors cursor-default">{tag}</span>
                        ))}
                    </div>
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                        <Button size="sm" variant="ghost" onClick={onDismissSuggestions} className="h-8 text-xs font-medium hover:bg-muted/50 rounded-lg">{t('whatsapp.tagSuggestions.dismiss')}</Button>
                        <Button size="sm" onClick={() => onSaveSuggestedTags(suggestedTags)} className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-lg px-4">{t('whatsapp.tagSuggestions.save', { count: suggestedTags.length })}</Button>
                    </div>
                </div>
            )}

            <div className="relative z-20">
                <MessageComposer onSendMessage={onSendMessage} isSending={isSending} />
            </div>
        </div>
    );
};
