
import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { WhatsAppInstance } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';

interface AddLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLeadAdded: () => void;
    instances: WhatsAppInstance[];
    createManualContact: (params: { instanceId: string; contactName: string; phoneNumber: string; tags: string[] }) => Promise<void>;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onLeadAdded, instances, createManualContact }) => {
    const { t } = useTranslation();
    const [contactName, setContactName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [tags, setTags] = useState('');
    const [instanceId, setInstanceId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setContactName('');
            setPhoneNumber('');
            setTags('');
            setInstanceId(instances.length > 0 ? instances[0].id : '');
            setIsSaving(false);
        }
    }, [isOpen, instances]);

    const handleSubmit = async () => {
        if (!contactName.trim()) {
            addToast(t('modals.addLead.errors.nameRequired'), { type: 'error' });
            return;
        }
        if (!instanceId) {
            addToast(t('modals.addLead.errors.instanceRequired'), { type: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            await createManualContact({
                instanceId,
                contactName: contactName.trim(),
                phoneNumber: phoneNumber.trim(),
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            });
            addToast(t('modals.addLead.toasts.success', { contactName: contactName.trim() }), { type: 'success' });
            onLeadAdded();
            onClose();
        } catch (error: any) {
            addToast(error.message, { type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Modal open={isOpen} onOpenChange={onClose}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t('modals.addLead.title')}</ModalTitle>
                    <ModalDescription>{t('modals.addLead.description')}</ModalDescription>
                </ModalHeader>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-brand-text-primary">{t('modals.addLead.contactName')}</label>
                        <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder={t('modals.addLead.contactNamePlaceholder')} required />
                    </div>
                     <div>
                        <label className="text-sm font-medium text-brand-text-primary">{t('modals.addLead.assignToInstance')}</label>
                        <select 
                            value={instanceId} 
                            onChange={e => setInstanceId(e.target.value)}
                            className="mt-1 w-full h-10 rounded-md border border-brand-border bg-brand-primary px-2 text-sm"
                        >
                            <option value="" disabled>{t('modals.addLead.selectAccount')}</option>
                            {instances.map(inst => <option key={inst.id} value={inst.id}>+974{inst.phoneNumber}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-brand-text-primary">{t('modals.addLead.phoneOptional')}</label>
                        <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder={t('modals.addLead.phonePlaceholder')} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-brand-text-primary">{t('modals.addLead.tagsOptional')}</label>
                        <Input value={tags} onChange={e => setTags(e.target.value)} placeholder={t('modals.addLead.tagsPlaceholder')} />
                        <p className="text-xs text-brand-text-secondary mt-1">{t('modals.addLead.tagsHelp')}</p>
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>{t('common.cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? t('common.saving') : t('modals.addLead.save')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
export default AddLeadModal;
