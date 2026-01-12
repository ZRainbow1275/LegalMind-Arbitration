/**
 * 法律节点拖拽插件
 * 
 * 功能：
 * 1. 节点拖拽
 * 2. 拖拽时更新连接线
 * 3. 拖拽边界限制
 * 4. 拖拽性能优化
 */

import { PlaitBoard, PlaitPlugin, Point } from '@plait/core';
import { LegalNode } from './legal-nodes/types';
import { getAllConnections, LegalConnection } from './legal-connection-plugin';
import { performanceMonitor } from '../lib/performance-monitor';

// ==================== 拖拽状态 ====================

interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  startPoint: Point | null;
  currentPoint: Point | null;
  originalPosition: Point | null;
}

const dragState: DragState = {
  isDragging: false,
  nodeId: null,
  startPoint: null,
  currentPoint: null,
  originalPosition: null
};

// ==================== 拖拽插件 ====================

// {{ AURA: Fix - 使用Plait的pointer事件系统而不是DOM事件 }}
export const withLegalNodeDrag: PlaitPlugin = (board: PlaitBoard) => {
  // 保存原始方法
  const { pointerDown, pointerMove, pointerUp } = board;

  // 重写pointerDown方法
  board.pointerDown = (event: PointerEvent) => {
    // 检查是否点击了我们的自定义节点
    const target = event.target as HTMLElement;
    const nodeElement = target.closest('[data-node-id]') as HTMLElement;

    if (nodeElement) {
      const nodeId = nodeElement.getAttribute('data-node-id');
      if (nodeId) {
        const node = findNodeById(board, nodeId) as LegalNode;
        if (node && node.points && node.points.length > 0) {
          // 开始拖拽
          performanceMonitor.start('drag-node', 'interaction', { nodeId });

          dragState.isDragging = true;
          dragState.nodeId = nodeId;
          dragState.startPoint = [event.clientX, event.clientY];
          dragState.originalPosition = [...node.points[0]];
          dragState.currentPoint = [event.clientX, event.clientY];

          console.log('[LegalNodeDrag] Drag started:', { nodeId, startPoint: dragState.startPoint });

          // 阻止默认行为
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    }

    // 调用原始方法
    pointerDown(event);
  };

  // 重写pointerMove方法
  board.pointerMove = (event: PointerEvent) => {
    if (dragState.isDragging && dragState.nodeId && dragState.startPoint && dragState.originalPosition) {
      // 计算偏移量
      const dx = event.clientX - dragState.startPoint[0];
      const dy = event.clientY - dragState.startPoint[1];

      // 计算新位置
      const newX = dragState.originalPosition[0] + dx;
      const newY = dragState.originalPosition[1] + dy;

      // 边界限制
      const viewport = board.viewport;
      const minX = 0;
      const minY = 0;
      const maxX = (viewport?.width || 2000) - 200;
      const maxY = (viewport?.height || 2000) - 100;

      const boundedX = Math.max(minX, Math.min(maxX, newX));
      const boundedY = Math.max(minY, Math.min(maxY, newY));

      console.log('[LegalNodeDrag] Dragging:', { dx, dy, newPos: [boundedX, boundedY] });

      // 更新节点位置
      updateNodePosition(board, dragState.nodeId, [boundedX, boundedY]);

      // 更新连接线
      updateNodeConnections(board, dragState.nodeId);

      // 更新当前点
      dragState.currentPoint = [event.clientX, event.clientY];

      // 阻止默认行为
      event.preventDefault();
      return;
    }

    // 调用原始方法
    pointerMove(event);
  };

  // 重写pointerUp方法
  board.pointerUp = (event: PointerEvent) => {
    if (dragState.isDragging) {
      console.log('[LegalNodeDrag] Drag ended');

      // 重置拖拽状态
      dragState.isDragging = false;
      dragState.nodeId = null;
      dragState.startPoint = null;
      dragState.currentPoint = null;
      dragState.originalPosition = null;

      event.preventDefault();
      return;
    }

    // 调用原始方法
    pointerUp(event);
  };

  return board;
};

// {{ AURA: Delete - 旧的DOM事件处理函数已被Plait pointer事件替代 }}

// ==================== 节点位置更新 ====================

/**
 * 更新节点位置
 */
function updateNodePosition(board: PlaitBoard, nodeId: string, newPosition: Point): void {
  const node = findNodeById(board, nodeId) as LegalNode;
  if (!node) return;

  // 更新节点位置
  if (node.points) {
    node.points[0] = newPosition;
  }

  // 更新DOM
  const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`) as SVGGElement;
  if (nodeElement) {
    // 根据节点类型更新不同的元素
    const shape = nodeElement.querySelector('.legal-node-shape');
    if (shape) {
      if (shape.tagName === 'rect') {
        shape.setAttribute('x', newPosition[0].toString());
        shape.setAttribute('y', newPosition[1].toString());
      } else if (shape.tagName === 'circle') {
        const radius = parseFloat(shape.getAttribute('r') || '50');
        shape.setAttribute('cx', (newPosition[0] + radius).toString());
        shape.setAttribute('cy', (newPosition[1] + radius).toString());
      } else if (shape.tagName === 'path') {
        // 对于菱形和六边形，需要重新计算路径
        // 这里简化处理，实际应该重新渲染
      }
    }

    // 更新文本位置
    const texts = nodeElement.querySelectorAll('text');
    texts.forEach((text) => {
      const currentX = parseFloat(text.getAttribute('x') || '0');
      const currentY = parseFloat(text.getAttribute('y') || '0');
      const offsetX = currentX - (dragState.originalPosition?.[0] || 0);
      const offsetY = currentY - (dragState.originalPosition?.[1] || 0);
      text.setAttribute('x', (newPosition[0] + offsetX).toString());
      text.setAttribute('y', (newPosition[1] + offsetY).toString());
    });
  }
}

/**
 * 更新节点的所有连接线
 */
function updateNodeConnections(board: PlaitBoard, nodeId: string): void {
  const connections = getAllConnections(board);

  connections.forEach(connection => {
    if (connection.sourceId === nodeId || connection.targetId === nodeId) {
      updateConnectionPath(board, connection);
    }
  });
}

/**
 * 更新连接线路径
 */
function updateConnectionPath(board: PlaitBoard, connection: LegalConnection): void {
  const sourceNode = findNodeById(board, connection.sourceId) as LegalNode;
  const targetNode = findNodeById(board, connection.targetId) as LegalNode;

  if (!sourceNode || !targetNode) return;

  // 计算新的连接点
  const sourcePoint = getNodeCenterPoint(sourceNode);
  const targetPoint = getNodeCenterPoint(targetNode);

  // 更新连接数据
  connection.points = [sourcePoint, targetPoint];

  // 更新DOM
  const pathElement = document.querySelector(`[data-connection-id="${connection.id}"]`) as SVGPathElement;
  if (pathElement) {
    // 计算贝塞尔曲线控制点
    const controlPoints = calculateBezierControlPoints(sourcePoint, targetPoint);

    // 更新路径
    const d = `M ${sourcePoint[0]} ${sourcePoint[1]} C ${controlPoints[0][0]} ${controlPoints[0][1]}, ${controlPoints[1][0]} ${controlPoints[1][1]}, ${targetPoint[0]} ${targetPoint[1]}`;
    pathElement.setAttribute('d', d);
  }
}

// ==================== 工具函数 ====================

// {{ AURA: Delete - findNodeElement函数已不再需要，使用closest()替代 }}

/**
 * 根据ID查找节点
 */
function findNodeById(board: PlaitBoard, nodeId: string): LegalNode | null {
  let found: LegalNode | null = null;

  const traverse = (elements: any[]) => {
    for (const element of elements) {
      if (element.id === nodeId) {
        found = element as LegalNode;
        return;
      }
      if (element.children && Array.isArray(element.children)) {
        traverse(element.children);
      }
    }
  };

  traverse(board.children);
  return found;
}

/**
 * 获取节点中心点
 */
function getNodeCenterPoint(node: LegalNode): Point {
  if (!node.points || node.points.length === 0) {
    return [0, 0];
  }

  const [x, y] = node.points[0];

  // 根据节点类型计算中心点
  // 根据节点类型计算中心点
  if (node.type === 'legal-person') {
    return [x + 50, y + 50];
  } else if (node.type === 'legal-timeline' || node.type === 'legal-process') {
    return [x + 60, y + 60];
  } else {
    return [x + 100, y + 50];
  }
}

/**
 * 计算贝塞尔曲线控制点
 */
function calculateBezierControlPoints(
  start: Point,
  end: Point
): [Point, Point] {
  const [x1, y1] = start;
  const [x2, y2] = end;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(distance * 0.3, 100);

  const cp1: Point = [x1 + offset, y1];
  const cp2: Point = [x2 - offset, y2];

  return [cp1, cp2];
}

