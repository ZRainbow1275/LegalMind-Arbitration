import React from 'react';
import { FloatingPanel } from './FloatingPanel';

export interface DraggablePanelProps {
    children: React.ReactNode;
    title: string;
    initialPosition?: { x: number; y: number };
    onClose?: () => void;
    className?: string;
    width?: number | string;
    height?: number | string;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
    children,
    title,
    initialPosition,
    onClose,
    className,
    width = 800,
    height = 600
}) => {
    // Convert width/height to numbers if possible, or use defaults
    const numericWidth = typeof width === 'number' ? width : 800;
    const numericHeight = typeof height === 'number' ? height : 600;

    return (
        <FloatingPanel
            title={title}
            defaultPosition={initialPosition}
            defaultSize={{ width: numericWidth, height: numericHeight }}
            onClose={onClose}
            className={className}
            // DraggablePanel is always draggable
            draggable={true}
            // Enable resizing by default for better UX
            resizable={true}
            // Enable collapsing by default
            collapsible={true}
        >
            {children}
        </FloatingPanel>
    );
};
