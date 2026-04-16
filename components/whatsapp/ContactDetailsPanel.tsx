
import React, { useState } from 'react';
import { WhatsAppInstance, WhatsAppContact, Priority } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { TagEditor } from './TagEditor';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useTranslation } from '../../contexts/LanguageContext';

// --- ICONS ---
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);
const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
);
const TagIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
);
const CrmIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12A2.25 2.25 0 0 0 20.25 14.25V5.25A2.25 2.25 0 0 0 18 3H6a2.25 2.25 0 0 0-2.25 2.25v.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 18.75h18" />
    </svg>
);

const STAGES = ['New', 'Contacted', 'Proposal', 'Won', 'Lost'];
const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

interface ContactDetailsPanelProps {
    contact: WhatsAppContact;
    instance: WhatsAppInstance;
    onClose: () => void;
    onTagsUpdated: (contactName: string, newTags: string[]) => void;
    onCrmStageChange: (contactName: string, newStage: string) => void;
    onPriorityChange: (contactName: string, newPriority: Priority) => void;
    onDueDateChange: (contactName: string, newDueDate: string | null) => void;
}

export const ContactDetailsPanel: React.FC<ContactDetailsPanelProps> = ({
    contact,
    instance,
    onClose,
    onTagsUpdated,
    onCrmStageChange,
    onPriorityChange,
    onDueDateChange
}) => {
    const { t } = useTranslation();
    const [isClearDateModalOpen, setIsClearDateModalOpen] = useState(false);

    const handleConfirmClearDate = () => {
        onDueDateChange(contact.contact_name, null);
        setIsClearDateModalOpen(false);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value || null;
        if (newDate === null && contact.due_date) {
            setIsClearDateModalOpen(true);
        } else {
            onDueDateChange(contact.contact_name, newDate);
        }
    };

    return (
        <div className="w-full md:w-80 flex-shrink-0 border-l border-border/50 bg-background flex flex-col shadow-sm">
            {/* Header */}
            <header className="h-[60px] px-4 border-b border-border/50 flex items-center justify-between flex-shrink-0 bg-muted/20 backdrop-blur-sm">
                <h3 className="font-semibold text-foreground">{t('whatsapp.contactDetails.title')}</h3>
                <Button variant="ghost" size="icon" onClick={onClose} className="-mr-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                    <XIcon className="h-5 w-5" />
                </Button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Profile */}
                <div className="text-center flex flex-col items-center">
                    <Avatar name={contact.contact_name} className="w-24 h-24 mb-4 ring-4 ring-background shadow-sm" />
                    <h2 className="font-semibold text-xl text-foreground tracking-tight">{contact.contact_name}</h2>
                </div>

                {/* About Section */}
                <div className="bg-muted/20 rounded-[20px] p-5 border border-border/50">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('whatsapp.contactDetails.about')}</h4>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm border border-border/50">
                                <PhoneIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                            <span className="text-foreground font-medium tracking-wide" dir="ltr">{contact.phone_number || t('common.notAvailable')}</span>
                        </div>
                    </div>
                </div>

                {/* Tags Section */}
                <div className="bg-muted/20 rounded-[20px] p-5 border border-border/50">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                         <TagIcon className="h-4 w-4" />
                         {t('whatsapp.contactDetails.tags')}
                    </h4>
                    <TagEditor
                        contact={contact}
                        instanceId={instance.id}
                        onTagsUpdated={onTagsUpdated}
                    />
                </div>

                {/* CRM Section */}
                <div className="bg-muted/20 rounded-[20px] p-5 border border-border/50">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-5 flex items-center gap-2">
                        <CrmIcon className="h-4 w-4" />
                        {t('whatsapp.contactDetails.crm')}
                    </h4>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">{t('whatsapp.contactDetails.stage')}</label>
                            <select
                                value={contact.crm_stage}
                                onChange={(e) => onCrmStageChange(contact.contact_name, e.target.value)}
                                className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm transition-colors hover:bg-muted/50"
                            >
                                {STAGES.map(stage => <option key={stage} value={stage}>{t(`crm.stages.${stage.toLowerCase()}`)}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">{t('whatsapp.contactDetails.priority')}</label>
                            <select
                                value={contact.priority}
                                onChange={(e) => onPriorityChange(contact.contact_name, e.target.value as Priority)}
                                className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm transition-colors hover:bg-muted/50"
                            >
                                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">{t('whatsapp.contactDetails.dueDate')}</label>
                            <input
                                type="date"
                                value={contact.due_date ? contact.due_date.split('T')[0] : ''}
                                onChange={handleDateChange}
                                className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm transition-colors hover:bg-muted/50"
                            />
                        </div>
                    </div>
                </div>
            </div>
             <ConfirmationModal
                isOpen={isClearDateModalOpen}
                onClose={() => setIsClearDateModalOpen(false)}
                onConfirm={handleConfirmClearDate}
                title={t('crm.kanbanCard.clearDateModal.title')}
                description={t('crm.kanbanCard.clearDateModal.description')}
                confirmText={t('crm.kanbanCard.clearDateModal.confirm')}
                confirmButtonVariant="destructive"
            />
        </div>
    );
};
