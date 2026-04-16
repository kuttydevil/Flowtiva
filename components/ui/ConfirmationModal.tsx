



/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from './Modal';
import { Button } from './Button';
import { useTranslation } from '../../contexts/LanguageContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: 'primary' | 'destructive' | 'outline' | 'ghost';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  confirmButtonVariant = 'primary',
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        <div className="p-6 pt-0">
          <ModalDescription>{description}</ModalDescription>
        </div>
        <ModalFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {cancelText || t('modals.buttons.cancel')}
          </Button>
          <Button onClick={onConfirm} variant={confirmButtonVariant}>
            {confirmText || t('modals.buttons.confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
// FIX: Add default export for compatibility with React.lazy
export default ConfirmationModal;