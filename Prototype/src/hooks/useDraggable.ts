import { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
    x: number;
    y: number;
}

interface UseDraggableOptions {
    initialPosition?: Position;
    onDragEnd?: (position: Position) => void;
}

export const useDraggable = ({ initialPosition = { x: 0, y: 0 }, onDragEnd }: UseDraggableOptions = {}) => {
    const [position, setPosition] = useState<Position>(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<Position>({ x: 0, y: 0 });
    const elementRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only allow dragging from the handle if specified, otherwise the whole element
        if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
            setIsDragging(true);
            dragStartRef.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
            };
            e.preventDefault(); // Prevent text selection
        } else if (!elementRef.current?.querySelector('[data-drag-handle]')) {
            // If no handle is defined, drag by the element itself, but avoid inputs/buttons
            if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

            setIsDragging(true);
            dragStartRef.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
            };
        }
    }, [position]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const newX = e.clientX - dragStartRef.current.x;
            const newY = e.clientY - dragStartRef.current.y;

            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                onDragEnd?.(position);
            }
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, onDragEnd, position]);

    return {
        position,
        isDragging,
        handleMouseDown,
        elementRef
    };
};
