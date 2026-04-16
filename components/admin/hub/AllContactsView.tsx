import React, { useState, useMemo } from 'react';
import { WhatsAppContact, Priority } from '../../../types';
import { Card, CardContent } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Avatar } from '../../ui/Avatar';
import { Skeleton } from '../../ui/Skeleton';

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

    const headers = ['Contact', 'Phone Number', 'Tags', 'Stage', 'Priority', 'Due Date', 'Last Activity'];

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
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
                    <Input 
                        placeholder="Search by name, phone, or tag..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full sm:max-w-xs h-9 bg-background/50 border-border/50 shadow-sm"
                    />
                    <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as 'last_message_at' | 'contact_name')}
                        className="w-full sm:w-auto h-9 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors hover:bg-background"
                    >
                        <option value="last_message_at">Sort by Last Activity</option>
                        <option value="contact_name">Sort by Name</option>
                    </select>
                </div>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border/50">
                            <thead className="bg-muted/30">
                                <tr>
                                    {headers.map(h => (
                                        <th key={h} scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-border/50">
                                {filteredAndSortedContacts.length === 0 ? (
                                    <tr><td colSpan={headers.length} className="text-center py-12 text-sm text-muted-foreground">No contacts found.</td></tr>
                                ) : filteredAndSortedContacts.map(contact => (
                                    <tr key={contact.instance_id + contact.contact_name} onClick={() => onViewContact(contact)} className="hover:bg-muted/50 cursor-pointer transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={contact.contact_name} className="w-9 h-9 ring-2 ring-background shadow-sm"/>
                                                <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{contact.contact_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{contact.phone_number || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-wrap gap-1.5">
                                                {contact.tags?.slice(0, 2).map(tag => (
                                                    <span key={tag} className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border/50">{tag}</span>
                                                ))}
                                                {contact.tags && contact.tags.length > 2 && (
                                                    <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border/50">+{contact.tags.length - 2}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${stageColors[contact.crm_stage] || 'bg-muted text-muted-foreground border border-border/50'}`}>{contact.crm_stage}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`flex items-center gap-1.5 text-sm font-medium ${priorityConfig[contact.priority]?.color}`}>
                                                <FlagIcon className="w-4 h-4" />
                                                <span>{contact.priority}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(contact.due_date)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{timeAgo(contact.last_message_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
export default AllContactsView;