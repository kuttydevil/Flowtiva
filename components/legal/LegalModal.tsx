
import React from 'react';
import { Button } from '../ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '../ui/Modal';
import { useTranslation } from '../../contexts/LanguageContext';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, title, content }) => {
  const { t } = useTranslation();

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <ModalHeader className="flex-shrink-0 border-b border-brand-border">
             <div className="flex justify-between items-center w-full">
                <ModalTitle>{title}</ModalTitle>
                <button onClick={onClose} className="p-1 rounded-full text-brand-text-secondary hover:bg-brand-secondary transition-colors" aria-label={t('legal.close')}>
                    <XIcon className="h-5 w-5" />
                </button>
             </div>
        </ModalHeader>
        <div className="p-6 overflow-y-auto flex-grow bg-brand-primary">
            {content}
        </div>
        <ModalFooter className="flex-shrink-0">
            <Button variant="outline" onClick={onClose}>
                {t('legal.close')}
            </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
