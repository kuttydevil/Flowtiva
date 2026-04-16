
import React from 'react';
import { WorkflowTrigger, WorkflowAction, WorkflowActionType, WorkflowTriggerType, Priority } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { useTranslation } from '../../../contexts/LanguageContext';

const XIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;


const CRM_STAGES = ['New', 'Contacted', 'Proposal', 'Won', 'Lost'];
const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

interface SettingsPanelProps {
    node: {
        id: string;
        type: 'trigger' | 'action';
        nodeType: WorkflowTriggerType | WorkflowActionType;
        data: WorkflowTrigger | WorkflowAction;
    } | null;
    onClose: () => void;
    onUpdate: (nodeId: string, data: WorkflowTrigger | WorkflowAction) => void;
    onDelete: (nodeId: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ node, onClose, onUpdate, onDelete }) => {
    const { t } = useTranslation();
    if (!node) return null;

    const handleDataChange = (field: string, value: any) => {
        const newData = {
            ...node.data,
            config: {
                ...node.data.config,
                [field]: value
            }
        };
        onUpdate(node.id, newData);
    };

    const renderSettings = () => {
        const config = node.data.config;
        switch (node.nodeType) {
            // Triggers
            case 'crm_stage_changed':
                return (
                    <div className="space-y-2">
                        <label htmlFor="stage" className="text-sm font-medium">{t('workflows.settings.stageLabel')}</label>
                        <select id="stage" value={config.stage || ''} onChange={(e) => handleDataChange('stage', e.target.value)} className="w-full h-10 rounded-md border border-brand-border bg-brand-primary px-2 text-sm">
                            <option value="">{t('workflows.settings.selectStage')}</option>
                            {CRM_STAGES.map(s => <option key={s} value={s}>{t(`crm.stages.${s.toLowerCase()}`, { defaultValue: s })}</option>)}
                        </select>
                    </div>
                );
            case 'tag_added':
                 return (
                    <div className="space-y-2">
                        <label htmlFor="tag" className="text-sm font-medium">{t('workflows.settings.tagLabel')}</label>
                        <Input id="tag" value={config.tag || ''} onChange={(e) => handleDataChange('tag', e.target.value)} placeholder={t('workflows.settings.tagPlaceholder')} />
                    </div>
                );

            // Actions
            case 'send_whatsapp_message':
                return (
                    <div className="space-y-2">
                        <label htmlFor="message" className="text-sm font-medium">{t('workflows.settings.messageLabel')}</label>
                        <Textarea id="message" value={(config as WorkflowAction['config']).message || ''} onChange={(e) => handleDataChange('message', e.target.value)} placeholder={t('workflows.settings.messagePlaceholder')} className="h-32" />
                    </div>
                );
            case 'add_tag':
                return (
                    <div className="space-y-2">
                        <label htmlFor="tag" className="text-sm font-medium">{t('workflows.settings.tagToAddLabel')}</label>
                        <Input id="tag" value={config.tag || ''} onChange={(e) => handleDataChange('tag', e.target.value)} placeholder={t('workflows.settings.tagToAddPlaceholder')} />
                    </div>
                );
            case 'change_crm_stage':
                 return (
                    <div className="space-y-2">
                        <label htmlFor="stage" className="text-sm font-medium">{t('workflows.settings.newStageLabel')}</label>
                        <select id="stage" value={config.stage || ''} onChange={(e) => handleDataChange('stage', e.target.value)} className="w-full h-10 rounded-md border border-brand-border bg-brand-primary px-2 text-sm">
                            <option value="">{t('workflows.settings.selectStage')}</option>
                            {CRM_STAGES.map(s => <option key={s} value={s}>{t(`crm.stages.${s.toLowerCase()}`, { defaultValue: s })}</option>)}
                        </select>
                    </div>
                );
            case 'wait':
                 return (
                    <div className="space-y-2">
                        <label htmlFor="days" className="text-sm font-medium">{t('workflows.settings.waitDaysLabel')}</label>
                        <Input id="days" type="number" min="1" value={(config as WorkflowAction['config']).days || 1} onChange={(e) => handleDataChange('days', parseInt(e.target.value, 10))} />
                    </div>
                );
            default:
                return <p className="text-sm text-brand-text-secondary">{t('workflows.settings.noOptions')}</p>;
        }
    };
    
    return (
        <aside className="w-80 bg-brand-primary border-l border-brand-border flex flex-col animate-in slide-in-from-right-5 duration-300">
            <header className="p-4 border-b border-brand-border flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold text-brand-text-primary capitalize">{node.nodeType.replace(/_/g, ' ')}</h3>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><XIcon className="h-5 w-5" /></Button>
            </header>
            <div className="flex-1 p-4 overflow-y-auto">
                {renderSettings()}
            </div>
             <footer className="p-4 border-t border-brand-border flex-shrink-0">
                <Button variant="destructive" size="sm" className="w-full" onClick={() => onDelete(node.id)}>
                    <TrashIcon className="w-4 h-4 me-2" />
                    {t('workflows.settings.delete')}
                </Button>
            </footer>
        </aside>
    );
};
