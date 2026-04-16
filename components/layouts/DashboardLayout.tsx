import React, { useState, useEffect, Suspense } from 'react';
import { User } from 'firebase/auth';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { ActiveView } from '../../types';

interface DashboardLayoutProps {
    user: User;
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    children: React.ReactNode;
}

const CenteredLoader: React.FC = () => (
    <div className="h-full w-full flex items-center justify-center bg-background p-4">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ user, activeView, setActiveView, children }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => { if (window.innerWidth < 1024) { setIsCollapsed(true); } };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="h-screen bg-background text-foreground font-sans flex overflow-hidden">
            <Sidebar 
                isCollapsed={isCollapsed} 
                setIsCollapsed={setIsCollapsed} 
                isMobileOpen={isMobileOpen} 
                setIsMobileOpen={setIsMobileOpen} 
                activeView={activeView} 
                setActiveView={setActiveView} 
            />
            <div className={`flex-1 flex flex-col overflow-y-hidden transition-all duration-300 lg:ms-20 ${!isCollapsed ? 'lg:!ms-64' : ''}`}>
                <Header 
                    onMenuClick={() => setIsMobileOpen(true)} 
                    activeView={activeView} 
                    user={user} 
                />
                <main className="flex-1 overflow-y-auto bg-muted/30">
                    <Suspense fallback={<CenteredLoader />}>
                        {children}
                    </Suspense>
                </main>
            </div>
        </div>
    );
};
