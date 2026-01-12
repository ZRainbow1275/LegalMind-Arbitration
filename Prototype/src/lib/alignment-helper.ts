/**
 * 对齐辅助系统
 * 
 * 提供智能对齐线和吸附功能
 */

import type { CanvasElement, Position, Bounds } from '../types/canvas-elements';

// ==================== 类型定义 ====================

export interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number; // x或y坐标
  elements: string[]; // 对齐到这条线的元素ID
}

export interface SnapResult {
  position: Position;
  guides: AlignmentGuide[];
  snapped: boolean;
}

// ==================== 常量 ====================

const SNAP_THRESHOLD = 5; // 吸附阈值（像素）

// ==================== 辅助函数 ====================

/**
 * 获取元素的边界框
 */
export function getElementBounds(element: CanvasElement): Bounds {
  return {
    x: element.position.x,
    y: element.position.y,
    width: element.size.width,
    height: element.size.height,
  };
}

/**
 * 获取元素的关键点（用于对齐）
 */
export function getElementKeyPoints(element: CanvasElement) {
  const bounds = getElementBounds(element);
  return {
    left: bounds.x,
    right: bounds.x + bounds.width,
    centerX: bounds.x + bounds.width / 2,
    top: bounds.y,
    bottom: bounds.y + bounds.height,
    centerY: bounds.y + bounds.height / 2,
  };
}

/**
 * 检查两个数值是否接近（在阈值内）
 */
function isNear(a: number, b: number, threshold: number = SNAP_THRESHOLD): boolean {
  return Math.abs(a - b) <= threshold;
}

// ==================== 对齐检测 ====================

/**
 * 检测元素移动时的对齐
 */
export function detectAlignment(
  movingElement: CanvasElement,
  newPosition: Position,
  otherElements: CanvasElement[]
): SnapResult {
  const guides: AlignmentGuide[] = [];
  let snappedX = newPosition.x;
  let snappedY = newPosition.y;
  let snapped = false;
  
  // 计算移动元素的关键点（基于新位置）
  const movingBounds = {
    ...getElementBounds(movingElement),
    x: newPosition.x,
    y: newPosition.y,
  };
  
  const movingPoints = {
    left: movingBounds.x,
    right: movingBounds.x + movingBounds.width,
    centerX: movingBounds.x + movingBounds.width / 2,
    top: movingBounds.y,
    bottom: movingBounds.y + movingBounds.height,
    centerY: movingBounds.y + movingBounds.height / 2,
  };
  
  // 遍历其他元素，检测对齐
  for (const other of otherElements) {
    if (other.id === movingElement.id) continue;
    
    const otherPoints = getElementKeyPoints(other);
    
    // 检测垂直对齐（X轴）
    if (isNear(movingPoints.left, otherPoints.left)) {
      snappedX = otherPoints.left;
      snapped = true;
      guides.push({
        type: 'vertical',
        position: otherPoints.left,
        elements: [movingElement.id, other.id],
      });
    } else if (isNear(movingPoints.right, otherPoints.right)) {
      snappedX = otherPoints.right - movingBounds.width;
      snapped = true;
      guides.push({
        type: 'vertical',
        position: otherPoints.right,
        elements: [movingElement.id, other.id],
      });
    } else if (isNear(movingPoints.centerX, otherPoints.centerX)) {
      snappedX = otherPoints.centerX - movingBounds.width / 2;
      snapped = true;
      guides.push({
        type: 'vertical',
        position: otherPoints.centerX,
        elements: [movingElement.id, other.id],
      });
    }
    
    // 检测水平对齐（Y轴）
    if (isNear(movingPoints.top, otherPoints.top)) {
      snappedY = otherPoints.top;
      snapped = true;
      guides.push({
        type: 'horizontal',
        position: otherPoints.top,
        elements: [movingElement.id, other.id],
      });
    } else if (isNear(movingPoints.bottom, otherPoints.bottom)) {
      snappedY = otherPoints.bottom - movingBounds.height;
      snapped = true;
      guides.push({
        type: 'horizontal',
        position: otherPoints.bottom,
        elements: [movingElement.id, other.id],
      });
    } else if (isNear(movingPoints.centerY, otherPoints.centerY)) {
      snappedY = otherPoints.centerY - movingBounds.height / 2;
      snapped = true;
      guides.push({
        type: 'horizontal',
        position: otherPoints.centerY,
        elements: [movingElement.id, other.id],
      });
    }
  }
  
  return {
    position: { x: snappedX, y: snappedY },
    guides,
    snapped,
  };
}

