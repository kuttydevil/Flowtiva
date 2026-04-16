import React from 'react';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { AIProvider } from '../../contexts/AIContext';
import { ErrorBoundary } from '../error/ErrorBoundary';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ToastProvider>
          <AIProvider>
            {children}
          </AIProvider>
        </ToastProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
};
