
/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from '../ui/Avatar';
import type { ActiveView } from '../../types';
import { User } from 'firebase/auth';
import { firebaseService } from '../../services/firebaseService';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { Input } from '../ui/Input';
import { ThemeToggle as NewThemeToggle } from '../ui/theme-toggle';
import { cn } from '../../lib/utils';

// --- Icons ---
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
);
const LogoutIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
);
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
);
const BellIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
);
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
);

// --- Sub-components ---

// Theme Toggle Component Wrapper
export const ThemeToggle = () => {
    const { t } = useTranslation();
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        }
        return 'dark';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    return (
        <NewThemeToggle 
            theme={theme} 
            toggleTheme={toggleTheme} 
            aria-label={t('header.toggleTheme')} 
        />
    );
};

// Global Search with Keyboard Shortcut Hint
const GlobalSearch = () => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [isActive, setIsActive] = useState(false);
    
    return (
        <div className="relative hidden md:block w-full max-w-md transition-all duration-300">
            <div className={cn(
                "relative group flex items-center transition-all duration-300 rounded-full overflow-hidden",
                isActive 
                    ? "bg-background shadow-[0_0_0_2px_rgba(var(--primary),0.2)] ring-1 ring-border translate-y-[-1px]" 
                    : "bg-muted/50 hover:bg-muted border border-transparent"
            )}>
                <SearchIcon className={cn(
                    "absolute left-3 h-4 w-4 pointer-events-none transition-colors", 
                    isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <Input
                    type="text"
                    placeholder={t('header.searchPlaceholder')}
                    className="w-full h-10 pl-10 pr-12 bg-transparent border-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70 text-sm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsActive(true)}
                    onBlur={() => setIsActive(false)}
                />
                <div className="absolute right-3 flex items-center pointer-events-none">
                    <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 shadow-sm">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </div>
            </div>
        </div>
    );
};

// Notification Icon Button
const NotificationButton = () => {
    return (
        <button className="relative p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 group">
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
        </button>
    )
}

interface HeaderProps {
    onMenuClick?: () => void;
    activeView: ActiveView;
    user: User;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, activeView, user }) => {
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsDropdownOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
      try {
          await firebaseService.signOut();
          addToast(t('dashboard.header.signOutSuccess'), { type: 'info' });
      } catch (error: any) {
          addToast(error.message || 'Error signing out', { type: 'error' });
      }
  };

  const getTitle = () => {
    switch (activeView) {
      case 'overview': return t('dashboard.header.hub');
      case 'pipeline': return t('dashboard.header.pipeline');
      case 'contacts': return t('dashboard.header.contacts');
      case 'instagram': return t('dashboard.header.instagram');
      case 'outreach': return t('dashboard.header.outreach');
      case 'workflows': return t('dashboard.header.workflows');
      case 'billing': return t('dashboard.header.billing');
      case 'ai_metrics': return t('dashboard.header.ai_metrics');
      default: return 'Dashboard';
    }
  };
  const title = getTitle();
  
  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 flex items-center justify-between gap-6 transition-all duration-300">
      
      {/* Left: Title & Mobile Menu */}
      <div className="flex items-center gap-4 min-w-[200px]">
        {onMenuClick && (
            <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t('header.openMenu')}>
                <MenuIcon className="h-6 w-6" />
            </button>
        )}
        <div className="flex flex-col justify-center">
            <h1 key={title} className="text-xl font-semibold text-foreground animate-in fade-in slide-in-from-left-2 duration-300 tracking-tight leading-none">
                {title}
            </h1>
            {/* Optional Breadcrumb or secondary info could go here */}
        </div>
      </div>

      {/* Center: Search */}
      <div className="flex-1 flex justify-center max-w-xl">
        <GlobalSearch />
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3 min-w-[200px] justify-end">
        <div className="hidden sm:flex items-center gap-1 pr-3 border-r border-border/50">
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationButton />
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                className="flex items-center gap-3 p-1 rounded-full hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-border/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
            >
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-foreground leading-tight">{t('dashboard.header.administrator')}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight max-w-[120px] truncate">{user?.email}</p>
                </div>
                <Avatar name={user?.email || 'User'} className="h-9 w-9 ring-2 ring-background shadow-sm" />
            </button>

            {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-3 w-64 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl text-popover-foreground shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 z-50 overflow-hidden">
                    <div className="p-4 border-b border-border/50 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('dashboard.header.signedInAs')}</p>
                        <p className="text-sm font-medium truncate text-foreground">{user?.email}</p>
                    </div>
                    <div className="p-2 space-y-1">
                        {/* Mobile-only settings visible in dropdown */}
                        <div className="sm:hidden space-y-1 pb-2 mb-2 border-b border-border/50">
                             <div className="px-2 py-1.5 flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">{t('common.theme')}</span>
                                <ThemeToggle />
                             </div>
                             <div className="px-2 py-1.5 flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">{t('common.language')}</span>
                                <LanguageSwitcher />
                             </div>
                        </div>

                        <button onClick={handleSignOut} className="w-full text-start flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-destructive">
                            <LogoutIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                            {t('dashboard.header.signOut')}
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </header>
  );
};