// ==================== 批量对齐 ====================

/**
 * 对齐多个元素到指定类型
 */
export function alignElements(
  elements: CanvasElement[],
  alignType: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
): Map<string, Position> {
  if (elements.length === 0) return new Map();

  const newPositions = new Map<string, Position>();

  // 计算所有元素的边界
  const allPoints = elements.map(el => getElementKeyPoints(el));

  switch (alignType) {
    case 'left': {
      // 使用最左边的元素
      const targetX = Math.min(...allPoints.map(p => p.left));
      elements.forEach(el => {
        newPositions.set(el.id, { x: targetX, y: el.position.y });
      });
      break;
    }

    case 'center': {
      // 使用所有元素的中心点的平均值
      const minX = Math.min(...allPoints.map(p => p.left));
      const maxX = Math.max(...allPoints.map(p => p.right));
      const targetX = (minX + maxX) / 2;
      elements.forEach(el => {
        const centerOffset = el.size.width / 2;
        newPositions.set(el.id, { x: targetX - centerOffset, y: el.position.y });
      });
      break;
    }

    case 'right': {
      // 使用最右边的元素
      const targetX = Math.max(...allPoints.map(p => p.right));
      elements.forEach(el => {
        newPositions.set(el.id, { x: targetX - el.size.width, y: el.position.y });
      });
      break;
    }

    case 'top': {
      // 使用最上边的元素
      const targetY = Math.min(...allPoints.map(p => p.top));
      elements.forEach(el => {
        newPositions.set(el.id, { x: el.position.x, y: targetY });
      });
      break;
    }

    case 'middle': {
      // 使用所有元素的中心点的平均值
      const minY = Math.min(...allPoints.map(p => p.top));
      const maxY = Math.max(...allPoints.map(p => p.bottom));
      const targetY = (minY + maxY) / 2;
      elements.forEach(el => {
        const centerOffset = el.size.height / 2;
        newPositions.set(el.id, { x: el.position.x, y: targetY - centerOffset });
      });
      break;
    }

    case 'bottom': {
      // 使用最下边的元素
      const targetY = Math.max(...allPoints.map(p => p.bottom));
      elements.forEach(el => {
        newPositions.set(el.id, { x: el.position.x, y: targetY - el.size.height });
      });
      break;
    }
  }

  return newPositions;
}

// ==================== 分布 ====================

/**
 * 均匀分布多个元素
 */
export function distributeElements(
  elements: CanvasElement[],
  distributeType: 'horizontal' | 'vertical'
): Map<string, Position> {
  if (elements.length < 3) return new Map();
  
  const newPositions = new Map<string, Position>();
  
  // 按位置排序
  const sorted = [...elements].sort((a, b) => {
    if (distributeType === 'horizontal') {
      return a.position.x - b.position.x;
    } else {
      return a.position.y - b.position.y;
    }
  });
  
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  
  if (distributeType === 'horizontal') {
    const firstRight = first.position.x + first.size.width;
    const lastLeft = last.position.x;
    const totalGap = lastLeft - firstRight;
    const gap = totalGap / (sorted.length - 1);
    
    let currentX = firstRight;
    for (let i = 1; i < sorted.length - 1; i++) {
      currentX += gap;
      newPositions.set(sorted[i].id, {
        x: currentX,
        y: sorted[i].position.y,
      });
      currentX += sorted[i].size.width;
    }
  } else {
    const firstBottom = first.position.y + first.size.height;
    const lastTop = last.position.y;
    const totalGap = lastTop - firstBottom;
    const gap = totalGap / (sorted.length - 1);
    
    let currentY = firstBottom;
    for (let i = 1; i < sorted.length - 1; i++) {
      currentY += gap;
      newPositions.set(sorted[i].id, {
        x: sorted[i].position.x,
        y: currentY,
      });
      currentY += sorted[i].size.height;
    }
  }
  
  return newPositions;
}

// ==================== 网格吸附 ====================

/**
 * 吸附到网格
 */
export function snapToGrid(position: Position, gridSize: number): Position {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

