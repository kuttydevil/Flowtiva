
import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';

const TriggerIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>;
const ActionIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9" /></svg>;

const DraggableNode: React.FC<{ type: 'trigger' | 'action', nodeType: string, name: string }> = ({ type, nodeType, name }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('application/reactflow', JSON.stringify({ type, nodeType }));
        e.dataTransfer.effectAllowed = 'move';
    };
    const Icon = type === 'trigger' ? TriggerIcon : ActionIcon;
    const color = type === 'trigger' ? 'text-amber-400' : 'text-sky-400';

    return (
        <div draggable onDragStart={handleDragStart} className="p-3 border border-brand-border bg-brand-primary rounded-lg cursor-grab flex items-center gap-3 hover:bg-brand-secondary hover:border-brand-accent transition-colors">
            <Icon className={`w-5 h-5 ${color}`} />
            <span className="text-sm font-medium text-brand-text-primary">{name}</span>
        </div>
    );
};

export const NodePanel = () => {
    const { t } = useTranslation();

    const nodeTemplates = {
        Triggers: [
            { type: 'new_contact_message', name: t('workflows.panel.nodes.newContact') },
            { type: 'crm_stage_changed', name: t('workflows.panel.nodes.stageChanged') },
            { type: 'tag_added', name: t('workflows.panel.nodes.tagAdded') },
            { type: 'message_contains_keyword', name: t('workflows.panel.nodes.keywordMatch') },
        ],
        Actions: [
            { type: 'send_whatsapp_message', name: t('workflows.panel.nodes.sendMessage') },
            { type: 'add_tag', name: t('workflows.panel.nodes.addTag') },
            { type: 'change_crm_stage', name: t('workflows.panel.nodes.changeStage') },
            { type: 'wait', name: t('workflows.panel.nodes.wait') },
        ]
    };

    return (
        <aside className="w-72 bg-brand-primary border-r border-brand-border p-4 space-y-6 overflow-y-auto">
            <div>
                <h3 className="text-sm font-semibold text-brand-text-secondary uppercase mb-3 px-2">{t('workflows.builder.triggers')}</h3>
                <div className="space-y-2">
                    {nodeTemplates.Triggers.map(t => <DraggableNode key={t.type} type="trigger" nodeType={t.type} name={t.name} />)}
                </div>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-brand-text-secondary uppercase mb-3 px-2">{t('workflows.builder.actions')}</h3>
                <div className="space-y-2">
                    {nodeTemplates.Actions.map(a => <DraggableNode key={a.type} type="action" nodeType={a.type} name={a.name} />)}
                </div>
            </div>
        </aside>
    );
};
