/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WhatsAppMessage } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';

// FIX: Added title prop to tick icons to fix TS error and improve accessibility.
const SentTickIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = ({ title, ...props }) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>{title && <title>{title}</title>}<path d="M10.9693 5.23462L6.81934 9.38462L4.88184 7.44712" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"></path></svg>;
const DeliveredTickIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = ({ title, ...props }) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>{title && <title>{title}</title>}<path d="M11.583 5.25L7.43301 9.4L5.5 7.4625M10.9693 5.23462L6.81934 9.38462L4.88184 7.44712" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"></path></svg>;
const SeenTickIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = ({ title, ...props }) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>{title && <title>{title}</title>}<path d="M11.583 5.25L7.43301 9.4L5.5 7.4625M10.9693 5.23462L6.81934 9.38462L4.88184 7.44712" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"></path></svg>;

const MessageStatus: React.FC<{ status: WhatsAppMessage['status'] }> = ({ status }) => {
    const { t } = useTranslation();
    const statusColor = status === 'seen' ? 'text-[var(--wa-read-receipt)]' : 'text-[var(--wa-text-secondary)]';

    if (status === 'sending') return <ClockIcon className="h-4 w-4 text-[var(--wa-text-secondary)] animate-pulse" title="Sending..." />;
    if (status === 'failed') return <ExclamationCircleIcon className="h-4 w-4 text-status-red" title="Failed" />;
    if (status === 'sent') return <SentTickIcon className={statusColor} title="Sent" />;
    if (status === 'read') return <DeliveredTickIcon className={statusColor} title="Delivered" />;
    if (status === 'seen') return <SeenTickIcon className={statusColor} title="Seen" />;
    return <SentTickIcon className="text-[var(--wa-text-secondary)]" title="Sent" />; // Default for outgoing
};

const ClockIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = ({ title, ...props }) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {title && <title>{title}</title>}
      <path d="M8 3.5V8H12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5Z" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
);

const ExclamationCircleIcon: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }> = ({ title, ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      {title && <title>{title}</title>}
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
);

const formatMessageText = (text: string): string => {
  let formattedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  formattedText = formattedText.replace(/(?<!\w)\*(\S(?:[^*]*\S)?)\*(?!\w)/g, '<strong>$1</strong>');
  formattedText = formattedText.replace(/(?<!\w)_(\S(?:[^_]*\S)?)_(?!\w)/g, '<em>$1</em>');
  formattedText = formattedText.replace(/(?<!\w)~(\S(?:[^~]*\S)?)~(?!\w)/g, '<s>$1</s>');
  formattedText = formattedText.replace(/```([\s\S]+?)```/g, '<code class="bg-brand-secondary dark:bg-brand-border/40 px-1.5 py-0.5 rounded-md font-mono text-sm">$1</code>');
  return formattedText;
};

export const ChatMessage: React.FC<{ message: WhatsAppMessage }> = React.memo(({ message }) => {
  const isOutgoing = message.sender === 'ai' || message.sender === 'agent';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex w-full mb-3 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
        <div className={`relative px-4 py-2.5 rounded-[20px] text-[15px] shadow-sm max-w-[85%] sm:max-w-[75%] leading-relaxed ${
                isOutgoing
                ? 'bg-primary text-primary-foreground rounded-br-[4px]'
                : 'bg-card border border-border/50 text-card-foreground rounded-bl-[4px]'
            }`}
        >
            {message.imageUrl && (
                <a href={message.imageUrl} target="_blank" rel="noopener noreferrer" className="block bg-black/5 rounded-xl overflow-hidden">
                    <img 
                        src={message.imageUrl} 
                        alt="Attachment" 
                        className={`rounded-xl max-w-full h-auto cursor-pointer transition-transform hover:scale-[1.02] duration-200 ${message.messageText ? 'mb-2' : ''}`} 
                        style={{ maxWidth: '300px', maxHeight: '300px', objectFit: 'cover' }}
                    />
                </a>
            )}
            
            {message.messageText && <div className="break-words whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMessageText(message.messageText) }} />}
            
            <div className={`flex items-center justify-end gap-1.5 mt-1 -mb-1 ${isOutgoing ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                <span className="text-[11px] font-medium tracking-wide">{time}</span>
                {isOutgoing && <MessageStatus status={message.status} />}
            </div>
        </div>
    </div>
  );
});
