/**
 * @license
 * Copyright 2025 Flowtiva LLC
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, onOpenChange, children }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };
    if (open) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={() => onOpenChange(false)}
      aria-modal="true"
      role="dialog"
    >
      {children}
    </div>
  );
};

const ModalContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`relative bg-brand-primary rounded-xl shadow-lg w-full max-w-lg border border-brand-border animate-in fade-in-0 zoom-in-95 ${className}`}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
      <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes zoomIn { from { transform: scale(0.95); } to { transform: scale(1); } }
            .animate-in { animation-duration: 200ms; }
            .fade-in-0 { animation-name: fadeIn; }
            .zoom-in-95 { animation-name: zoomIn; }
        `}</style>
    </div>
  )
);
ModalContent.displayName = 'ModalContent';

const ModalHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
  )
);
ModalHeader.displayName = 'ModalHeader';

const ModalFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`flex items-center justify-end p-4 border-t border-brand-border bg-brand-secondary/50 rounded-b-xl ${className}`} {...props} />
  )
);
ModalFooter.displayName = 'ModalFooter';

const ModalTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={`text-lg font-semibold leading-none tracking-tight text-brand-text-primary ${className}`} {...props} />
  )
);
ModalTitle.displayName = 'ModalTitle';

const ModalDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={`text-sm text-brand-text-secondary ${className}`} {...props} />
  )
);
ModalDescription.displayName = 'ModalDescription';

export { Modal, ModalContent, ModalHeader, ModalFooter, ModalTitle, ModalDescription };
