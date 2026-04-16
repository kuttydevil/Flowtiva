import React from 'react';

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const MinusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>;
const FitToScreenIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>;


interface ControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitView: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ onZoomIn, onZoomOut, onFitView }) => {
    return (
        <div className="absolute bottom-4 start-4 z-10 bg-brand-primary border border-brand-border rounded-lg shadow-md flex items-center">
            <button onClick={onZoomOut} className="p-2 text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-secondary rounded-s-md" title="Zoom Out">
                <MinusIcon className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-brand-border" />
            <button onClick={onZoomIn} className="p-2 text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-secondary" title="Zoom In">
                <PlusIcon className="w-5 h-5" />
            </button>
             <div className="w-px h-5 bg-brand-border" />
            <button onClick={onFitView} className="p-2 text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-secondary rounded-e-md" title="Fit to View">
                <FitToScreenIcon className="w-5 h-5" />
            </button>
        </div>
    );
};