import React, { useState, useCallback } from 'react';
import { useVoiceZoneStore } from '../../stores/voice-zone-store';

interface Viewport {
    zoom: number;
    x: number;
    y: number;
}

interface VoiceZoneCreationLayerProps {
    active: boolean;
    getViewport: () => Viewport;
    onComplete: () => void;
    onCancel: () => void;
}

export const VoiceZoneCreationLayer: React.FC<VoiceZoneCreationLayerProps> = ({
    active,
    getViewport,
    onComplete,
    onCancel,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);

    const { createZone } = useVoiceZoneStore();

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!active) return;
        e.preventDefault();
        e.stopPropagation();

        const viewport = getViewport();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Convert to canvas coordinates
        const canvasX = (x - viewport.x) / viewport.zoom;
        const canvasY = (y - viewport.y) / viewport.zoom;

        setStartPoint({ x: canvasX, y: canvasY });
        setCurrentPoint({ x: canvasX, y: canvasY });
        setIsDragging(true);
    }, [active, getViewport]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !startPoint) return;
        e.preventDefault();
        e.stopPropagation();

        const viewport = getViewport();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const canvasX = (x - viewport.x) / viewport.zoom;
        const canvasY = (y - viewport.y) / viewport.zoom;

        setCurrentPoint({ x: canvasX, y: canvasY });
    }, [isDragging, startPoint, getViewport]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !startPoint || !currentPoint) return;
        e.preventDefault();
        e.stopPropagation();

        const minX = Math.min(startPoint.x, currentPoint.x);
        const minY = Math.min(startPoint.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - startPoint.x);
        const height = Math.abs(currentPoint.y - startPoint.y);

        if (width > 50 && height > 50) {
            // Create zone
            createZone({
                name: '新建语音场',
                bounds: { x: minX, y: minY, width, height }
            });
            onComplete();
        } else {
            // Too small, cancel
            onCancel();
        }

        setIsDragging(false);
        setStartPoint(null);
        setCurrentPoint(null);
    }, [isDragging, startPoint, currentPoint, createZone, onComplete, onCancel]);

    // Handle ESC key
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (active && e.key === 'Escape') {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [active, onCancel]);

    if (!active) return null;

    // Calculate selection box style
    let selectionStyle: React.CSSProperties = {};
    if (startPoint && currentPoint) {
        const viewport = getViewport();
        const minX = Math.min(startPoint.x, currentPoint.x);
        const minY = Math.min(startPoint.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - startPoint.x);
        const height = Math.abs(currentPoint.y - startPoint.y);

        // Transform back to screen coordinates for rendering
        const screenX = minX * viewport.zoom + viewport.x;
        const screenY = minY * viewport.zoom + viewport.y;
        const screenWidth = width * viewport.zoom;
        const screenHeight = height * viewport.zoom;

        selectionStyle = {
            position: 'absolute',
            left: screenX,
            top: screenY,
            width: screenWidth,
            height: screenHeight,
            border: '2px dashed #f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            pointerEvents: 'none',
        };
    }

    return (
        <div
            className="absolute inset-0 z-50 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {isDragging && <div style={selectionStyle} />}
        </div>
    );
};
