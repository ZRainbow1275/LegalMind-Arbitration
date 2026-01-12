/**
 * 智能布局引擎
 * 提供网格吸附、智能间距、对齐辅助线、自动布局等功能
 */

import { LegalNode } from '../types/legal-node';

// 布局配置
export const LAYOUT_CONFIG = {
  GRID_SIZE: 50, // 网格大小（px）
  MIN_DISTANCE: 300, // 节点最小间距（px）
  SNAP_THRESHOLD: 5, // 吸附阈值（px）- 减小阈值以减少抖动
  NODE_WIDTH: 256, // 默认节点宽度
  NODE_HEIGHT: 200, // 默认节点高度
};

/**
 * 网格吸附：将坐标吸附到最近的网格点
 */
export function snapToGrid(value: number, gridSize: number = LAYOUT_CONFIG.GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * 将位置吸附到网格
 */
export function snapPositionToGrid(position: { x: number; y: number }): { x: number; y: number } {
  return {
    x: snapToGrid(position.x),
    y: snapToGrid(position.y),
  };
}

/**
 * 检测两个节点是否重叠
 */
export function isOverlapping(
  node1: { x: number; y: number; width?: number; height?: number },
  node2: { x: number; y: number; width?: number; height?: number },
  minDistance: number = LAYOUT_CONFIG.MIN_DISTANCE
): boolean {
  const w1 = node1.width || LAYOUT_CONFIG.NODE_WIDTH;
  const h1 = node1.height || LAYOUT_CONFIG.NODE_HEIGHT;
  const w2 = node2.width || LAYOUT_CONFIG.NODE_WIDTH;
  const h2 = node2.height || LAYOUT_CONFIG.NODE_HEIGHT;

  const dx = Math.abs(node1.x - node2.x);
  const dy = Math.abs(node1.y - node2.y);

  return dx < (w1 + w2) / 2 + minDistance && dy < (h1 + h2) / 2 + minDistance;
}

/**
 * 查找空白区域：寻找一个不与现有节点重叠的位置
 */
export function findEmptySpace(
  existingNodes: LegalNode[],
  preferredPosition?: { x: number; y: number },
  canvasSize: { width: number; height: number } = { width: 2000, height: 2000 }
): { x: number; y: number } {
  const startX = preferredPosition?.x || 400;
  const startY = preferredPosition?.y || 300;
  const step = LAYOUT_CONFIG.GRID_SIZE;

  // 螺旋搜索算法：从首选位置开始，螺旋向外搜索
  let x = startX;
  let y = startY;
  let dx = 0;
  let dy = -step;
  let segmentLength = 1;
  let segmentPassed = 0;

  for (let i = 0; i < 1000; i++) {
    // 最多搜索1000次
    const testPosition = { x, y, width: LAYOUT_CONFIG.NODE_WIDTH, height: LAYOUT_CONFIG.NODE_HEIGHT };

    // 检查是否在画布范围内
    if (x >= 0 && x <= canvasSize.width - LAYOUT_CONFIG.NODE_WIDTH && y >= 0 && y <= canvasSize.height - LAYOUT_CONFIG.NODE_HEIGHT) {
      // 检查是否与现有节点重叠
      const hasOverlap = existingNodes.some((node) => {
        // 安全检查：确保node.position存在
        if (!node?.position) return false;
        return isOverlapping(testPosition, { x: node.position.x, y: node.position.y });
      });

      if (!hasOverlap) {
        return snapPositionToGrid({ x, y });
      }
    }

    // 螺旋移动
    x += dx;
    y += dy;
    segmentPassed++;

    if (segmentPassed === segmentLength) {
      segmentPassed = 0;
      const temp = dx;
      dx = -dy;
      dy = temp;

      if (dy === 0) {
        segmentLength++;
      }
    }
  }

  // 如果找不到空位，返回一个远离现有节点的位置
  return snapPositionToGrid({
    x: startX + Math.random() * 500,
    y: startY + Math.random() * 500,
  });
}

/**
 * 对齐辅助线：检测节点是否接近对齐
 */
export interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  nodes: string[]; // 对齐的节点ID
}

