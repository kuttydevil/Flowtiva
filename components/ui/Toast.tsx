import React, { useEffect } from 'react';

const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);
const SuccessIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);
const ErrorIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
);
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);


export interface ToastProps {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'default';
  duration?: number;
  onClose: (id: string) => void;
}

const icons: Record<NonNullable<ToastProps['type']>, React.ReactNode> = {
  info: <InfoIcon className="h-5 w-5" />,
  success: <SuccessIcon className="h-5 w-5" />,
  error: <ErrorIcon className="h-5 w-5" />,
  default: <InfoIcon className="h-5 w-5" />,
};

const typeClasses: Record<NonNullable<ToastProps['type']>, string> = {
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-300',
  success: 'bg-status-green/10 border-status-green/20 text-status-green',
  error: 'bg-destructive/10 border-destructive/20 text-destructive',
  default: 'bg-card border-border text-foreground',
};


export const Toast: React.FC<ToastProps> = ({ id, message, type = 'default', duration = 5000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [id, duration, onClose]);
  
  return (
    <div 
      className={`w-full flex items-start p-4 rounded-lg shadow-lg border animate-in fade-in-0 slide-in-from-top-5 ${typeClasses[type]}`}
      role="alert"
    >
      <div className="flex-shrink-0 me-3 mt-0.5">
          {icons[type]}
      </div>
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      <button 
        onClick={() => onClose(id)} 
        className="-me-1 -mt-1 p-1 rounded-md text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Close"
      >
        <XIcon className="h-5 w-5" />
      </button>
      <style>{`
        @keyframes slideInFromTop { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .slide-in-from-top-5 { animation-name: slideInFromTop; }
      `}</style>
    </div>
  );
};