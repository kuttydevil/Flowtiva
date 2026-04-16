

import React from 'react';
import { Icons } from '../ui/Icons';
import { useTranslation } from '../../../contexts/LanguageContext';

export const Home: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="h-full w-full hidden md:flex flex-col items-center justify-center text-center bg-brand-secondary p-10">
      <Icons.Icon id="logo" className="w-24 h-24 text-brand-accent/30" />
      <h1 className="mt-6 text-2xl font-bold text-brand-text-primary">{t('whatsapp.selectInstance')}</h1>
      <p className="mt-2 max-w-sm text-brand-text-secondary">
        {t('whatsapp.selectInstanceDesc')}
      </p>
    </div>
  );
};