import React from 'react';
import { WorkflowTrigger, WorkflowAction, WorkflowTriggerType, WorkflowActionType } from '../../../types';

const TriggerIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>;
const ActionIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9" /></svg>;
const WaitIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;

export interface CanvasNodeData {
    id: string;
    type: 'trigger' | 'action';
    nodeType: WorkflowTriggerType | WorkflowActionType;
    position: { x: number; y: number };
    data: WorkflowTrigger | WorkflowAction;
}

interface NodeProps {
    node: CanvasNodeData;
    isSelected: boolean;
    isInvalid: boolean;
    onSelect: (nodeId: string) => void;
    onDragStart: (e: React.DragEvent, nodeId: string) => void;
}

const getTriggerDescription = (trigger: WorkflowTrigger): { title: string; details: string | null } => {
    switch (trigger.type) {
        case 'new_contact_message': return { title: "New Contact", details: "Fires when a new contact sends their first message." };
        case 'crm_stage_changed': return { title: "Stage Changed", details: trigger.config.stage ? `To: ${trigger.config.stage}` : 'Click to set stage.'};
        case 'tag_added': return { title: "Tag Added", details: trigger.config.tag ? `Tag: ${trigger.config.tag}` : 'Click to set tag.' };
        default: return { title: "Trigger", details: 'Configure me' };
    }
};

const getActionDescription = (action: WorkflowAction): { title: string; details: string | null } => {
    switch (action.type) {
        case 'send_whatsapp_message': return { title: "Send Message", details: action.config.message ? `"${action.config.message.substring(0, 40)}..."` : 'Click to write message.' };
        case 'add_tag': return { title: "Add Tag", details: action.config.tag ? `Tag: ${action.config.tag}` : 'Click to set tag.' };
        case 'change_crm_stage': return { title: "Change Stage", details: action.config.stage ? `To: ${action.config.stage}` : 'Click to set stage.' };
        case 'wait': return { title: "Wait", details: `${action.config.days || 1} day(s)` };
        default: return { title: "Action", details: 'Configure me' };
    }
};

const getNodeIcon = (nodeType: WorkflowActionType | WorkflowTriggerType) => {
    if (nodeType === 'wait') return <WaitIcon className="w-5 h-5" />;
    return <ActionIcon className="w-5 h-5" />;
};


export const Node: React.FC<NodeProps> = ({ node, isSelected, isInvalid, onSelect, onDragStart }) => {
    const desc = node.type === 'trigger' ? getTriggerDescription(node.data as WorkflowTrigger) : getActionDescription(node.data as WorkflowAction);
    const borderColor = node.type === 'trigger' ? 'border-amber-400' : 'border-sky-400';
    const iconColor = node.type === 'trigger' ? 'text-amber-400' : 'text-sky-400';
    
    let ringClass = '';
    if (isSelected) ringClass = 'ring-2 ring-brand-accent shadow-xl';
    else if (isInvalid) ringClass = 'ring-2 ring-status-red';

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, node.id)}
            onClick={() => onSelect(node.id)}
            className={`absolute bg-brand-primary rounded-lg shadow-md hover:shadow-lg transition-all duration-200 w-64 cursor-grab active:cursor-grabbing border border-brand-border ${ringClass}`}
            style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
        >
            <div className={`p-3 border-b ${borderColor}`}>
                <div className="flex items-center gap-3">
                    <div className={iconColor}>
                        {node.type === 'trigger' ? <TriggerIcon className="w-5 h-5" /> : getNodeIcon(node.nodeType as WorkflowActionType)}
                    </div>
                    <h4 className="font-semibold text-brand-text-primary">{desc.title}</h4>
                </div>
            </div>
            <div className="p-3 text-sm text-brand-text-secondary min-h-[48px]">
                {desc.details || <span className="italic opacity-70">Click to configure</span>}
            </div>

            {/* Connection Handles */}
            {node.type === 'trigger' && (
                <div data-handle-id={`out-${node.id}`} data-node-id={node.id} className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-border rounded-full border-2 border-brand-primary cursor-pointer hover:bg-brand-accent" title="Drag to connect" />
            )}
            {node.type === 'action' && (
                <>
                    <div data-handle-id={`in-${node.id}`} data-node-id={node.id} className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-border rounded-full border-2 border-brand-primary cursor-pointer hover:bg-brand-accent" />
                    <div data-handle-id={`out-${node.id}`} data-node-id={node.id} className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-border rounded-full border-2 border-brand-primary cursor-pointer hover:bg-brand-accent" title="Drag to connect" />
                </>
            )}
        </div>
    );
};