
/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar } from '../ui/Avatar';
import type { ActiveView } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isCollapsed: boolean;
  view: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, isCollapsed, view }) => (
  <button
    onClick={onClick}
    className={cn(
      "relative flex items-center w-full h-11 px-3 rounded-xl transition-all duration-300 group text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring select-none",
      isActive
        ? "text-primary bg-primary/5"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
    )}
    title={isCollapsed ? label : ''}
    disabled={isActive}
  >
    {isActive && (
        <motion.div
            layoutId="active-nav-bg"
            className="absolute inset-0 bg-primary/10 rounded-xl z-0"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
    )}
    
    <div className={cn(
        "relative z-10 flex-shrink-0 w-5 h-5 transition-transform duration-300 group-active:scale-95", 
        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
    )}>
        {icon}
    </div>
    
    <AnimatePresence mode="wait">
        {!isCollapsed && (
            <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 ms-3 truncate"
            >
                {label}
            </motion.span>
        )}
    </AnimatePresence>

    {isActive && !isCollapsed && (
        <motion.div 
            layoutId="active-nav-indicator"
            className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
    )}
  </button>
);

// Optimized Icons (SVG code kept concise)
const HubIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6ZM12 15.75v-3.75m0 0h3.75m-3.75 0h-3.75m3.75 3.75V18m0-6.375v-3.75m3.75 3.75h3.75m-3.75 0h-3.75m-3.75 3.75v3.75m0-3.75h3.75m-3.75 0h-3.75" /></svg>;
const PipelineIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75c0-.231-.035-.454-.1-.664M6.75 7.5H18a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25-2.25H6.75A2.25 2.25 0 0 1 4.5 18.75V9.75A2.25 2.25 0 0 1 6.75 7.5Z" /></svg>;
const ContactsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 18.75a9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.337 9.337 0 0 0 4.121-2.253 9.5 9.5 0 0 0-1.255-5.221.75.75 0 0 0-1.32-.224 6.963 6.963 0 0 1-5.603 3.07.75.75 0 0 0-.84.84 6.963 6.963 0 0 1 3.07 5.604.75.75 0 0 0 .224 1.32Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
const InstagramIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>;
const OutreachIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>;
const WorkflowIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>;
const BillingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 21Z" /></svg>;
const AIMetricsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>;
const CollapseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>;
const ExpandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
const LogoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-primary drop-shadow-sm">
        <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM6 8.83v6.34L11.03 12 6 8.83zm7 0v6.34L18.03 12 13 8.83z"/>
    </svg>
);

interface SidebarContentProps {
    isCollapsed: boolean;
    setIsCollapsed: (c: boolean) => void;
    onNavClick: (view: ActiveView) => void;
    activeView: ActiveView;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ isCollapsed, setIsCollapsed, onNavClick, activeView }) => {
    const { t } = useTranslation();
    const navItems = [
        { view: 'overview', label: t('dashboard.sidebar.hub'), icon: <HubIcon /> },
        { view: 'pipeline', label: t('dashboard.sidebar.pipeline'), icon: <PipelineIcon /> },
        { view: 'contacts', label: t('dashboard.sidebar.contacts'), icon: <ContactsIcon /> },
        { view: 'instagram', label: t('dashboard.sidebar.instagram'), icon: <InstagramIcon /> },
        { view: 'outreach', label: t('dashboard.sidebar.outreach'), icon: <OutreachIcon /> },
        { view: 'workflows', label: t('dashboard.sidebar.workflows'), icon: <WorkflowIcon /> },
        { view: 'billing', label: t('dashboard.sidebar.billing'), icon: <BillingIcon /> },
        { view: 'ai_metrics', label: t('dashboard.sidebar.ai_metrics'), icon: <AIMetricsIcon /> },
    ];

    return (
    <motion.div 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 256 }}
        className={cn(
            "h-screen sticky top-0 bg-background/95 backdrop-blur-xl border-r border-border/40 flex flex-col transition-colors duration-300 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-20 overflow-hidden",
        )}
    >
      <div className={cn(
          "flex items-center h-20 px-4 flex-shrink-0 mb-2",
          isCollapsed ? "justify-center" : "justify-between"
      )}>
        <AnimatePresence mode="wait">
            {!isCollapsed ? (
                <motion.div 
                    key="logo-full"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-3"
                >
                    <div className="p-2 bg-primary/10 rounded-2xl shadow-inner ring-1 ring-primary/20">
                        <LogoIcon />
                    </div>
                    <span className="text-xl font-black text-foreground tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">Flowtiva</span>
                </motion.div>
            ) : (
                <motion.div
                    key="logo-small"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="p-2 bg-primary/10 rounded-2xl shadow-inner ring-1 ring-primary/20"
                >
                    <LogoIcon />
                </motion.div>
            )}
        </AnimatePresence>
        
        {!isCollapsed && (
            <button 
                onClick={() => setIsCollapsed(true)} 
                className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground hidden lg:flex transition-all active:scale-95 border border-transparent hover:border-border/50"
            >
                <CollapseIcon />
            </button>
        )}
      </div>

      {isCollapsed && (
          <div className="flex justify-center mb-6">
              <button 
                onClick={() => setIsCollapsed(false)} 
                className="p-2.5 rounded-2xl bg-muted/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20 shadow-sm overflow-hidden group"
              >
                <ExpandIcon />
              </button>
          </div>
      )}
      
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide py-2">
        {navItems.map(item => (
            <NavItem
                key={item.view}
                view={item.view}
                label={item.label}
                icon={item.icon}
                isActive={activeView === item.view}
                onClick={() => onNavClick(item.view as ActiveView)}
                isCollapsed={isCollapsed}
            />
        ))}
      </nav>
      
      <div className="p-4 border-t border-border/40 mt-auto bg-muted/5">
        <div className={cn(
            "flex items-center gap-3 p-2 rounded-2xl transition-all duration-300", 
            isCollapsed ? "justify-center" : "hover:bg-muted/80 cursor-pointer group/user"
        )}>
          <div className="relative flex-shrink-0">
             <Avatar name="Flowtiva Admin" className="w-10 h-10 rounded-2xl ring-2 ring-background shadow-md transition-transform group-hover/user:scale-105" />
             <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-status-green border-2 border-background rounded-full shadow-sm"></span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate tracking-tight">System Admin</p>
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 truncate">{t('dashboard.header.administrator')}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
)};


export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen, activeView, setActiveView }) => {
  const handleNav = (view: ActiveView) => {
    setActiveView(view);
    setIsMobileOpen(false);
  };
  
  return (
    <>
        {/* Mobile Sidebar Overlay */}
        <div className={cn("lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300", isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={() => setIsMobileOpen(false)} aria-hidden="true" />
        
        {/* Mobile Sidebar */}
        <div className={cn("lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-background shadow-2xl transform transition-transform duration-300 ease-in-out", isMobileOpen ? "translate-x-0" : "-translate-x-full")}>
             <SidebarContent 
                isCollapsed={false} 
                setIsCollapsed={() => {}}
                onNavClick={handleNav}
                activeView={activeView}
             />
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block fixed top-0 left-0 h-full z-10">
            <SidebarContent 
                isCollapsed={isCollapsed} 
                setIsCollapsed={setIsCollapsed}
                onNavClick={(view) => setActiveView(view)}
                activeView={activeView}
            />
        </aside>
    </>
  );
};
