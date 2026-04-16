
// components/workflow/WorkflowMindmapView.tsx
// This is the new, professional-grade visual workflow builder.
// It orchestrates all the smaller builder components into a cohesive, interactive canvas.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { Workflow, WorkflowTrigger, WorkflowAction, WorkflowTriggerType, WorkflowActionType } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTranslation } from '../../contexts/LanguageContext';

// Builder Components
import { NodePanel } from './builder/NodePanel';
import { Node, CanvasNodeData } from './builder/Node';
import { SettingsPanel } from './builder/SettingsPanel';
import { Edge } from './builder/Edge';
import { Controls } from './builder/Controls';
import { AIWorkflowGenerator } from './builder/AIWorkflowGenerator';
import { AddNodeModal } from './builder/AddNodeModal';

const BackArrowIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>;

interface EdgeData {
    id: string;
    source: string;
    target: string;
}

const getTriggerDefaults = (type: WorkflowTriggerType): WorkflowTrigger => ({ type, config: {} });
const getActionDefaults = (type: WorkflowActionType): WorkflowAction => ({ id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, type, config: {} });

const WORKFLOW_DEFAULTS = {
    name: 'Untitled Workflow',
    is_active: true,
};

interface WorkflowMindmapViewProps {
    existingWorkflow: Workflow | null;
    onSave: () => void;
    onCancel: () => void;
}
export const WorkflowMindmapView: React.FC<WorkflowMindmapViewProps> = ({ existingWorkflow, onSave, onCancel }) => {
    const { addToast } = useToast();
    const { t } = useTranslation();
    const [name, setName] = useState(existingWorkflow?.name || WORKFLOW_DEFAULTS.name);
    const [nodes, setNodes] = useState<CanvasNodeData[]>([]);
    const [edges, setEdges] = useState<EdgeData[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Viewport state
    const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 1 });
    const [isPanning, setIsPanning] = useState(false);
    
    // Connection state
    const [isConnecting, setIsConnecting] = useState<{ sourceNodeId: string; sourceHandleId: string; mousePos: { x: number; y: number } } | null>(null);
    
    // Add Node Modal state
    const [edgeForModal, setEdgeForModal] = useState<string | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ id: string, offset: { x: number, y: number }} | null>(null);
    
    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

    // Populate nodes/edges from existing workflow
    useEffect(() => {
        if (existingWorkflow) {
            const initialNodes: CanvasNodeData[] = [];
            const initialEdges: EdgeData[] = [];
            
            const triggerNode: CanvasNodeData = {
                id: 'trigger', type: 'trigger', nodeType: existingWorkflow.trigger.type,
                position: { x: 100, y: 150 }, data: existingWorkflow.trigger
            };
            initialNodes.push(triggerNode);

            let lastNodeId = 'trigger';
            existingWorkflow.actions.forEach((action, i) => {
                const newNodeId = action.id || `action-${i}`;
                initialNodes.push({
                    id: newNodeId, type: 'action', nodeType: action.type,
                    position: { x: 400 + i * 300, y: 150 }, data: action
                });
                initialEdges.push({ id: `${lastNodeId}-${newNodeId}`, source: lastNodeId, target: newNodeId });
                lastNodeId = newNodeId;
            });
            setNodes(initialNodes);
            setEdges(initialEdges);
        } else {
            // Set default name using translation if new
            setName(t('workflows.builder.untitled'));
        }
    }, [existingWorkflow, t]);
    
    // Pan and Zoom handlers
    const onWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const newZoom = Math.max(0.2, Math.min(2, viewState.zoom - e.deltaY * 0.001));
        setViewState(vs => ({ ...vs, zoom: newZoom }));
    }, [viewState.zoom]);

    const onMouseDown = (e: React.MouseEvent) => {
        if (e.target === canvasRef.current || (e.target as SVGElement).tagName === 'svg') {
            setIsPanning(true);
            setSelectedNodeId(null);
            canvasRef.current?.style.setProperty('cursor', 'grabbing');
        }
    };
    
    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setViewState(vs => ({ ...vs, x: vs.x + e.movementX, y: vs.y + e.movementY }));
        }
        if (dragRef.current && canvasRef.current) {
            const { id, offset } = dragRef.current;
            const newPos = {
                x: (e.clientX - canvasRef.current.getBoundingClientRect().left - offset.x - viewState.x) / viewState.zoom,
                y: (e.clientY - canvasRef.current.getBoundingClientRect().top - offset.y - viewState.y) / viewState.zoom,
            };
            setNodes(nds => nds.map(n => n.id === id ? { ...n, position: newPos } : n));
        }
        if (isConnecting) {
            setIsConnecting(conn => conn ? { ...conn, mousePos: { x: e.clientX, y: e.clientY } } : null);
        }
    }, [isPanning, isConnecting, viewState.x, viewState.y, viewState.zoom]);
    
    const onMouseUp = () => {
        setIsPanning(false);
        dragRef.current = null;
        if(canvasRef.current) canvasRef.current.style.removeProperty('cursor');
    };

    const handleNodeDragStart = (e: React.DragEvent, nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !canvasRef.current) return;
        
        const rect = (e.target as HTMLDivElement).getBoundingClientRect();
        const canvasRect = canvasRef.current.getBoundingClientRect();
        
        dragRef.current = {
            id: nodeId,
            offset: {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            }
        };
        e.dataTransfer.effectAllowed = "move";
    };

    // Add new node from panel
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const { type, nodeType } = JSON.parse(e.dataTransfer.getData('application/reactflow'));
        
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const position = { 
            x: (e.clientX - rect.left - viewState.x) / viewState.zoom, 
            y: (e.clientY - rect.top - viewState.y) / viewState.zoom 
        };

        if (type === 'trigger') {
            if (nodes.some(n => n.type === 'trigger')) {
                addToast("A workflow can only have one trigger.", { type: 'error' });
                return;
            }
            const newTrigger: CanvasNodeData = {
                id: 'trigger', type: 'trigger', nodeType: nodeType as WorkflowTriggerType, position,
                data: getTriggerDefaults(nodeType as WorkflowTriggerType)
            };
            setNodes(prev => [...prev, newTrigger]);
        } else {
            const newActionData = getActionDefaults(nodeType as WorkflowActionType);
            const newAction: CanvasNodeData = {
                id: newActionData.id, type: 'action', nodeType: nodeType as WorkflowActionType, position,
                data: newActionData
            };
            setNodes(prev => [...prev, newAction]);
        }
    }, [nodes, viewState, addToast]);
    
    // Connection Logic
    const onHandleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        const handle = e.target as HTMLDivElement;
        const sourceNodeId = handle.dataset.nodeId;
        const sourceHandleId = handle.dataset.handleId;
        if (!sourceNodeId || !sourceHandleId || !sourceHandleId.startsWith('out-')) return;
        
        setIsConnecting({ sourceNodeId, sourceHandleId, mousePos: { x: e.clientX, y: e.clientY }});
    };
    
    const onHandleMouseUp = (e: React.MouseEvent) => {
        e.stopPropagation();
        const targetHandle = e.target as HTMLDivElement;
        const targetNodeId = targetHandle.dataset.nodeId;
        const targetHandleId = targetHandle.dataset.handleId;
        
        if (isConnecting && targetNodeId && targetHandleId && targetHandleId.startsWith('in-')) {
            const newEdge: EdgeData = {
                id: `${isConnecting.sourceNodeId}-${targetNodeId}`,
                source: isConnecting.sourceNodeId,
                target: targetNodeId,
            };
            setEdges(eds => [...eds, newEdge]);
        }
        setIsConnecting(null);
    };

    // Node & Edge Management
    const updateNodeData = useCallback((nodeId: string, data: WorkflowTrigger | WorkflowAction) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data } : n));
    }, []);
    
    const deleteNode = useCallback((nodeId: string) => {
        if (nodeId === 'trigger') {
            addToast("The trigger node cannot be deleted.", { type: 'error' });
            return;
        }
        setNodes(nds => nds.filter(n => n.id !== nodeId));
        setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
        setSelectedNodeId(null);
    }, [addToast]);

    const handleAddNodeOnEdge = (actionType: WorkflowActionType) => {
        if (!edgeForModal) return;

        const edge = edges.find(e => e.id === edgeForModal);
        if (!edge) return;

        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;
        
        const newActionData = getActionDefaults(actionType);
        const newNode: CanvasNodeData = {
            id: newActionData.id,
            type: 'action',
            nodeType: actionType,
            position: {
                x: (sourceNode.position.x + targetNode.position.x) / 2,
                y: (sourceNode.position.y + targetNode.position.y) / 2 + 60 // a bit lower
            },
            data: newActionData,
        };

        const newEdges: EdgeData[] = [
            { id: `${edge.source}-${newNode.id}`, source: edge.source, target: newNode.id },
            { id: `${newNode.id}-${edge.target}`, source: newNode.id, target: edge.target },
        ];

        setNodes(nds => [...nds, newNode]);
        setEdges(eds => [...eds.filter(e => e.id !== edge.id), ...newEdges]);
        setEdgeForModal(null);
    };

    const handleSave = async () => {
        const triggerNode = nodes.find(n => n.type === 'trigger');
        if (!triggerNode) {
            addToast("A workflow must have at least a trigger.", { type: 'error' });
            return;
        }

        // Build sorted action list from edges
        const sortedActions: WorkflowAction[] = [];
        let currentNodeId = 'trigger';
        while (currentNodeId) {
            const nextEdge = edges.find(e => e.source === currentNodeId);
            if (!nextEdge) break;
            
            const nextNode = nodes.find(n => n.id === nextEdge.target);
            if (!nextNode || nextNode.type !== 'action') break;

            sortedActions.push(nextNode.data as WorkflowAction);
            currentNodeId = nextNode.id;
        }

        setIsSaving(true);
        try {
            const workflowToSave: Omit<Workflow, 'id' | 'tenant_id' | 'created_at'> = {
                name: name.trim() || WORKFLOW_DEFAULTS.name,
                trigger: triggerNode.data as WorkflowTrigger,
                actions: sortedActions,
                is_active: existingWorkflow?.is_active ?? WORKFLOW_DEFAULTS.is_active,
            };

            if (existingWorkflow) {
                await supabase.updateWorkflow(existingWorkflow.id, workflowToSave);
                addToast(t('workflows.builder.toasts.updateSuccess'), { type: 'success' });
            } else {
                await supabase.createWorkflow(workflowToSave);
                addToast(t('workflows.builder.toasts.createSuccess'), { type: 'success' });
            }
            onSave();
        } catch (e: any) {
            addToast(`Error: ${e.message}`, { type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- RENDER ---
    if (nodes.length === 0 && !existingWorkflow) {
        return (
            <div className="h-full flex flex-col bg-brand-secondary">
                 <header className="flex-shrink-0 bg-brand-primary p-3 flex items-center justify-between border-b border-brand-border">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onCancel} className="-ml-2"><BackArrowIcon className="h-5 w-5"/></Button>
                        <h2 className="text-lg font-bold">{t('workflows.builder.newWorkflowTitle')}</h2>
                    </div>
                </header>
                <div className="flex-1 relative">
                    <AIWorkflowGenerator 
                        onWorkflowGenerated={(wf) => {
                            setName(wf.name || 'AI Generated Workflow');
                            const trigger = wf.trigger as WorkflowTrigger;
                            const actions = wf.actions as WorkflowAction[];
                            const newNodes: CanvasNodeData[] = [];
                            const newEdges: EdgeData[] = [];
                            newNodes.push({id: 'trigger', type:'trigger', nodeType: trigger.type, data: trigger, position: {x: 100, y: 150}});
                            
                            let lastNodeId = 'trigger';
                            actions.forEach((action, i) => {
                                newNodes.push({id: action.id, type: 'action', nodeType: action.type, data: action, position: {x: 400 + i * 300, y: 150}});
                                newEdges.push({id: `${lastNodeId}-${action.id}`, source: lastNodeId, target: action.id});
                                lastNodeId = action.id;
                            });
                            setNodes(newNodes);
                            setEdges(newEdges);
                        }}
                        onStartFromScratch={() => setNodes([{ id: 'trigger', type: 'trigger', nodeType: 'new_contact_message', data: getTriggerDefaults('new_contact_message'), position: {x: 100, y: 150} }])}
                    />
                </div>
            </div>
        );
    }

    return (
      <div className="h-full flex flex-col bg-brand-secondary">
        <header className="flex-shrink-0 bg-brand-primary p-3 flex items-center justify-between border-b border-brand-border z-20">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onCancel} className="-ml-2"><BackArrowIcon className="h-5 w-5"/></Button>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('workflows.builder.namePlaceholder')} className="text-lg font-bold bg-transparent border-transparent focus-visible:ring-1 focus-visible:ring-brand-accent focus-visible:border-brand-accent h-10" />
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onCancel}>{t('workflows.builder.cancel')}</Button>
                <Button onClick={handleSave} disabled={isSaving}>{isSaving ? t('workflows.builder.saving') : t('workflows.builder.save')}</Button>
            </div>
        </header>
        <div className="flex-1 flex overflow-hidden">
            <NodePanel />
            <main
                ref={canvasRef}
                className="flex-1 relative overflow-hidden bg-brand-secondary bg-[radial-gradient(#404040_1px,transparent_1px)] [background-size:24px_24px]"
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onWheel={onWheel}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
            >
                <div
                    className="w-full h-full"
                    style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.zoom})`, transformOrigin: 'top left' }}
                >
                    {nodes.map(node => (
                        <Node
                            key={node.id}
                            node={node}
                            isSelected={selectedNodeId === node.id}
                            isInvalid={!node.data.config || (node.nodeType === 'crm_stage_changed' && !node.data.config?.stage)}
                            onSelect={setSelectedNodeId}
                            onDragStart={handleNodeDragStart}
                        />
                    ))}
                </div>
                
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" onMouseUp={onHandleMouseUp}>
                     <g style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.zoom})` }}>
                        {edges.map(edge => {
                            const sourceNode = nodes.find(n => n.id === edge.source);
                            const targetNode = nodes.find(n => n.id === edge.target);
                            if (!sourceNode || !targetNode) return null;
                            
                            return <Edge
                                key={edge.id} id={edge.id}
                                sourceX={sourceNode.position.x + 256} sourceY={sourceNode.position.y + 48}
                                targetX={targetNode.position.x} targetY={targetNode.position.y + 48}
                                onAddNode={setEdgeForModal}
                            />
                        })}
                    </g>
                    {isConnecting && canvasRef.current && (
                        <path d={`M ${isConnecting.mousePos.x} ${isConnecting.mousePos.y} L ${isConnecting.mousePos.x} ${isConnecting.mousePos.y}`} stroke="#a1a1aa" strokeWidth="2" fill="none" />
                    )}
                </svg>

                {/* Event listeners for handles */}
                <div onMouseDown={onHandleMouseDown} onMouseUp={onHandleMouseUp} className="w-full h-full absolute top-0 left-0" />

                <Controls onZoomIn={() => setViewState(vs => ({...vs, zoom: Math.min(2, vs.zoom + 0.1)}))} onZoomOut={() => setViewState(vs => ({...vs, zoom: Math.max(0.2, vs.zoom - 0.1)}))} onFitView={() => { setViewState({x:0, y:0, zoom: 1})}} />
            </main>
            {selectedNode && (
                <SettingsPanel 
                    key={selectedNode.id} // Re-mount when node changes
                    node={selectedNode}
                    onClose={() => setSelectedNodeId(null)}
                    onUpdate={updateNodeData}
                    onDelete={deleteNode}
                />
            )}
            <AddNodeModal
                isOpen={!!edgeForModal}
                onClose={() => setEdgeForModal(null)}
                onSelectAction={handleAddNodeOnEdge}
            />
        </div>
      </div>
    );
};

// FIX: Added default export for compatibility with React.lazy
export default WorkflowMindmapView;
