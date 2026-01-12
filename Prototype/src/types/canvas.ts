/**
 * 画布类型定义
 * 
 * 定义了LegalMind法律工作台画布相关的TypeScript接口
 */

import { LegalNode } from './legal-node';
import { Connection } from './connection';

/** 视口 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/** 画布状态 */
export interface CanvasState {
  nodes: LegalNode[];
  connections: Connection[];
  viewport: Viewport;
  selectedNodeIds: string[];
  selectedConnectionIds: string[];
}

/** 画布元数据 */
export interface CanvasMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

/** 画布数据 */
export interface CanvasData {
  id: string;
  caseId: string;
  name: string;
  description?: string;
  nodes: LegalNode[];
  connections: Connection[];
  viewport: Viewport;
  metadata: CanvasMetadata;
}

/** 画布操作类型 */
export type CanvasOperation =
  | { type: 'ADD_NODE'; node: LegalNode }
  | { type: 'UPDATE_NODE'; nodeId: string; updates: Partial<LegalNode> }
  | { type: 'DELETE_NODE'; nodeId: string }
  | { type: 'ADD_CONNECTION'; connection: Connection }
  | { type: 'UPDATE_CONNECTION'; connectionId: string; updates: Partial<Connection> }
  | { type: 'DELETE_CONNECTION'; connectionId: string }
  | { type: 'UPDATE_VIEWPORT'; viewport: Viewport }
  | { type: 'SELECT_NODES'; nodeIds: string[] }
  | { type: 'SELECT_CONNECTIONS'; connectionIds: string[] }
  | { type: 'CLEAR_SELECTION' };

/** 画布历史记录 */
export interface CanvasHistory {
  operations: CanvasOperation[];
  currentIndex: number;
}

/** 画布配置 */
export interface CanvasConfig {
  gridSize?: number;
  snapToGrid?: boolean;
  showGrid?: boolean;
  showMinimap?: boolean;
  showAlignmentGuides?: boolean;
  enableVirtualization?: boolean;
  maxZoom?: number;
  minZoom?: number;
}

/** 画布事件 */
export type CanvasEvent =
  | { type: 'NODE_CLICK'; nodeId: string; event: MouseEvent }
  | { type: 'NODE_DOUBLE_CLICK'; nodeId: string; event: MouseEvent }
  | { type: 'NODE_DRAG_START'; nodeId: string; position: { x: number; y: number } }
  | { type: 'NODE_DRAG'; nodeId: string; position: { x: number; y: number } }
  | { type: 'NODE_DRAG_END'; nodeId: string; position: { x: number; y: number } }
  | { type: 'CONNECTION_CLICK'; connectionId: string; event: MouseEvent }
  | { type: 'CANVAS_CLICK'; position: { x: number; y: number }; event: MouseEvent }
  | { type: 'VIEWPORT_CHANGE'; viewport: Viewport };

