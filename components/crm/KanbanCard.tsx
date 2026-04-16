
import React, { useState, useRef, useEffect } from 'react';
import { WhatsAppContact, Priority } from '../../types';
import { Avatar } from '../ui/Avatar';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useTranslation } from '../../contexts/LanguageContext';

const EllipsisVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
);
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18" />
    </svg>
);

const FlagIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z" />
      <path d="M18.25 6.25a.75.75 0 00-1.5 0v3.5A2.25 2.25 0 0114.5 12h-8.5a.75.75 0 000 1.5h8.5A3.75 3.75 0 0018.25 9.75v-3.5z" />
    </svg>
);

const timeAgo = (isoTimestamp: string | null | undefined, t: (key: string, replacements?: any) => string): string => {
    if (!isoTimestamp) return t('common.notAvailable');
    const date = new Date(isoTimestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return t('time.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('time.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('time.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t('time.daysAgo', { count: days });
    const months = Math.floor(days / 30);
    if (months < 12) return t('time.monthsAgo', { count: months });
    const years = Math.floor(days / 365);
    return t('time.yearsAgo', { count: years });
};


interface KanbanCardProps {
    contact: WhatsAppContact;
    onStageChange: (instanceId: string, contactName: string, newStage: string) => void;
    onView: (contact: WhatsAppContact) => void;
    allStages: string[];
    onDueDateChange: (instanceId: string, contactName: string, newDueDate: string | null) => void;
    onPriorityChange: (instanceId: string, contactName: string, newPriority: Priority) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ contact, onStageChange, onView, allStages, onDueDateChange, onPriorityChange }) => {
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isJustCompleted, setIsJustCompleted] = useState(false);
    const [isClearDateModalOpen, setIsClearDateModalOpen] = useState(false);
    const prevStageRef = useRef(contact.crm_stage);

    const priorityConfig: { [key in Priority]: { color: string; } } = {
      High: { color: 'text-status-red' },
      Medium: { color: 'text-status-yellow' },
      Low: { color: 'text-brand-text-secondary' },
    };

    useEffect(() => {
        const wasJustCompleted = prevStageRef.current && prevStageRef.current !== 'Won' && contact.crm_stage === 'Won';
        
        if (wasJustCompleted) {
            setIsJustCompleted(true);
            const timer = setTimeout(() => {
                setIsJustCompleted(false);
            }, 1400); // Animation duration
            return () => clearTimeout(timer);
        }
        
        prevStageRef.current = contact.crm_stage;
    }, [contact.crm_stage]);


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('contactName', contact.contact_name);
        e.dataTransfer.setData('instanceId', contact.instance_id);
        e.dataTransfer.setData('originalStage', contact.crm_stage);
        e.dataTransfer.effectAllowed = 'move';
        (e.currentTarget as HTMLDivElement).style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        (e.currentTarget as HTMLDivElement).style.opacity = '1';
    };

    const handleStageSelect = (newStage: string) => {
        onStageChange(contact.instance_id, contact.contact_name, newStage);
        setIsMenuOpen(false);
    };

    const handlePrioritySelect = (newPriority: Priority) => {
        onPriorityChange(contact.instance_id, contact.contact_name, newPriority);
        setIsMenuOpen(false);
    };

    const handleDueDateSave = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value || null;
        if (newDate === null && contact.due_date) {
            setIsDatePickerOpen(false);
            setIsClearDateModalOpen(true);
        } else {
            onDueDateChange(contact.instance_id, contact.contact_name, newDate);
            setIsDatePickerOpen(false);
        }
    };

    const handleConfirmClearDate = () => {
        onDueDateChange(contact.instance_id, contact.contact_name, null);
        setIsClearDateModalOpen(false);
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = contact.due_date && new Date(contact.due_date) < today;


    return (
        <>
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={() => onView(contact)}
            className={`relative p-3 bg-brand-primary rounded-lg shadow-sm border border-brand-border cursor-pointer active:cursor-grabbing hover:shadow-md transition-shadow group ${isJustCompleted ? 'animate-complete-flash' : ''}`}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 mb-2 flex-1 min-w-0">
                    <Avatar name={contact.contact_name} className="w-8 h-8"/>
                    <p className="font-semibold text-sm text-brand-text-primary truncate group-hover:text-brand-accent">{contact.contact_name}</p>
                </div>

                <div className="relative -me-1 -mt-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(!isMenuOpen);
                            setIsDatePickerOpen(false);
                        }}
                        className="p-1.5 rounded-full text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text-primary"
                        aria-label={t('crm.kanbanCard.menu.moveTo')}
                    >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute top-full end-0 mt-1 w-48 bg-brand-primary border border-brand-border rounded-lg shadow-lg z-10 py-1" onClick={e => e.stopPropagation()}>
                             <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} className="absolute top-1 right-1 p-1 rounded-full text-brand-text-secondary hover:bg-brand-secondary">
                                <XIcon className="w-4 h-4" />
                            </button>
                            <p className="px-3 py-1 text-xs text-brand-text-secondary">{t('crm.kanbanCard.menu.moveTo')}</p>
                            {allStages.map(stage => (
                                <button
                                    key={stage}
                                    onClick={(e) => { e.stopPropagation(); handleStageSelect(stage); }}
                                    disabled={contact.crm_stage === stage}
                                    className="w-full text-left px-3 py-1.5 text-sm text-brand-text-primary hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed disabled:font-semibold disabled:text-brand-accent"
                                >
                                    {t(`crm.stages.${stage.toLowerCase()}`, { defaultValue: stage })}
                                </button>
                            ))}
                            <div className="border-t border-brand-border my-1"></div>
                            <div className="relative group/priority">
                                <div className="w-full text-left px-3 py-1.5 text-sm text-brand-text-primary hover:bg-brand-secondary flex justify-between items-center cursor-default">
                                    <span>{t('crm.kanbanCard.menu.setPriority')}</span>
                                    <span className="text-xs rtl:hidden">&rarr;</span>
                                    <span className="text-xs ltr:hidden">&larr;</span>
                                </div>
                                <div className="absolute top-0 end-full me-1 w-32 bg-brand-primary border border-brand-border rounded-lg shadow-lg z-20 py-1 hidden group-hover/priority:block">
                                    {(['High', 'Medium', 'Low'] as Priority[]).map(p => (
                                        <button
                                            key={p}
                                            onClick={(e) => { e.stopPropagation(); handlePrioritySelect(p); }}
                                            disabled={contact.priority === p}
                                            className="w-full text-left px-3 py-1.5 text-sm text-brand-text-primary hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed disabled:font-semibold disabled:text-brand-accent"
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDatePickerOpen(true);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-sm text-brand-text-primary hover:bg-brand-secondary"
                            >
                                {t('crm.kanbanCard.menu.setDueDate')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <p className="text-xs text-brand-text-secondary italic truncate mb-3">
                "{contact.last_message_text || t('crm.kanbanCard.noMessages')}"
            </p>

            {contact.tags && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {contact.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs font-medium bg-brand-secondary text-brand-text-secondary px-2 py-0.5 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="pt-2 border-t border-brand-border/50 flex justify-between items-center">
                 <div className={`flex items-center gap-1.5 text-xs font-semibold ${priorityConfig[contact.priority]?.color}`}>
                    <FlagIcon className="w-4 h-4" />
                    <span>{contact.priority}</span>
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-status-red font-semibold' : 'text-brand-text-secondary'}`}>
                    <CalendarIcon className="w-4 h-4" />
                    <span>
                        {contact.due_date ? new Date(contact.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'}) : t('crm.kanbanCard.noDueDate')}
                    </span>
                </div>
                <span className="text-xs text-brand-text-secondary">
                    {timeAgo(contact.last_message_at, t)}
                </span>
            </div>

            {isDatePickerOpen && (
                <div onClick={e => e.stopPropagation()} className="absolute top-8 end-8 w-48 bg-brand-primary border border-brand-border rounded-lg shadow-lg z-20 p-2">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-semibold px-1">{t('crm.kanbanCard.datePicker.title')}</p>
                        <button onClick={() => setIsDatePickerOpen(false)} className="p-1 rounded-full text-brand-text-secondary hover:bg-brand-secondary">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <input
                        type="date"
                        defaultValue={contact.due_date ? contact.due_date.split('T')[0] : ''}
                        onChange={handleDueDateSave}
                        className="w-full text-sm border-brand-border rounded p-1 bg-brand-primary text-brand-text-primary"
                    />
                    <button onClick={() => { setIsDatePickerOpen(false); setIsClearDateModalOpen(true); }} className="w-full text-center mt-2 text-xs text-brand-text-secondary hover:text-brand-accent">
                        {t('crm.kanbanCard.datePicker.clear')}
                    </button>
                </div>
            )}
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
        </>
    );
};
