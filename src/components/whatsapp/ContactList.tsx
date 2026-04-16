
import React, { useState, memo, useMemo } from 'react';
import { WhatsAppContact } from '../../types';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import { Avatar } from '../ui/Avatar';
import { useTranslation } from '../../contexts/LanguageContext';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { Icons } from '../ui/Icons';

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
    
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const ContactListSkeleton = () => (
    <div className="p-2 space-y-1">
        {[...Array(10)].map((_, i) => (
            <div key={i} className="p-3 flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
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
            <button onClick={() => onSelectContact(contact)} className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center space-x-3 relative ${isSelected ? 'bg-brand-secondary' : 'hover:bg-brand-secondary'}`}>
                <Avatar name={contact.contact_name} className="w-10 h-10 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold text-sm truncate text-brand-text-primary">{contact.contact_name}</p>
                        <p className={`text-xs flex-shrink-0 ms-2 ${contact.unread_count > 0 ? 'text-brand-accent font-bold' : 'text-brand-text-secondary'}`}>{timeAgo(contact.last_message_at, t)}</p>
                    </div>
                    <div className="flex justify-between items-start mt-1">
                        <p className="text-sm truncate pe-2 text-brand-text-secondary">{contact.last_message_text || '...'}</p>
                        {contact.unread_count > 0 && (
                            <span className="flex-shrink-0 text-xs font-bold bg-brand-accent text-white rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                                {contact.unread_count}
                            </span>
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const filteredContacts = useMemo(() => 
        contacts
            .filter(c => c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
                const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
                return dateB - dateA;
            })
    , [contacts, searchTerm]);

    const handleSignOut = async () => {
      await supabase.auth.signOut();
      addToast(t('dashboard.header.signOutSuccess'), { type: 'info' });
    };

    return (
        <div className="h-full bg-brand-primary flex flex-col w-full border-r border-brand-border">
            <header className="p-3 flex-shrink-0 border-b border-brand-border flex items-center justify-between">
                <button onClick={onBackToDashboard} className="p-2 rounded-full hover:bg-brand-secondary -ml-2">
                    <Icons.Icon id="back" className="h-5 w-5 text-brand-text-secondary" />
                </button>
                <div className="flex items-center gap-2">
                    <Icons.Icon id="logo" className="h-7 w-7 text-brand-accent" />
                    <h2 className="font-bold text-lg">Flowtiva</h2>
                </div>
                <div className="relative">
                    <button onClick={() => onAddContact()} className="p-2 rounded-full text-brand-text-secondary hover:bg-brand-secondary">
                        <Icons.Icon id="newMessage" className="h-5 w-5" />
                    </button>
                </div>
            </header>
            <div className="p-3 border-b border-brand-border flex-shrink-0">
                <div className="relative">
                    <Icons.Icon id="search" className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-secondary" />
                    <Input placeholder={t('whatsapp.contactList.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full ps-9 h-9 bg-brand-secondary border-none rounded-lg" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? <ContactListSkeleton /> : error ? <p className="p-4 text-sm text-status-red text-center">{error}</p> : contacts.length === 0 ? <p className="p-4 text-sm text-brand-text-secondary text-center">{t('whatsapp.contactList.noConversations')}</p> : filteredContacts.length === 0 ? <p className="p-4 text-sm text-brand-text-secondary text-center">{t('whatsapp.contactList.noContactsFound')}</p> : (
                    <ul className="space-y-1">{filteredContacts.map(contact => <ContactListItem key={contact.contact_name} contact={contact} isSelected={selectedContactName === contact.contact_name} onSelectContact={onSelectContact} t={t} />)}</ul>
                )}
            </div>
        </div>
    );
};