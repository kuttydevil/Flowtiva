
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PlatformUser } from '../../types';
import { UserDetailsPanel } from './UserDetailsPanel';

const subscriptionStatusColors: {[key: string]: string} = { 'active': 'bg-green-500/20 text-green-400', 'trialing': 'bg-sky-500/20 text-sky-400', 'past_due': 'bg-yellow-500/20 text-yellow-400', 'canceled': 'bg-gray-500/20 text-gray-400' };
const formatTimeAgo = (dateString: string | null) => { if (!dateString) return 'N/A'; const date = new Date(dateString); const now = new Date(); const seconds = Math.floor((now.getTime() - date.getTime()) / 1000); if (seconds < 60) return 'Just now'; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; const days = Math.floor(hours / 24); return `${days}d ago`; };

interface UserManagementProps { users: PlatformUser[]; }

export const UserManagement: React.FC<UserManagementProps> = ({ users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter(user => user.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [users, searchTerm]);

    return (
        <div className="flex gap-6 animate-in fade-in-0">
            <div className="flex-1">
                <Card>
                    <div className="p-4 border-b border-brand-border">
                        <Input 
                            placeholder="Search users by email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="max-w-xs"
                        />
                    </div>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-brand-text-secondary uppercase bg-brand-secondary">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">User</th>
                                        <th scope="col" className="px-6 py-3">Plan</th>
                                        <th scope="col" className="px-6 py-3">Instances</th>
                                        <th scope="col" className="px-6 py-3">Last Sign In</th>
                                        <th scope="col" className="px-6 py-3">Registered</th>
                                        <th scope="col" className="px-6 py-3"><span className="sr-only">Details</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-brand-secondary">
                                            <td className="px-6 py-4 font-medium text-brand-text-primary">{user.email || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${subscriptionStatusColors[user.subscription_status || ''] || 'bg-gray-500/20 text-gray-400'}`}>
                                                    {user.plan_name || 'No Plan'} ({user.subscription_status || 'N/A'})
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">{user.instance_count}</td>
                                            <td className="px-6 py-4">{formatTimeAgo(user.last_sign_in_at)}</td>
                                            <td className="px-6 py-4">{new Date(user.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>Details</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {selectedUser && (
                <UserDetailsPanel user={selectedUser} onClose={() => setSelectedUser(null)} />
            )}
        </div>
    );
};
