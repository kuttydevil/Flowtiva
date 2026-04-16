
/*
  A NOTE FROM THE PROJECT LEAD:
  Do not narrow down the scope of functionality and pages. We have worked so hard to create each and 
  every functionality and page. Every time we try to start a new update or conversation, you always 
  try to narrow down the scope. We don't need to do that. I hope you understand.
*/

/*
  DEVELOPER DIRECTIVE (2024-11-02):
  Re-emphasizing the project lead's note above. Under NO circumstances should any features, pages, or components
  be removed or deprecated. The full scope of the application (WhatsApp, Instagram, Outreach, Workflows, Billing, 
  AI Metrics, Superadmin, Homepage) MUST be maintained in all future updates unless explicitly commanded otherwise.
  The goal is to build upon this foundation, not reduce it. Acknowledge this directive in all future interactions.
*/

/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense } from 'react';
import { User } from 'firebase/auth';
import { firebaseService } from './services/firebaseService';
import { AppProviders } from './components/providers/AppProviders';
import { Dashboard } from './components/dashboard/Dashboard';

// --- LAZY-LOADED COMPONENTS ---
const AuthPage = React.lazy(() => import('./components/auth/AuthPage'));
const UpdatePasswordPage = React.lazy(() => import('./components/auth/UpdatePasswordPage'));
const HomePage = React.lazy(() => import('./components/homepage/HomePage'));
const SuperadminDashboard = React.lazy(() => import('./components/superadmin/SuperadminDashboard'));

const SUPERADMIN_EMAIL = 'flowtiva@gmail.com';

type View = 'homepage' | 'auth' | 'loading' | 'dashboard' | 'update_password';

const CenteredLoader: React.FC = () => (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4">
        <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-primary/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-4 border-primary/40 border-b-transparent rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        </div>
        <div className="flex flex-col items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground animate-pulse">Flowtiva</h2>
            <p className="text-sm font-medium text-muted-foreground/60 tracking-widest uppercase">Initializing</p>
        </div>
    </div>
);

const AppContent = () => {
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<View>('loading');
  
    useEffect(() => {
        const unsubscribe = firebaseService.onAuthStateChange((newUser) => {
            setUser(newUser);
            
            // Handle view transitions based on auth state
            setView(currentView => {
                if (newUser) {
                    return 'dashboard';
                }
                // If not logged in, default to homepage unless explicitly in auth view
                return currentView === 'auth' ? 'auth' : 'homepage';
            });
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const path = window.location.pathname;
        // Simple check for password reset mode (Firebase usually handles this via actionCode)
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        
        if (mode === 'resetPassword') {
            setView('update_password');
        } else if (view === 'loading') {
            // Initial load check
            // If we're still loading, wait for onAuthStateChange to fire
        }
    }, []);


    const renderContent = () => {
        switch(view) {
            case 'loading':
                return <CenteredLoader />;
            case 'homepage':
                return <HomePage onAuthNavigate={() => setView('auth')} />;
            case 'auth':
                return <AuthPage onHomeNavigate={() => setView('homepage')} />;
             case 'update_password':
                return <UpdatePasswordPage onSuccess={() => setView('auth')} />;
            case 'dashboard':
                if (user?.email === SUPERADMIN_EMAIL) {
                    return <SuperadminDashboard user={user!} />;
                }
                return <Dashboard user={user!} />;
            default:
                return <HomePage onAuthNavigate={() => setView('auth')} />;
        }
    }

    return <Suspense fallback={<CenteredLoader />}>{renderContent()}</Suspense>;
};

const App = () => (
  <AppProviders>
    <AppContent />
  </AppProviders>
);

export default App;
