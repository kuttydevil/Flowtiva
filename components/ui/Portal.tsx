import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
    children: React.ReactNode;
    target?: HTMLElement;
}

export const Portal: React.FC<PortalProps> = ({ children, target }) => {
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setContainer(target || document.body);
    }, [target]);

    if (!container) return null;
    return createPortal(children, container);
};
