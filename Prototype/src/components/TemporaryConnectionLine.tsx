import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TemporaryConnectionLineProps {
    startPosition: { x: number; y: number };
    viewport: { zoom: number; x: number; y: number };
}

export const TemporaryConnectionLine: React.FC<TemporaryConnectionLineProps> = ({
    startPosition,
    viewport
}) => {
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Convert screen coordinates to canvas coordinates
            // Note: The parent container usually handles the viewport transform (scale/translate).
            // If this component is rendered INSIDE the transformed container, we need to inverse transform the mouse.
            // But if it's outside, we transform the startPosition.

            // Let's assume this component is rendered INSIDE the transformed container (same as nodes).
            // So we need to map screen mouse to canvas coordinates.

            // We can't easily get the container rect here without a ref.
            // But we know the viewport offset and zoom.
            // CanvasX = (ScreenX - ContainerLeft - ViewportX) / Zoom
            // We assume ContainerLeft is 0 (full screen) or we ignore it if we use clientX relative to window.
            // Actually, CanvasRenderer uses getBoundingClientRect().

            // To be accurate, we should probably pass the mouse position from CanvasRenderer if possible,
            // OR use a ref to the canvas container.

            // For now, let's try to calculate based on window, assuming full screen canvas.
            // If there's a sidebar, this might be slightly off, but let's see.

            // Better: Use movementX/Y? No.

            // Let's rely on the fact that we are in a fixed position container?
            // No, let's just use clientX/Y and adjust by viewport.
            // We might need to adjust for the sidebar width (e.g. 64px or 240px).
            // This is risky.

            // ALTERNATIVE: Render this component at the root level (fixed overlay) and project the start node position to screen?
            // That's safer for mouse tracking.

            // Let's try rendering inside the canvas (transformed) and calculating mouse pos.
            // We need the canvas container offset.
            const canvasContainer = document.querySelector('.plait-board-container');
            const rect = canvasContainer?.getBoundingClientRect() || { left: 0, top: 0 };

            const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
            const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

            setMousePos({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [viewport]);

    if (!mousePos) return null;

    const dx = mousePos.x - startPosition.x;
    const dy = mousePos.y - startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate control point for curve
    const midX = (startPosition.x + mousePos.x) / 2;
    const midY = (startPosition.y + mousePos.y) / 2;
    // Add some curvature based on distance
    const curvature = Math.min(distance * 0.2, 100);
    // Perpendicular vector
    const perpX = -dy / distance * curvature || 0;
    const perpY = dx / distance * curvature || 0;

    const controlX = midX + perpX;
    const controlY = midY + perpY;

    const path = `M ${startPosition.x} ${startPosition.y} Q ${controlX} ${controlY} ${mousePos.x} ${mousePos.y}`;

    return (
        <svg className="absolute inset-0 pointer-events-none overflow-visible">
            <motion.path
                d={path}
                stroke="#3b82f6"
                strokeWidth={2 / viewport.zoom}
                fill="none"
                strokeDasharray="5,5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                    pathLength: 1,
                    opacity: 0.8,
                    strokeDashoffset: [0, -20]
                }}
                transition={{
                    strokeDashoffset: { duration: 0.5, repeat: Infinity, ease: "linear" },
                    default: { duration: 0.2 }
                }}
                style={{
                    filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))'
                }}
            />
            <motion.circle
                cx={mousePos.x}
                cy={mousePos.y}
                r={4 / viewport.zoom}
                fill="#3b82f6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
            />
        </svg>
    );
};
