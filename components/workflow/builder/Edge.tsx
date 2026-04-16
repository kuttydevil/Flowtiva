import React from 'react';

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>;

interface EdgeProps {
    id: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    onAddNode: (edgeId: string) => void;
}

export const Edge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, onAddNode }) => {
    const path = `M ${sourceX} ${sourceY} C ${sourceX + 50} ${sourceY}, ${targetX - 50} ${targetY}, ${targetX} ${targetY}`;
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    return (
        <g>
            <path d={path} stroke="#52525b" strokeWidth="2" fill="none" />
            <foreignObject x={midX - 12} y={midY - 12} width="24" height="24" className="group">
                 <button 
                    onClick={() => onAddNode(id)}
                    className="w-6 h-6 rounded-full bg-brand-border flex items-center justify-center text-brand-text-secondary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-accent hover:text-white"
                    title="Add action"
                >
                    <PlusIcon className="w-4 h-4"/>
                </button>
            </foreignObject>
        </g>
    );
};