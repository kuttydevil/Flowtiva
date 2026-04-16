

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

// Define the shape of the context
interface LanguageContextType {
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => any;
}

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Define props for the provider
interface LanguageProviderProps {
  children: React.ReactNode;
}

let translationsCache: { [key: string]: any } = {};

// The provider component
export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<'en' | 'ar'>('en');
  const [translations, setTranslations] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadAndSetLanguage = useCallback(async (lang: 'en' | 'ar', updateHistory: boolean) => {
    setIsLoading(true);
    setLanguageState(lang);
    localStorage.setItem('flowtiva-lang', lang);

    if (updateHistory) {
      const newPath = lang === 'ar' ? '/ar/' : '/';
      if (window.location.pathname !== newPath) {
        try {
          window.history.pushState({ lang }, '', newPath);
        } catch (e) {
          console.warn("Could not update URL path. This can happen in sandboxed environments.", e);
        }
      }
    }

    if (translationsCache[lang]) {
        setTranslations(translationsCache[lang]);
    } else {
      try {
          const response = await fetch(`/locales/${lang}.json`);
          if (!response.ok) throw new Error('Failed to fetch translation');
          const data = await response.json();
          translationsCache[lang] = data;
          setTranslations(data);
      } catch (err) {
          console.error(`Could not load translations for ${lang}`, err);
      }
    }
    setIsLoading(false);
  }, []);

  // Effect for initial load and history navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const urlLang = path.startsWith('/ar') ? 'ar' : 'en';
      loadAndSetLanguage(urlLang, false); // Don't update history on back/forward
    };

    // Initial language detection: Prioritize localStorage over URL path.
    // This ensures the user's explicit choice is respected, especially in environments
    // where URL manipulation via pushState might be restricted.
    const storedLang = localStorage.getItem('flowtiva-lang') as 'en' | 'ar' | null;
    const path = window.location.pathname;
    const urlLang = path.startsWith('/ar') ? 'ar' : 'en';
    
    const initialLang = storedLang || urlLang;
    loadAndSetLanguage(initialLang, false);

    // Listen for history changes
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [loadAndSetLanguage]);

  // Effect to update document attributes when language changes
  useEffect(() => {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Public function to change language
  const setLanguage = (lang: 'en' | 'ar') => {
    if (lang !== language) {
      loadAndSetLanguage(lang, true);
    }
  };
  
  const t = useCallback((key: string, replacements?: { [key: string]: string | number }): any => {
    if (isLoading) {
        if (key.endsWith('features')) return [];
        return '...';
    }
    const keys = key.split('.');
    let value = keys.reduce((acc, currentKey) => (acc as any)?.[currentKey], translations);

    if (value === undefined) {
      console.warn(`Translation key not found: "${key}"`);
      if (key.endsWith('features')) {
          return [];
      }
      return key;
    }
    
    if (typeof value === 'string' && replacements) {
      for (const placeholder in replacements) {
        // Use a global regex to replace all instances of {placeholder}
        const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
        value = value.replace(regex, String(replacements[placeholder]));
      }
    }

    return value;
  }, [translations, isLoading]);

  const value = { language, setLanguage, t };

  if(isLoading && !Object.keys(translations).length) {
    return (
       <div className="h-screen w-full flex items-center justify-center bg-brand-secondary">
          <svg className="animate-spin h-8 w-8 text-brand-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
      </div>
    )
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