export function detectAlignmentGuides(
  draggingNode: { id: string; x: number; y: number; width?: number; height?: number },
  otherNodes: LegalNode[],
  threshold: number = LAYOUT_CONFIG.SNAP_THRESHOLD
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];
  const w = draggingNode.width || LAYOUT_CONFIG.NODE_WIDTH;
  const h = draggingNode.height || LAYOUT_CONFIG.NODE_HEIGHT;

  const draggingLeft = draggingNode.x;
  const draggingRight = draggingNode.x + w;
  const draggingCenterX = draggingNode.x + w / 2;
  const draggingTop = draggingNode.y;
  const draggingBottom = draggingNode.y + h;
  const draggingCenterY = draggingNode.y + h / 2;

  otherNodes.forEach((node) => {
    if (node.id === draggingNode.id) return;

    // 安全检查：确保node.position存在
    if (!node?.position) {
      console.error('[Layout Engine] 节点缺少position数据:', node);
      return;
    }

    const nodeW = LAYOUT_CONFIG.NODE_WIDTH;
    const nodeH = LAYOUT_CONFIG.NODE_HEIGHT;
    const nodeLeft = node.position.x;
    const nodeRight = node.position.x + nodeW;
    const nodeCenterX = node.position.x + nodeW / 2;
    const nodeTop = node.position.y;
    const nodeBottom = node.position.y + nodeH;
    const nodeCenterY = node.position.y + nodeH / 2;

    // 垂直对齐线（X轴）
    if (Math.abs(draggingLeft - nodeLeft) < threshold) {
      guides.push({ type: 'vertical', position: nodeLeft, nodes: [node.id] });
    }
    if (Math.abs(draggingRight - nodeRight) < threshold) {
      guides.push({ type: 'vertical', position: nodeRight, nodes: [node.id] });
    }
    if (Math.abs(draggingCenterX - nodeCenterX) < threshold) {
      guides.push({ type: 'vertical', position: nodeCenterX, nodes: [node.id] });
    }

    // 水平对齐线（Y轴）
    if (Math.abs(draggingTop - nodeTop) < threshold) {
      guides.push({ type: 'horizontal', position: nodeTop, nodes: [node.id] });
    }
    if (Math.abs(draggingBottom - nodeBottom) < threshold) {
      guides.push({ type: 'horizontal', position: nodeBottom, nodes: [node.id] });
    }
    if (Math.abs(draggingCenterY - nodeCenterY) < threshold) {
      guides.push({ type: 'horizontal', position: nodeCenterY, nodes: [node.id] });
    }
  });

  return guides;
}

/**
 * 自动布局：使用力导向图算法
 */
export interface ForceLayoutConfig {
  iterations?: number; // 迭代次数
  repulsionStrength?: number; // 排斥力强度
  attractionStrength?: number; // 吸引力强度（基于连接）
  centeringStrength?: number; // 居中力强度
  damping?: number; // 阻尼系数
}

export function autoLayout(
  nodes: LegalNode[],
  connections: Array<{ from: string; to: string }> = [],
  config: ForceLayoutConfig = {}
): LegalNode[] {
  const {
    iterations = 100,
    repulsionStrength = 50000,
    attractionStrength = 0.01,
    centeringStrength = 0.001,
    damping = 0.8,
  } = config;

  // 复制节点数据，并添加安全检查
  const layoutNodes = nodes
    .filter(node => node?.position) // 过滤掉没有position的节点
    .map((node) => ({
      ...node,
      vx: 0,
      vy: 0,
    }));

  // 计算画布中心
  const centerX = 800;
  const centerY = 400;

  for (let iter = 0; iter < iterations; iter++) {
    // 1. 计算排斥力（所有节点之间）
    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const node1 = layoutNodes[i];
        const node2 = layoutNodes[j];

        const dx = node2.position.x - node1.position.x;
        const dy = node2.position.y - node1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = repulsionStrength / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        node1.vx -= fx;
        node1.vy -= fy;
        node2.vx += fx;
        node2.vy += fy;
      }
    }

    // 2. 计算吸引力（基于连接）
    connections.forEach((conn) => {
      const node1 = layoutNodes.find((n) => n.id === conn.from);
      const node2 = layoutNodes.find((n) => n.id === conn.to);

      if (node1 && node2) {
        const dx = node2.position.x - node1.position.x;
        const dy = node2.position.y - node1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = distance * attractionStrength;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        node1.vx += fx;
        node1.vy += fy;
        node2.vx -= fx;
        node2.vy -= fy;
      }
    });

    // 3. 计算居中力
    layoutNodes.forEach((node) => {
      const dx = centerX - node.position.x;
      const dy = centerY - node.position.y;

      node.vx += dx * centeringStrength;
      node.vy += dy * centeringStrength;
    });

    // 4. 应用速度和阻尼
    layoutNodes.forEach((node) => {
      node.vx *= damping;
      node.vy *= damping;

      node.position.x += node.vx;
      node.position.y += node.vy;

      // 吸附到网格
      node.position = snapPositionToGrid(node.position);

      // 限制在画布范围内
      node.position.x = Math.max(50, Math.min(1500, node.position.x));
      node.position.y = Math.max(50, Math.min(1000, node.position.y));
    });
  }

  // 移除临时速度属性
  return layoutNodes.map(({ vx: _vx, vy: _vy, ...node }) => node as LegalNode);
}

