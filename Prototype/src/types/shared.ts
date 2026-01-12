/**
 * Shared Type Definitions
 * 
 * This file serves as the single source of truth for common types used across the application.
 * It helps avoid type duplication and circular dependency issues.
 */

// ==================== Viewport ====================
export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

// ==================== Keyboard Shortcuts ====================
export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    action: () => void;
}

// ==================== Canvas Elements ====================
// Re-export specific types from canvas-elements to avoid direct imports
import {
    LegalNodeElement,
    ConnectionElement,
    CanvasElement,
    Position,
    Size
} from './canvas-elements';

export type LegalNode = LegalNodeElement;
export type Connection = ConnectionElement;
export type { CanvasElement, Position, Size };

// ==================== Common Interfaces ====================
export interface BaseProps {
    className?: string;
    style?: React.CSSProperties;
}
