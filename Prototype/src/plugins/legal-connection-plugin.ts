/**
 * 法律节点连接插件
 * 
 * 功能：
 * 1. 节点之间的连接线绘制
 * 2. 连接验证
 * 3. 连接交互（创建、删除）
 * 4. 连接样式（橙色曲线）
 */

import { PlaitBoard, PlaitPlugin, PlaitElement, Point, Transforms } from '@plait/core';
import { LegalNode } from './legal-nodes/types';

// ==================== 连接数据结构 ====================

export interface LegalConnection extends PlaitElement {
  id: string;
  type: 'legal-connection';
  sourceId: string;
  targetId: string;
  points: Point[];
  style?: {
    color?: string;
    width?: number;
    dashArray?: string;
  };
}

// ==================== 连接验证 ====================

/**
 * 验证两个节点之间的连接是否有效
 */
function validateConnection(sourceNode: LegalNode, targetNode: LegalNode): {
  valid: boolean;
  reason?: string;
} {
  // 基本验证：不能连接到自己
  if (sourceNode.id === targetNode.id) {
    return { valid: false, reason: '不能连接到自己' };
  }

  // 所有法律节点之间都可以连接
  return { valid: true };
}

// ==================== 连接插件 ====================

export const withLegalConnection: PlaitPlugin = (board: PlaitBoard) => {
  const { apply } = board;

  // 扩展apply方法，添加连接验证
  board.apply = (operation: any) => {
    if (operation.type === 'insert_node') {
      const element = operation.node as PlaitElement;
      if ((element as any).type === 'legal-connection') {
        const connection = element as LegalConnection;

        // 验证连接
        const sourceNode = findNodeById(board, connection.sourceId) as LegalNode;
        const targetNode = findNodeById(board, connection.targetId) as LegalNode;

        if (sourceNode && targetNode) {
          const validation = validateConnection(sourceNode, targetNode);
          if (!validation.valid) {
            console.warn('连接验证失败:', validation.reason);
            return; // 阻止插入
          }
        }
      }
    }

    apply(operation);
  };

  return board;
};

// ==================== 连接创建 ====================

/**
 * 创建连接
 */
