
import React from 'react';
import { PlatformUser } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';

const XIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>;

interface UserDetailsPanelProps {
    user: PlatformUser;
    onClose: () => void;
}

export const UserDetailsPanel: React.FC<UserDetailsPanelProps> = ({ user, onClose }) => {
    return (
        <aside className="w-96 bg-brand-primary border-l border-brand-border flex flex-col animate-in slide-in-from-right-5 duration-300">
            <header className="p-4 border-b border-brand-border flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold text-brand-text-primary">User Details</h3>
                <Button variant="ghost" size="icon" onClick={onClose} className="-mr-2"><XIcon className="h-5 w-5" /></Button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="text-center">
                    <Avatar name={user.email || ''} className="w-20 h-20 mx-auto mb-3" />
                    <h2 className="font-bold text-lg text-brand-text-primary truncate">{user.email}</h2>
                    <p className="text-sm text-brand-text-secondary">User ID: {user.id.split('-')[0]}</p>
                </div>

                <Card>
                    <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-brand-text-secondary">Status</span>
                            <span className="font-semibold capitalize">{user.subscription_status || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-brand-text-secondary">Plan</span>
                            <span className="font-semibold">{user.plan_name || 'No Plan'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-brand-text-secondary">Cycle</span>
                            <span className="font-semibold capitalize">{user.billing_cycle || 'N/A'}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-brand-text-secondary">Instances</span>
                            <span className="font-semibold">{user.instance_count}</span>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-brand-text-secondary">Joined</span>
                            <span className="font-semibold">{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-brand-text-secondary">Last Sign In</span>
                            <span className="font-semibold">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <footer className="p-4 border-t border-brand-border space-y-2">
                <Button variant="outline" className="w-full">Impersonate User</Button>
                <Button variant="destructive" className="w-full">Suspend Account</Button>
            </footer>
        </aside>
    );
};
