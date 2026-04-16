import React, { useState, useMemo } from 'react';
import { supabase } from '../../services/supabaseService';
import { WhatsAppInstance, OutreachCampaign } from '../../types';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../../contexts/ToastContext';

interface CreateCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCampaignCreated: () => void;
    instances: WhatsAppInstance[];
}

type ContactData = {
    phone_number: string;
    contact_name?: string;
    variables: Record<string, any>;
};

const cleanPhoneNumber = (num: string) => {
    let value = num.replace(/\s/g, '');
    if (value.startsWith('+')) value = value.substring(1);
    return value.replace(/\D/g, '');
};

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose, onCampaignCreated, instances }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [instanceId, setInstanceId] = useState<string>('');
    const [messageTemplate, setMessageTemplate] = useState('');
    const [contactsCsv, setContactsCsv] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    
    const [createdCampaign, setCreatedCampaign] = useState<OutreachCampaign | null>(null);

    const parsedContacts = useMemo((): ContactData[] => {
        if (!contactsCsv.trim()) return [];
        const lines = contactsCsv.trim().split('\n');
        const headers = ['phone_number', 'contact_name', ...messageTemplate.match(/\{\{(\w+)\}\}/g)?.map(v => v.slice(2, -2)) || []];

        return lines.map(line => {
            const values = line.split(',').map(v => v.trim());
            const phone = cleanPhoneNumber(values[0] || '');
            if (!phone) return null;

            const contact: ContactData = { phone_number: phone, variables: {} };
            contact.contact_name = values[1] || `Contact ${phone.slice(-4)}`;
            
            headers.slice(2).forEach((header, i) => {
                if (values[i + 2]) {
                    contact.variables[header] = values[i + 2];
                }
            });
            return contact;
        }).filter((c): c is ContactData => c !== null);
    }, [contactsCsv, messageTemplate]);

    const resetState = () => {
        setStep(1);
        setName('');
        setInstanceId('');
        setMessageTemplate('');
        setContactsCsv('');
        setIsSubmitting(false);
        setError(null);
        setCreatedCampaign(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleSubmit = async () => {
        if (parsedContacts.length === 0) {
            setError("Please add at least one valid contact.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const newCampaign = await supabase.createOutreachCampaign(instanceId, name, messageTemplate, parsedContacts);
            if (newCampaign) {
                addToast(`Campaign "${name}" created successfully!`, { type: 'success' });
                setCreatedCampaign(newCampaign);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStartCampaign = async () => {
        if (!createdCampaign) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await supabase.updateCampaignStatus(createdCampaign.id, 'running');
            addToast(`Campaign "${createdCampaign.name}" has started.`, { type: 'info' });
            onCampaignCreated();
            handleClose();
        } catch (err: any) {
            setError("Failed to start campaign: " + err.message);
            setIsSubmitting(false);
        }
    };

    const renderContent = () => {
        if (createdCampaign) {
            return (
               <>
                   <ModalHeader>
                       <ModalTitle>Campaign Created Successfully!</ModalTitle>
                       <ModalDescription>Your campaign "{createdCampaign.name}" is now saved as a draft.</ModalDescription>
                   </ModalHeader>
                   <div className="p-6 text-center">
                       <p className="text-brand-text-secondary">
                           You can start sending messages now, or do it later from the dashboard.
                       </p>
                       {error && <p className="text-sm text-status-red mt-4">{error}</p>}
                   </div>
                   <ModalFooter>
                       <Button variant="outline" onClick={() => { onCampaignCreated(); handleClose(); }}>Done</Button>
                       <Button onClick={handleStartCampaign} disabled={isSubmitting}>
                           {isSubmitting ? 'Starting...' : 'Start Campaign Now'}
                       </Button>
                   </ModalFooter>
               </>
           );
        }

        switch (step) {
            case 1:
                return (
                    <>
                        <ModalHeader>
                            <ModalTitle>New Outreach Campaign (Step 1 of 2)</ModalTitle>
                            <ModalDescription>Define the campaign basics and message template.</ModalDescription>
                        </ModalHeader>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium">Campaign Name</label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Q4 Real Estate Follow-up" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Sending Account</label>
                                <select value={instanceId} onChange={e => setInstanceId(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-brand-border bg-brand-primary px-2 text-sm">
                                    <option value="">Select an account</option>
                                    {instances.map(inst => <option key={inst.id} value={inst.id}>+974{inst.phoneNumber}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="text-sm font-medium">Message Template</label>
                                <Textarea value={messageTemplate} onChange={e => setMessageTemplate(e.target.value)} placeholder="Hi {{contact_name}}, are you still interested in the {{product}}?" className="h-24 font-mono text-xs" />
                                <p className="text-xs text-brand-text-secondary mt-1">{'Use `{{variable_name}}` for personalization. These will become columns for your contacts list.'}</p>
                            </div>
                        </div>
                        <ModalFooter>
                            <Button variant="outline" onClick={handleClose}>Cancel</Button>
                            <Button onClick={() => setStep(2)} disabled={!name || !instanceId || !messageTemplate}>Next</Button>
                        </ModalFooter>
                    </>
                );
            case 2:
                 const variables = messageTemplate.match(/\{\{(\w+)\}\}/g)?.map(v => v.slice(2, -2)) || [];
                 const csvHeader = `phone_number,contact_name${variables.length > 0 ? ',' + variables.join(',') : ''}`;

                return (
                    <>
                        <ModalHeader>
                            <ModalTitle>Add Contacts (Step 2 of 2)</ModalTitle>
                            <ModalDescription>Paste contacts in CSV format. Each line is a new contact.</ModalDescription>
                        </ModalHeader>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium">Contacts List</label>
                                <p className="text-xs text-brand-text-secondary mb-2">Required format: <code className="bg-brand-secondary p-1 rounded">{csvHeader}</code></p>
                                <Textarea value={contactsCsv} onChange={e => setContactsCsv(e.target.value)} placeholder={`97455123456,Ahmed,Villa in Lusail\n97433987654,Fatima,2-BR Apartment`} className="h-32 font-mono text-xs" />
                            </div>
                            {parsedContacts.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium">{parsedContacts.length} valid contacts found.</p>
                                    <p className="text-xs text-brand-text-secondary">Example: {parsedContacts[0].phone_number}, {parsedContacts[0].contact_name}, Variables: {JSON.stringify(parsedContacts[0].variables)}</p>
                                </div>
                            )}
                            {error && <p className="text-sm text-status-red">{error}</p>}
                        </div>
                        <ModalFooter>
                            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting || parsedContacts.length === 0}>
                                {isSubmitting ? 'Creating...' : `Create Campaign (${parsedContacts.length} contacts)`}
                            </Button>
                        </ModalFooter>
                    </>
                );
            default: return null;
        }
    };

    return (
        <Modal open={isOpen} onOpenChange={handleClose}>
            <ModalContent>{renderContent()}</ModalContent>
        </Modal>
    );
};