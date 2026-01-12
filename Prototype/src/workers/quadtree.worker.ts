/**
 * 四叉树构建Worker
 * 
 * 在后台线程中构建四叉树，避免阻塞主线程
 */

import type { CanvasElement, Bounds } from '../types/canvas-elements';
import { QuadTree, calculateBoundingBox } from '../lib/virtualization';

// ==================== 消息类型定义 ====================

export interface BuildQuadTreeMessage {
  type: 'build';
  elements: CanvasElement[];
  canvasBounds?: Bounds;
}

export interface QueryQuadTreeMessage {
  type: 'query';
  bounds: Bounds;
}

export interface ClearQuadTreeMessage {
  type: 'clear';
}

export type WorkerMessage = BuildQuadTreeMessage | QueryQuadTreeMessage | ClearQuadTreeMessage;

export interface BuildQuadTreeResponse {
  type: 'build-complete';
  success: boolean;
  elementCount: number;
  buildTime: number;
}

export interface QueryQuadTreeResponse {
  type: 'query-result';
  elements: CanvasElement[];
  queryTime: number;
}

export interface ErrorResponse {
  type: 'error';
  error: string;
}

export type WorkerResponse = BuildQuadTreeResponse | QueryQuadTreeResponse | ErrorResponse;

// ==================== Worker状态 ====================

let quadTree: QuadTree | null = null;

// ==================== 消息处理 ====================

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  
  try {
    switch (message.type) {
      case 'build':
        handleBuild(message);
        break;
      case 'query':
        handleQuery(message);
        break;
      case 'clear':
        handleClear();
        break;
      default:
        throw new Error(`Unknown message type: ${(message as any).type}`);
    }
  } catch (error) {
    const errorResponse: ErrorResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : String(error)
    };
    self.postMessage(errorResponse);
  }
};

/**
 * 处理构建四叉树请求
 */
function handleBuild(message: BuildQuadTreeMessage) {
  const startTime = performance.now();
  
  const { elements, canvasBounds } = message;
  
  // 计算画布边界
  let bounds = canvasBounds;
  if (!bounds) {
    bounds = calculateBoundingBox(elements);
    // 添加边距
    const padding = 1000;
    bounds = {
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2
    };
  }
  
  // 构建四叉树
  quadTree = new QuadTree(bounds);
  quadTree.insertAll(elements);
  
  const buildTime = performance.now() - startTime;
  
  const response: BuildQuadTreeResponse = {
    type: 'build-complete',
    success: true,
    elementCount: elements.length,
    buildTime
  };
  
  self.postMessage(response);
}

/**
 * 处理查询请求
 */
function handleQuery(message: QueryQuadTreeMessage) {
  if (!quadTree) {
    throw new Error('QuadTree not initialized. Call build first.');
  }
  
  const startTime = performance.now();
  
  const elements = quadTree.query(message.bounds);
  
  const queryTime = performance.now() - startTime;
  
  const response: QueryQuadTreeResponse = {
    type: 'query-result',
    elements,
    queryTime
  };
  
  self.postMessage(response);
}

/**
 * 处理清除请求
 */
function handleClear() {
  quadTree = null;
  
  self.postMessage({
    type: 'build-complete',
    success: true,
    elementCount: 0,
    buildTime: 0
  });
}