export function createLegalConnection(
  sourceId: string,
  targetId: string,
  sourcePoint: Point,
  targetPoint: Point
): LegalConnection {
  return {
    id: `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'legal-connection',
    sourceId,
    targetId,
    points: [sourcePoint, targetPoint],
    style: {
      color: '#FF6B00', // LegalMind橙色
      width: 2,
      dashArray: ''
    },
    children: []
  };
}

/**
 * 在画板上创建连接
 */
export function createConnectionOnBoard(
  board: PlaitBoard,
  sourceId: string,
  targetId: string
): LegalConnection | null {
  const sourceNode = findNodeById(board, sourceId) as LegalNode;
  const targetNode = findNodeById(board, targetId) as LegalNode;

  if (!sourceNode || !targetNode) {
    console.error('源节点或目标节点不存在');
    return null;
  }

  // 验证连接
  const validation = validateConnection(sourceNode, targetNode);
  if (!validation.valid) {
    console.error('连接验证失败:', validation.reason);
    return null;
  }

  // 计算连接点
  const sourcePoint = getNodeCenterPoint(sourceNode);
  const targetPoint = getNodeCenterPoint(targetNode);

  // 创建连接
  const connection = createLegalConnection(sourceId, targetId, sourcePoint, targetPoint);

  // 插入到画板
  Transforms.insertNode(board, connection, [board.children.length]);

  return connection;
}

// ==================== 连接渲染 ====================

/**
 * 渲染连接线
 */
export function renderLegalConnection(
  _board: PlaitBoard,
  connection: LegalConnection
): SVGPathElement {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  if (connection.points.length < 2) return path;

  const [sourcePoint, targetPoint] = connection.points;

  // 计算贝塞尔曲线控制点
  const controlPoints = calculateBezierControlPoints(sourcePoint, targetPoint);

  // 创建路径
  const d = `M ${sourcePoint[0]} ${sourcePoint[1]} C ${controlPoints[0][0]} ${controlPoints[0][1]}, ${controlPoints[1][0]} ${controlPoints[1][1]}, ${targetPoint[0]} ${targetPoint[1]}`;

  path.setAttribute('d', d);
  path.setAttribute('stroke', connection.style?.color || '#FF6B00');
  path.setAttribute('stroke-width', (connection.style?.width || 2).toString());
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');

  if (connection.style?.dashArray) {
    path.setAttribute('stroke-dasharray', connection.style.dashArray);
  }

  // 添加箭头
  const arrowId = `arrow-${connection.id}`;
  createArrowMarker(arrowId, connection.style?.color || '#FF6B00');
  path.setAttribute('marker-end', `url(#${arrowId})`);

  // 添加交互类
  path.setAttribute('class', 'legal-connection');
  path.setAttribute('data-connection-id', connection.id);
  path.setAttribute('data-source-id', connection.sourceId);
  path.setAttribute('data-target-id', connection.targetId);

  // 添加悬停效果
  path.style.cursor = 'pointer';
  path.style.transition = 'stroke-width 0.2s';

  path.addEventListener('mouseenter', () => {
    path.setAttribute('stroke-width', '4');
  });

  path.addEventListener('mouseleave', () => {
    path.setAttribute('stroke-width', (connection.style?.width || 2).toString());
  });

  return path;
}

/**
 * 创建箭头标记
 */
function createArrowMarker(id: string, color: string): SVGMarkerElement {
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', id);
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', '10');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '3');
  marker.setAttribute('orient', 'auto');
  marker.setAttribute('markerUnits', 'strokeWidth');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M0,0 L0,6 L9,3 z');
  path.setAttribute('fill', color);

  marker.appendChild(path);

  return marker;
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



  // 计算偏移量（创建曲线效果）
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(distance * 0.3, 100);

  // 控制点1：从起点向右偏移
  const cp1: Point = [x1 + offset, y1];

  // 控制点2：从终点向左偏移
  const cp2: Point = [x2 - offset, y2];

  return [cp1, cp2];
}

// ==================== 连接查询 ====================

/**
 * 获取所有连接
 */
export function getAllConnections(board: PlaitBoard): LegalConnection[] {
  const connections: LegalConnection[] = [];

  const traverse = (elements: PlaitElement[]) => {
    elements.forEach(element => {
      if ((element as any).type === 'legal-connection') {
        connections.push(element as LegalConnection);
      }
      if ('children' in element && Array.isArray(element.children)) {
        traverse(element.children);
      }
    });
  };

  traverse(board.children);
  return connections;
}

/**
 * 获取节点的所有连接
 */
export function getNodeConnections(
  board: PlaitBoard,
  nodeId: string
): { incoming: LegalConnection[]; outgoing: LegalConnection[] } {
  const allConnections = getAllConnections(board);

  const incoming = allConnections.filter(conn => conn.targetId === nodeId);
  const outgoing = allConnections.filter(conn => conn.sourceId === nodeId);

  return { incoming, outgoing };
}

/**
 * 删除连接
 */
export function deleteConnection(board: PlaitBoard, connectionId: string): void {
  const connection = findConnectionById(board, connectionId);
  if (connection) {
    const path = PlaitBoard.findPath(board, connection);
    Transforms.removeNode(board, path);
  }
}

/**
 * 删除节点的所有连接
 */
export function deleteNodeConnections(board: PlaitBoard, nodeId: string): void {
  const { incoming, outgoing } = getNodeConnections(board, nodeId);

  [...incoming, ...outgoing].forEach(connection => {
    const path = PlaitBoard.findPath(board, connection);
    Transforms.removeNode(board, path);
  });
}

// ==================== 工具函数 ====================

/**
 * 根据ID查找节点
 */
function findNodeById(board: PlaitBoard, nodeId: string): PlaitElement | null {
  let found: PlaitElement | null = null;

  const traverse = (elements: PlaitElement[]) => {
    for (const element of elements) {
      if ((element as any).id === nodeId) {
        found = element;
        return;
      }
      if ('children' in element && Array.isArray(element.children)) {
        traverse(element.children);
      }
    }
  };

  traverse(board.children);
  return found;
}

/**
 * 根据ID查找连接
 */
function findConnectionById(board: PlaitBoard, connectionId: string): LegalConnection | null {
  const connections = getAllConnections(board);
  return connections.find(conn => conn.id === connectionId) || null;
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
  // 这里简化处理，实际应该根据节点形状和大小计算
  return [x + 100, y + 50];
}

