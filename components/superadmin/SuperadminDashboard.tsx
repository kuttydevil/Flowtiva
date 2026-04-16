import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { firebaseService } from '../../services/firebaseService';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { DashboardOverview } from './DashboardOverview';
import { UserManagement } from './UserManagement';
import { InstanceManagement } from './InstanceManagement';
import { SystemHealth } from './SystemHealth';
import { SuperadminDashboardData, PlatformUser, AllInstances, SystemLog } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';

const LogoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-brand-accent"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM6 8.83v6.34L11.03 12 6 8.83zm7 0v6.34L18.03 12 13 8.83z"/></svg>;
const OverviewIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>;
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 18.75a9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
const ServerIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z" /></svg>;
const ShieldExclamationIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>;

type SuperadminTab = 'overview' | 'users' | 'instances' | 'health';

const getTabs = (t: (key: string) => string) => [
    { id: 'overview' as SuperadminTab, name: t('superadmin.tabs.overview'), icon: OverviewIcon },
    { id: 'users' as SuperadminTab, name: t('superadmin.tabs.users'), icon: UsersIcon },
    { id: 'instances' as SuperadminTab, name: t('superadmin.tabs.instances'), icon: ServerIcon },
    { id: 'health' as SuperadminTab, name: t('superadmin.tabs.health'), icon: ShieldExclamationIcon },
];

interface SuperadminDashboardProps { user: User; }

export const SuperadminDashboard: React.FC<SuperadminDashboardProps> = ({ user }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<SuperadminTab>('overview');
    const [dashboardData, setDashboardData] = useState<SuperadminDashboardData | null>(null);
    const [users, setUsers] = useState<PlatformUser[]>([]);
    const [instances, setInstances] = useState<AllInstances[]>([]);
    const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const tabs = getTabs(t);

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [dashData, usersData, instancesData, logsData] = await Promise.all([
                    firebaseService.getSuperadminDashboardData(),
                    firebaseService.getAllUsers(),
                    firebaseService.getAllInstances(),
                    firebaseService.getSystemLogs(100)
                ]);
                setDashboardData(dashData);
                setUsers(usersData);
                setInstances(instancesData);
                setSystemLogs(logsData);
            } catch (err: any) {
                console.error("Error fetching superadmin dashboard data:", err);
                const errorMessage = err?.message || String(err) || "Failed to fetch superadmin data.";
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, []);
    
    const handleSignOut = async () => { await firebaseService.signOut(); };

    const renderContent = () => {
        if (isLoading) {
            return <div className="p-6"><Skeleton className="h-[60vh] w-full" /></div>;
        }
        if (error) {
            return (
                <div className="p-6 bg-red-500/10 text-red-600 dark:text-red-300 rounded-lg border border-red-500/20 flex items-start gap-4">
                    <ShieldExclamationIcon className="h-6 w-6 flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="font-semibold">Superadmin Dashboard Failed to Load</h3>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            );
        }

        switch (activeTab) {
            case 'overview': return <DashboardOverview data={dashboardData} />;
            case 'users': return <UserManagement users={users} />;
            case 'instances': return <InstanceManagement instances={instances} />;
            case 'health': return <SystemHealth logs={systemLogs} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-brand-secondary">
            <header className="bg-brand-primary p-4 flex justify-between items-center border-b border-brand-border sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <LogoIcon />
                    <h1 className="text-xl font-bold text-brand-text-primary">{t('superadmin.title')}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-sm hidden sm:block"><span className="font-semibold">{t('superadmin.adminLabel')}:</span> {user.email}</p>
                    <Button variant="outline" size="sm" onClick={handleSignOut}>{t('dashboard.header.signOut')}</Button>
                </div>
            </header>
            
            <div className="border-b border-brand-border bg-brand-primary">
                <nav className="flex items-center gap-2 px-6" role="tablist" aria-label={t('superadmin.navLabel')}>
                    {tabs.map(tab => (
                        <button 
                            key={tab.id} 
                            role="tab" 
                            aria-selected={activeTab === tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px ${activeTab === tab.id ? 'border-brand-accent text-brand-accent' : 'text-brand-text-secondary border-transparent hover:text-brand-text-primary'}`}
                        >
                           <tab.icon className="h-5 w-5"/> {tab.name}
                        </button>
                    ))}
                </nav>
            </div>
            
            <main className="p-4 md:p-6">{renderContent()}</main>
        </div>
    );
};
export default SuperadminDashboard;