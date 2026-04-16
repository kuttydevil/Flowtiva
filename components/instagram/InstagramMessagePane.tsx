import React, { useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { InstagramInstance, InstagramContact, InstagramMessage } from '../../types';
import { InstagramChatMessage } from './InstagramChatMessage';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Skeleton } from '../ui/Skeleton';
import { Avatar } from '../ui/Avatar';
import { useTranslation } from '../../contexts/LanguageContext';

const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
    </svg>
);
const BackArrowIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
);

interface MessageComposerProps {
    onSendMessage: (text: string) => void;
    isSending: boolean;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ onSendMessage, isSending }) => {
    const { t } = useTranslation();
    const [text, setText] = React.useState('');
    
    const handleSend = () => {
        if (!text.trim() || isSending) return;
        onSendMessage(text);
        setText('');
    };

    return (
        <div className="p-3 border-t border-brand-border bg-brand-primary flex-shrink-0">
            <div className="bg-brand-secondary rounded-xl p-1 flex items-center space-x-1">
                <Textarea
                    placeholder={t('instagram.messagePane.placeholder')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                    className="flex-1 resize-none h-10 min-h-[40px] max-h-32 py-2 bg-transparent border-none focus-visible:ring-0"
                    disabled={isSending}
                />
                <Button size="icon" onClick={handleSend} disabled={!text.trim() || isSending} aria-label={t('whatsapp.messagePane.sendMessage')} className="flex-shrink-0 rounded-full w-9 h-9">
                    <SendIcon className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

const MessagePaneSkeleton = () => (
    <div className="space-y-6 p-6">
        {[...Array(5)].map((_, i) => (
             <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
            </div>
        ))}
    </div>
);

interface MessagePaneProps {
    instance: InstagramInstance;
    contact: InstagramContact;
    messages: InstagramMessage[];
    isLoading: boolean;
    onSendMessage: (text: string) => void;
    isSending: boolean;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
    error: string | null;
    loadMoreError: string | null;
    onBack: () => void;
}

export const InstagramMessagePane: React.FC<MessagePaneProps> = ({
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
            container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
        }
    }, [messages]);

    const renderContent = () => {
        if (isLoading) {
            return <MessagePaneSkeleton />;
        }
        if (error) {
             return (
                <div className="flex justify-center items-center h-full text-center p-4">
                    <div className="text-status-red bg-status-red/10 p-4 rounded-lg">
                        <p className="font-semibold">{t('common.error')}</p>
                        <p className="text-sm mt-1">{t('common.errorWithMessage', { message: error })}</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="space-y-2">
                {messages.map(msg => <InstagramChatMessage key={msg.id} message={msg} />)}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col bg-brand-secondary w-full min-w-0">
            <header className="p-3 border-b border-brand-border flex-shrink-0 flex items-center gap-3 bg-brand-primary">
                 <Button onClick={onBack} variant="ghost" size="icon" className="sm:hidden -ms-2 self-center">
                    <BackArrowIcon className="h-5 w-5"/>
                </Button>
                <Avatar name={contact.contact_username} className="w-10 h-10" />
                <div className="flex-1 min-w-0">
                     <h3 className="font-semibold text-brand-text-primary truncate">@{contact.contact_username}</h3>
                     <p className="text-xs text-brand-text-secondary truncate">{t('instagram.messagePane.dmLabel')}</p>
                </div>
            </header>
            <div ref={scrollContainerRef} className="flex-1 px-4 md:px-6 pt-4 overflow-y-auto">
                {loadMoreError && (
                    <div className="flex flex-col items-center justify-center my-4 text-center text-xs text-status-red">
                        <p>{t('whatsapp.messagePane.loadMoreError')}</p>
                        <Button variant="ghost" size="sm" className="mt-1 h-auto py-0.5 px-2 text-xs" onClick={onLoadMore}>
                            {t('common.tryAgain')}
                        </Button>
                    </div>
                )}
                {isLoadingMore && (
                    <div className="flex justify-center my-4">
                        <p className="text-brand-text-secondary text-sm">{t('instagram.messagePane.loadingMore')}</p>
                    </div>
                )}
                 {!hasMore && messages.length > 0 && !isLoadingMore && (
                    <div className="text-center my-4">
                        <p className="text-brand-text-secondary text-xs">{t('whatsapp.messagePane.beginning')}</p>
                    </div>
                )}
                {renderContent()}
            </div>
            <MessageComposer onSendMessage={onSendMessage} isSending={isSending} />
        </div>
    );
};