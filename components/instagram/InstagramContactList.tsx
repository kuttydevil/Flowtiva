
import React, { useState, memo, useMemo } from 'react';
import { InstagramContact } from '../../types';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useTranslation } from '../../contexts/LanguageContext';

interface ContactListProps {
    contacts: InstagramContact[];
    selectedContactUsername: string | null;
    onSelectContact: (contact: InstagramContact) => void;
    isLoading: boolean;
    error: string | null;
    onBack: () => void;
    instanceUsername: string;
}

const timeAgo = (isoTimestamp: string | null | undefined, t: (key: string) => string): string => {
    if (!isoTimestamp) return '';
    const date = new Date(isoTimestamp);
    const today = new Date();
    if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) {
        return t('common.yesterday');
    }
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);

const BackArrowIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
);

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
    contact: InstagramContact;
    isSelected: boolean;
    onSelectContact: (contact: InstagramContact) => void;
    t: (key: string) => string;
}) => {
    return (
        <li>
            <button
                onClick={() => onSelectContact(contact)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex items-center space-x-3 relative ${isSelected ? 'bg-brand-secondary' : 'hover:bg-brand-secondary'}`}
            >
                {isSelected && <div className="absolute start-0 top-0 h-full w-1 bg-gradient-to-br from-purple-500 to-pink-500 rounded-s-lg"></div>}
                <Avatar name={contact.contact_username} className="w-10 h-10" />
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold text-sm truncate text-brand-text-primary">{contact.contact_username}</p>
                        <p className="text-xs flex-shrink-0 ms-2 text-brand-text-secondary">{timeAgo(contact.last_message_at, t)}</p>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-sm truncate pe-2 text-brand-text-secondary">{contact.last_message_text || '...'}</p>
                        {contact.unread_count > 0 && (
                            <span className="flex-shrink-0 text-xs font-bold bg-pink-500 text-white rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                                {contact.unread_count}
                            </span>
                        )}
                    </div>
                </div>
            </button>
        </li>
    );
});


export const InstagramContactList: React.FC<ContactListProps> = ({ contacts, selectedContactUsername, onSelectContact, isLoading, error, onBack, instanceUsername }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredContacts = useMemo(() => {
        return contacts.filter(c => c.contact_username.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [contacts, searchTerm]);

    return (
        <div className="h-full bg-brand-primary flex flex-col w-full">
            <header className="p-3 border-b border-brand-border flex-shrink-0 space-y-3">
                 <div className="flex items-center gap-2">
                    <Button onClick={onBack} variant="ghost" size="icon" className="-ms-2"><BackArrowIcon className="h-5 w-5"/></Button>
                    <div className="flex-1">
                        <h3 className="font-semibold text-brand-text-primary px-1">{t('instagram.contactList.title')}</h3>
                        <p className="text-xs text-brand-text-secondary px-1">{t('instagram.contactList.forUsername', { username: instanceUsername })}</p>
                    </div>
                </div>
                <div className="relative">
                    <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-secondary" />
                    <Input
                        placeholder={t('instagram.contactList.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full ps-9 h-9 bg-brand-secondary border-none"
                    />
                </div>
            </header>
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <ContactListSkeleton />
                ) : error ? (
                    <p className="p-4 text-sm text-status-red text-center">{error}</p>
                ) : contacts.length === 0 ? (
                    <p className="p-4 text-sm text-brand-text-secondary text-center">{t('instagram.contactList.noConversations')}</p>
                ) : filteredContacts.length === 0 ? (
                    <p className="p-4 text-sm text-brand-text-secondary text-center">{t('instagram.contactList.noResults')}</p>
                ) : (
                    <ul className="p-2 space-y-1">
                        {filteredContacts.map(contact => (
                            <ContactListItem
                                key={contact.contact_username}
                                contact={contact}
                                isSelected={selectedContactUsername === contact.contact_username}
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
