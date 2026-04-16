/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { InstagramMessage } from '../../types';

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

export const InstagramChatMessage: React.FC<{ message: InstagramMessage }> = React.memo(({ message }) => {
  const isUser = message.sender === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex w-full ${isUser ? 'justify-start' : 'justify-end'}`}>
        <div className={`flex flex-col gap-1 max-w-[90%] sm:max-w-sm md:max-w-md ${isUser ? 'items-start' : 'items-end'}`}>
            <div
                className={`px-3.5 py-2 rounded-2xl ${
                    isUser
                    ? 'bg-brand-primary text-brand-text-primary rounded-es-none border border-brand-border'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-ee-none'
                }`}
            >
                {message.imageUrl && (
                    <a href={message.imageUrl} target="_blank" rel="noopener noreferrer" className="block bg-black/20 rounded-lg">
                        <img 
                            src={message.imageUrl} 
                            alt="Attachment" 
                            className={`rounded-lg max-w-full h-auto cursor-pointer ${message.messageText ? 'mb-2' : ''}`} 
                            style={{ maxWidth: '300px', maxHeight: '300px' }}
                        />
                    </a>
                )}
                {message.messageText && <p className="text-sm break-words whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMessageText(message.messageText) }} />}
            </div>
            <div className="text-xs text-brand-text-secondary px-1">{time}</div>
        </div>
    </div>
  );
});