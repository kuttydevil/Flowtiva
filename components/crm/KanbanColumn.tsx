
import React, { useState } from 'react';
import { WhatsAppContact, Priority } from '../../types';
import { KanbanCard } from './KanbanCard';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { useTranslation } from '../../contexts/LanguageContext';

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;

interface KanbanColumnProps {
    title: string;
    contacts: WhatsAppContact[];
    onStageChange: (instanceId: string, contactName: string, newStage: string) => void;
    onView: (contact: WhatsAppContact) => void;
    onAddLead?: () => void;
    className?: string;
    isLoading: boolean;
    allStages: string[];
    onDueDateChange: (instanceId: string, contactName: string, newDueDate: string | null) => void;
    onPriorityChange: (instanceId: string, contactName: string, newPriority: Priority) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, contacts, onStageChange, onView, onAddLead, className, isLoading, allStages, onDueDateChange, onPriorityChange }) => {
    const { t } = useTranslation();
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const contactName = e.dataTransfer.getData('contactName');
        const instanceId = e.dataTransfer.getData('instanceId');
        const originalStage = e.dataTransfer.getData('originalStage');
        if (contactName && instanceId && originalStage !== title) {
            onStageChange(instanceId, contactName, title);
        }
    };
    
    // Translate the stage title for display
    const displayTitle = t(`crm.stages.${title.toLowerCase()}`);

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-72 flex-shrink-0 bg-brand-primary rounded-lg flex flex-col transition-colors duration-200 ${isDragOver ? 'bg-brand-accent/10' : ''}`}
        >
            <div className={`p-3 border-b-2 ${className || 'border-brand-border'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-brand-text-primary text-sm uppercase tracking-wide">{displayTitle}</h3>
                  <span className="text-xs font-bold text-brand-text-secondary bg-brand-border/70 rounded-full px-2 py-0.5">{contacts.length}</span>
                </div>
                 {title === 'New' && onAddLead && (
                    <Button variant="ghost" size="icon" onClick={onAddLead} className="h-7 w-7 text-brand-text-secondary hover:text-brand-text-primary">
                        <PlusIcon className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="p-2 flex-1 overflow-y-auto space-y-2">
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : contacts.length > 0 ? (
                    contacts.map(contact => <KanbanCard key={contact.contact_name} contact={contact} onStageChange={onStageChange} onView={onView} allStages={allStages} onDueDateChange={onDueDateChange} onPriorityChange={onPriorityChange} />)
                ) : !isDragOver && (
                    <div className="flex items-center justify-center h-full p-4 border-2 border-dashed border-brand-border/50 rounded-lg">
                        <p className="text-xs text-brand-text-secondary text-center">{t('crm.kanbanColumn.dragHelp')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanbanColumn;
