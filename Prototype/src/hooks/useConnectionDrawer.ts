import { useState, useCallback } from 'react';
import type { CanvasElement } from '../types/canvas-elements';

export const useConnectionDrawer = () => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [sourceElement, setSourceElement] = useState<CanvasElement | null>(null);

    const startDrawing = useCallback((element: CanvasElement) => {
        setIsDrawing(true);
        setSourceElement(element);
    }, []);

    const endDrawing = useCallback(() => {
        setIsDrawing(false);
        setSourceElement(null);
    }, []);

    return {
        isDrawing,
        sourceElement,
        startDrawing,
        endDrawing,
    };
};
