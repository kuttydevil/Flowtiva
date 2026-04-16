
import React, { useState, memo, useMemo } from 'react';
import { WhatsAppContact } from '../../types';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import { Avatar } from '../ui/Avatar';
import { useTranslation } from '../../contexts/LanguageContext';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { Icons } from '../ui/Icons';
import { cn } from '../../lib/utils';

const timeAgo = (isoTimestamp: string | null | undefined, t: (key: string) => string): string => {
    if (!isoTimestamp) return '';
    const date = new Date(isoTimestamp);
    const today = new Date();
    
    if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) {
        return t('common.yesterday');
    }
    
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }); // Shortened year
};

const ContactListSkeleton = () => (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {[...Array(10)].map((_, i) => (
            <div key={i} className="p-3 flex items-center space-x-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                </div>
            </div>
        ))}
    </div>
);

const ContactListItem = memo(({ contact, isSelected, onSelectContact, t }: {
    contact: WhatsAppContact; isSelected: boolean; onSelectContact: (contact: WhatsAppContact) => void; t: (key: string) => string;
}) => {
    return (
        <li>
            <button 
                onClick={() => onSelectContact(contact)} 
                className={cn(
                    "w-full text-left px-4 py-3 flex items-center space-x-3 transition-colors group relative outline-none focus-visible:bg-muted/50",
                    isSelected ? "bg-muted/50" : "hover:bg-muted/30"
                )}
            >
                <Avatar name={contact.contact_name} className="w-12 h-12 flex-shrink-0 ring-2 ring-background shadow-sm" />
                <div className="flex-1 min-w-0 border-b border-border/50 pb-3 group-last:border-b-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                        <p className="font-medium text-[15px] text-foreground truncate">{contact.contact_name}</p>
                        <p className={`text-[11px] flex-shrink-0 ml-2 ${contact.unread_count > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                            {timeAgo(contact.last_message_at, t)}
                        </p>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-[13px] text-muted-foreground truncate pr-2 leading-tight">
                            {contact.last_message_text || ''}
                        </p>
                        {contact.unread_count > 0 && (
                            <span className="flex-shrink-0 text-[11px] font-bold bg-primary text-primary-foreground rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 shadow-sm">
                                {contact.unread_count}
                            </span>
                        )}
                         {/* Optional Tag indicator if needed */}
                         {contact.tags && contact.tags.length > 0 && contact.unread_count === 0 && (
                             <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 opacity-50" title="Tagged"></div>
                         )}
                    </div>
                </div>
            </button>
        </li>
    );
});

interface ContactListProps {
    contacts: WhatsAppContact[];
    selectedContactName: string | null;
    onSelectContact: (contact: WhatsAppContact) => void;
    isLoading: boolean;
    error: string | null;
    onBackToDashboard: () => void;
    onAddContact: () => void;
}

export const ContactList: React.FC<ContactListProps> = ({ contacts, selectedContactName, onSelectContact, isLoading, error, onBackToDashboard, onAddContact }) => {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredContacts = useMemo(() => 
        contacts
            .filter(c => c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
                const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
                return dateB - dateA;
            })
    , [contacts, searchTerm]);

    return (
        <div className="h-full bg-background flex flex-col w-full border-r border-border/50">
            {/* Header */}
            <header className="h-[60px] px-4 py-2 bg-muted/20 border-b border-border/50 flex items-center justify-between flex-shrink-0">
                <button onClick={onBackToDashboard} className="p-2 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors -ml-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" title={t('common.back')}>
                     <Icons.Icon id="back" className="h-5 w-5" />
                </button>
                <div className="flex gap-2">
                    <button onClick={onAddContact} className="p-2 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring" title="New Chat">
                        <Icons.Icon id="newMessage" className="h-5 w-5" />
                    </button>
                    <button className="p-2 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring" title="Menu">
                        <Icons.Icon id="menu" className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Search */}
            <div className="px-4 py-3 border-b border-border/50 flex-shrink-0 bg-background/50 backdrop-blur-sm">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Icons.Icon id="search" className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input 
                        placeholder={t('whatsapp.contactList.search')} 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 h-10 bg-muted/30 border-border/50 rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground transition-colors hover:bg-muted/50 shadow-sm" 
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <ContactListSkeleton />
                ) : error ? (
                    <div className="p-6 text-center text-sm text-destructive bg-destructive/10 m-4 rounded-xl border border-destructive/20">
                        <p>{error}</p>
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        <p>{t('whatsapp.contactList.noConversations')}</p>
                    </div>
                ) : filteredContacts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        <p>{t('whatsapp.contactList.noContactsFound')}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-transparent">
                        {filteredContacts.map(contact => (
                            <ContactListItem 
                                key={contact.contact_name} 
                                contact={contact} 
                                isSelected={selectedContactName === contact.contact_name} 
                                onSelectContact={onSelectContact} 
                                t={t} 
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
