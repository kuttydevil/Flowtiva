import React from 'react';
import { WorkflowActionType } from '../../../types';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '../../ui/Modal';

const ActionIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9" /></svg>;

const nodeTemplates = {
    Actions: [
        { type: 'send_whatsapp_message', name: 'Send Message' },
        { type: 'add_tag', name: 'Add Tag' },
        { type: 'change_crm_stage', name: 'Change Stage' },
        { type: 'wait', name: 'Wait / Delay' },
    ]
};

interface AddNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectAction: (type: WorkflowActionType) => void;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({ isOpen, onClose, onSelectAction }) => {
    return (
        <Modal open={isOpen} onOpenChange={onClose}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>Insert an Action</ModalTitle>
                </ModalHeader>
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-2">
                        {nodeTemplates.Actions.map(action => (
                            <button
                                key={action.type}
                                onClick={() => onSelectAction(action.type as WorkflowActionType)}
                                className="p-4 border border-brand-border bg-brand-primary rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-brand-secondary hover:border-brand-accent transition-colors"
                            >
                                <ActionIcon className="w-6 h-6 text-sky-400" />
                                <span className="text-sm font-medium">{action.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </ModalContent>
        </Modal>
    );
};