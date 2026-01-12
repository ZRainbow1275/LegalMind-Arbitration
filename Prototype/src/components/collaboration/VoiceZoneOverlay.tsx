import React, { useEffect, useState } from 'react';
import { VoiceZoneRenderer } from './VoiceZoneRenderer';

interface Viewport {
    zoom: number;
    x: number;
    y: number;
}

interface VoiceZoneOverlayProps {
    getViewport: () => Viewport;
}

export const VoiceZoneOverlay: React.FC<VoiceZoneOverlayProps> = ({ getViewport }) => {
    const [viewport, setViewport] = useState<Viewport>({ zoom: 1, x: 0, y: 0 });

    useEffect(() => {
        let animationFrameId: number;

        const checkViewport = () => {
            const current = getViewport();
            setViewport(prev => {
                if (
                    prev.zoom !== current.zoom ||
                    prev.x !== current.x ||
                    prev.y !== current.y
                ) {
                    return current;
                }
                return prev;
            });
            animationFrameId = requestAnimationFrame(checkViewport);
        };

        checkViewport();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [getViewport]);

    return (
        <div
            className="absolute top-0 left-0 pointer-events-none overflow-hidden w-full h-full"
            style={{ zIndex: 10 }} // Ensure it's above canvas but below UI panels
        >
            <div
                className="absolute top-0 left-0 w-full h-full"
                style={{
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                    transformOrigin: '0 0',
                }}
            >
                <VoiceZoneRenderer scale={viewport.zoom} />
            </div>
        </div>
    );
};
