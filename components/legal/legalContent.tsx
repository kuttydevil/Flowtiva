

import React from 'react';
import { useTranslation } from '../../contexts/LanguageContext';

export const PrivacyPolicyContent = () => {
    const { t } = useTranslation();
    return (
      <div className="space-y-4 text-sm text-brand-text-secondary">
        <p><strong>{t('legal.lastUpdatedLabel')}:</strong> {t('legal.lastUpdated', { date: 'August 6, 2024'})}</p>
        <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.privacy.l1')}</h3>
        <p>{t('legal.privacy.p1')}</p>
        <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.privacy.l2')}</h3>
        <p>{t('legal.privacy.p2')}</p>
        <ul className="list-disc list-inside space-y-2 ps-4">
          <li>{t('legal.privacy.li2_1')}</li>
          <li>{t('legal.privacy.li2_2')}</li>
          <li>{t('legal.privacy.li2_3')}</li>
          <li>{t('legal.privacy.li2_4')}</li>
        </ul>
        <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.privacy.l3')}</h3>
        <p>{t('legal.privacy.p3')}</p>
        <ul className="list-disc list-inside space-y-2 ps-4">
          <li>{t('legal.privacy.li3_1')}</li>
          <li>{t('legal.privacy.li3_2')}</li>
          <li>{t('legal.privacy.li3_3')}</li>
          <li>{t('legal.privacy.li3_4')}</li>
          <li>{t('legal.privacy.li3_5')}</li>
          <li>{t('legal.privacy.li3_6')}</li>
        </ul>
        <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.privacy.l4')}</h3>
        <p>{t('legal.privacy.p4')}</p>
        <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.privacy.l5')}</h3>
        <p>{t('legal.privacy.p5')}</p>
      </div>
    );
};

export const TermsOfServiceContent = () => {
    const { t } = useTranslation();
    return (
        <div className="space-y-4 text-sm text-brand-text-secondary">
            <p><strong>{t('legal.lastUpdatedLabel')}:</strong> {t('legal.lastUpdated', { date: 'August 6, 2024'})}</p>
            <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.terms.l1')}</h3>
            <p>{t('legal.terms.p1')}</p>
            <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.terms.l2')}</h3>
            <p>{t('legal.terms.p2')}</p>
            <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.terms.l3')}</h3>
            <p>{t('legal.terms.p3')}</p>
            <ul className="list-disc list-inside space-y-2 ps-4">
                <li>{t('legal.terms.li3_1')}</li>
                <li>{t('legal.terms.li3_2')}</li>
                <li>{t('legal.terms.li3_3')}</li>
                <li>{t('legal.terms.li3_4')}</li>
            </ul>
            <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.terms.l4')}</h3>
            <p>{t('legal.terms.p4')}</p>
            <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.terms.l5')}</h3>
            <p>{t('legal.terms.p5')}</p>
            <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.terms.l6')}</h3>
            <p>{t('legal.terms.p6')}</p>
            <h3 className="text-base font-semibold text-brand-text-primary">{t('legal.terms.l7')}</h3>
            <p>{t('legal.terms.p7')}</p>
      </div>
    );
};