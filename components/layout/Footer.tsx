
import React from 'react';
import { useTranslation } from '../../contexts/LanguageContext';


const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M22.46 6c-.77.35-1.6.58-2.46.67.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.27 0 .34.04.67.11.98-3.56-.18-6.73-1.89-8.84-4.48-.37.63-.58 1.37-.58 2.15 0 1.48.75 2.79 1.9 3.55-.7-.02-1.37-.22-1.95-.55v.05c0 2.07 1.48 3.8 3.44 4.2-.36.1-.74.15-1.14.15-.28 0-.55-.03-.81-.08.55 1.7 2.14 2.93 4.03 2.96-1.46 1.14-3.3 1.82-5.3 1.82-.34 0-.68-.02-1.02-.06 1.9 1.22 4.16 1.93 6.56 1.93 7.88 0 12.2-6.54 12.2-12.2 0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.22z"></path>
  </svg>
);

const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zm-11 5H5v10h3V8zm-1.5-2.25A1.75 1.75 0 0 0 5 4a1.75 1.75 0 0 0 0 3.5A1.75 1.75 0 0 0 6.5 5.75zM19 8h-3a3.99 3.99 0 0 0-4 4v6h3v-5a1 1 0 0 1 1-1h2v6h3V12a4 4 0 0 0-4-4z"></path>
  </svg>
);

interface FooterProps {
    onOpenPolicy: (policy: 'privacy' | 'terms') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPolicy }) => {
  const { t } = useTranslation();

  const handleLinkClick = (policy: 'privacy' | 'terms') => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onOpenPolicy(policy);
  };

  return (
    <footer id="contact" className="bg-brand-primary border-t border-brand-border p-4 text-sm text-brand-text-secondary flex-shrink-0">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        <div className="flex items-center gap-6">
          <a href="#" onClick={handleLinkClick('privacy')} className="hover:text-brand-text-primary transition-colors">{t('footer.privacy')}</a>
          <a href="#" onClick={handleLinkClick('terms')} className="hover:text-brand-text-primary transition-colors">{t('footer.terms')}</a>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" aria-label="Twitter" className="hover:text-brand-text-primary transition-colors">
            <TwitterIcon className="h-5 w-5" />
          </a>
          <a href="#" aria-label="LinkedIn" className="hover:text-brand-text-primary transition-colors">
            <LinkedInIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};
