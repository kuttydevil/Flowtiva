import React, { useState, useMemo } from 'react';
import { WhatsAppContact, Priority } from '../../../../types';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Avatar } from '../../../../components/ui/Avatar';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { useTranslation } from '../../../../contexts/LanguageContext';

const timeAgo = (isoTimestamp?: string | null): string => {
    if (!isoTimestamp) return 'N/A';
    const date = new Date(isoTimestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return "just now";
};

const formatDate = (isoTimestamp?: string | null): string => {
    if (!isoTimestamp) return 'N/A';
    return new Date(isoTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const stageColors: { [key: string]: string } = {
    'New': 'bg-blue-500/10 text-blue-500',
    'Contacted': 'bg-purple-500/10 text-purple-500',
    'Proposal': 'bg-yellow-500/10 text-yellow-500',
    'Won': 'bg-green-500/10 text-green-500',
    'Lost': 'bg-red-500/10 text-red-500',
};

const priorityConfig: { [key in Priority]: { color: string; } } = {
  High: { color: 'text-status-red' },
  Medium: { color: 'text-status-yellow' },
  Low: { color: 'text-brand-text-secondary' },
};
const FlagIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z" />
      <path d="M18.25 6.25a.75.75 0 00-1.5 0v3.5A2.25 2.25 0 0114.5 12h-8.5a.75.75 0 000 1.5h8.5A3.75 3.75 0 0018.25 9.75v-3.5z" />
    </svg>
);


interface AllContactsViewProps {
    contacts: WhatsAppContact[];
    isLoading: boolean;
    onViewContact: (contact: WhatsAppContact) => void;
}

export const AllContactsView: React.FC<AllContactsViewProps> = ({ contacts, isLoading, onViewContact }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<'last_message_at' | 'contact_name'>('last_message_at');

    const filteredAndSortedContacts = useMemo(() => {
        let filtered = contacts;

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = contacts.filter(c => 
                c.contact_name.toLowerCase().includes(lowercasedTerm) ||
                c.phone_number?.includes(searchTerm) ||
                c.tags?.some(t => t.toLowerCase().includes(lowercasedTerm))
            );
        }

        return [...filtered].sort((a, b) => {
            if (sortKey === 'contact_name') {
                return a.contact_name.localeCompare(b.contact_name);
            }
            // Default to last_message_at
            const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return dateB - dateA;
        });
    }, [contacts, searchTerm, sortKey]);

    const headers = [
        t('contacts.table.contact'),
        t('contacts.table.phone'),
        t('contacts.table.tags'),
        t('contacts.table.stage'),
        t('contacts.table.priority'),
        t('contacts.table.dueDate'),
        t('contacts.table.lastActivity')
    ];

    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-9 w-48" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }
    
    return (
        <div className="p-6">
            <Card>
                <div className="p-4 border-b border-brand-border flex flex-col md:flex-row items-center justify-between gap-4">
                    <Input 
                        placeholder={t('contacts.searchPlaceholder')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:max-w-xs h-9"
                    />
                    <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as 'last_message_at' | 'contact_name')}
                        className="w-full md:w-auto h-9 rounded-md border border-brand-border bg-brand-primary px-2 py-1.5 text-sm text-brand-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    >
                        <option value="last_message_at">{t('contacts.sortByActivity')}</option>
                        <option value="contact_name">{t('contacts.sortByName')}</option>
                    </select>
                </div>
                <CardContent className="p-0">
                    {filteredAndSortedContacts.length === 0 ? (
                        <p className="text-center py-10 text-sm text-brand-text-secondary">{t('contacts.noResults')}</p>
                    ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="min-w-full divide-y divide-brand-border">
                                <thead className="bg-brand-secondary">
                                    <tr>
                                        {headers.map(h => (
                                            <th key={h} scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-brand-primary divide-y divide-brand-border">
                                    {filteredAndSortedContacts.map(contact => (
                                        <tr key={contact.instance_id + contact.contact_name} onClick={() => onViewContact(contact)} className="hover:bg-brand-secondary cursor-pointer">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={contact.contact_name} className="w-8 h-8"/>
                                                    <span className="font-medium text-brand-text-primary">{contact.contact_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary">{contact.phone_number || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-1">
                                                    {contact.tags?.slice(0, 2).map(tag => (
                                                        <span key={tag} className="text-xs font-medium bg-brand-secondary text-brand-text-secondary px-2 py-0.5 rounded-full">{tag}</span>
                                                    ))}
                                                    {contact.tags && contact.tags.length > 2 && (
                                                        <span className="text-xs font-medium bg-brand-secondary text-brand-text-secondary px-2 py-0.5 rounded-full">+{contact.tags.length - 2}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${stageColors[contact.crm_stage] || 'bg-gray-500/10 text-gray-500'}`}>{contact.crm_stage}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`flex items-center gap-1.5 text-sm font-semibold ${priorityConfig[contact.priority]?.color}`}>
                                                    <FlagIcon className="w-4 h-4" />
                                                    <span>{contact.priority}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary">{formatDate(contact.due_date)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary">{timeAgo(contact.last_message_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile Card View */}
                        <div className="md:hidden">
                            <div className="divide-y divide-brand-border">
                                {filteredAndSortedContacts.map(contact => (
                                    <div key={contact.instance_id + contact.contact_name} onClick={() => onViewContact(contact)} className="p-4 hover:bg-brand-secondary cursor-pointer">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={contact.contact_name} className="w-9 h-9"/>
                                                <span className="font-medium text-brand-text-primary">{contact.contact_name}</span>
                                            </div>
                                            <span className="text-xs text-brand-text-secondary">{timeAgo(contact.last_message_at)}</span>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                            <div>
                                                <p className="text-xs text-brand-text-secondary">{t('contacts.table.stage')}</p>
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${stageColors[contact.crm_stage] || 'bg-gray-500/10 text-gray-500'}`}>{contact.crm_stage}</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-brand-text-secondary">{t('contacts.table.priority')}</p>
                                                 <div className={`flex items-center gap-1.5 font-semibold ${priorityConfig[contact.priority]?.color}`}>
                                                    <FlagIcon className="w-4 h-4" />
                                                    <span>{contact.priority}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-brand-text-secondary">{t('contacts.table.phone')}</p>
                                                <p className="text-brand-text-primary">{contact.phone_number || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-brand-text-secondary">{t('contacts.table.dueDate')}</p>
                                                <p className="text-brand-text-primary">{formatDate(contact.due_date)}</p>
                                            </div>
                                        </div>
                                        {contact.tags && contact.tags.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-xs text-brand-text-secondary mb-1">{t('contacts.table.tags')}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {contact.tags.map(tag => (
                                                        <span key={tag} className="text-xs font-medium bg-brand-secondary text-brand-text-secondary px-2 py-0.5 rounded-full">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
export default AllContactsView;