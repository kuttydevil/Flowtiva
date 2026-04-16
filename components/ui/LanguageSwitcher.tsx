import React from 'react';
import { useTranslation } from '../../contexts/LanguageContext';

const LanguageIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C13.18 7.061 14.289 7.5 15.5 7.5c1.21 0 2.32-.439 3.166-1.136m0-1.498V3m-3.166 2.364a48.42 48.42 0 013.166-1.136" />
    </svg>
);


export const LanguageSwitcher = () => {
    const { language, setLanguage } = useTranslation();

    const toggleLanguage = () => {
        const newLang = language === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text-primary transition-colors"
            aria-label="Change language"
        >
            <LanguageIcon className="h-5 w-5" />
            <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>
    );
};
