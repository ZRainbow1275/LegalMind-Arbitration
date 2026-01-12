
/**
 * 虚拟化渲染系统
 * 
 * 只渲染视口内可见的元素，提升大规模画布的性能
 */

import type { CanvasElement, Bounds } from '../types/canvas-elements';

// ==================== 类型定义 ====================

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface VirtualizationResult {
  visibleElements: CanvasElement[];
  culledCount: number;
  totalCount: number;
}

// ==================== 视口计算 ====================

/**
 * 计算视口边界（画布坐标系）
 */
export function getViewportBounds(viewport: Viewport): Bounds {
  return {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: viewport.width / viewport.zoom,
    height: viewport.height / viewport.zoom,
  };
}

/**
 * 检查元素是否在视口内
 */
export function isElementInViewport(
  element: CanvasElement,
  viewport: Viewport,
  padding: number = 100 // 额外的缓冲区，避免边缘闪烁
): boolean {
  const viewportBounds = getViewportBounds(viewport);

  // 元素边界
  const elementBounds: Bounds = {
    x: element.position.x,
    y: element.position.y,
    width: element.size.width,
    height: element.size.height,
  };

  // 添加缓冲区
  const paddedViewport: Bounds = {
    x: viewportBounds.x - padding,
    y: viewportBounds.y - padding,
    width: viewportBounds.width + padding * 2,
    height: viewportBounds.height + padding * 2,
  };

  // AABB碰撞检测
  return !(
    elementBounds.x + elementBounds.width < paddedViewport.x ||
    elementBounds.x > paddedViewport.x + paddedViewport.width ||
    elementBounds.y + elementBounds.height < paddedViewport.y ||
    elementBounds.y > paddedViewport.y + paddedViewport.height
  );
}

/**
 * 虚拟化元素列表
 */
export function virtualizeElements(
  elements: CanvasElement[],
  viewport: Viewport,
  options: {
    padding?: number;
    alwaysRenderTypes?: string[]; // 始终渲染的元素类型
  } = {}
): VirtualizationResult {
  const { padding = 100, alwaysRenderTypes = [] } = options;

  const visibleElements = elements.filter(element => {
    // 始终渲染特定类型
    if (alwaysRenderTypes.includes(element.type)) {
      return true;
    }

    // 检查是否在视口内
    return isElementInViewport(element, viewport, padding);
  });

  return {
    visibleElements,
    culledCount: elements.length - visibleElements.length,
    totalCount: elements.length,
  };
}

// ==================== 空间索引 ====================

/**
 * 四叉树节点
 */
class QuadTreeNode {
  bounds: Bounds;
  elements: CanvasElement[];
  children: QuadTreeNode[] | null;
  maxElements: number;
  maxDepth: number;
  depth: number;

  constructor(bounds: Bounds, maxElements: number = 10, maxDepth: number = 5, depth: number = 0) {
    this.bounds = bounds;
    this.elements = [];
    this.children = null;
    this.maxElements = maxElements;
    this.maxDepth = maxDepth;
    this.depth = depth;
  }

  /**
   * 插入元素
   */
  insert(element: CanvasElement): boolean {
    // 检查元素是否在边界内
    if (!this.contains(element)) {
      return false;
    }

    // 如果有子节点，尝试插入子节点
    if (this.children) {
      for (const child of this.children) {
        if (child.insert(element)) {
          return true;
        }
      }
      // 如果子节点都不接受，添加到当前节点
      this.elements.push(element);
      return true;
    }

    // 添加到当前节点
    this.elements.push(element);

    // 检查是否需要分裂
    if (this.elements.length > this.maxElements && this.depth < this.maxDepth) {
      this.split();
    }

    return true;
  }

  /**
   * 分裂节点
   */
  private split() {
    const { x, y, width, height } = this.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    this.children = [
      // 左上
      new QuadTreeNode(
        { x, y, width: halfWidth, height: halfHeight },
        this.maxElements,
        this.maxDepth,
        this.depth + 1
      ),
      // 右上
      new QuadTreeNode(
        { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
        this.maxElements,
        this.maxDepth,
        this.depth + 1
      ),
      // 左下
      new QuadTreeNode(
        { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxElements,
        this.maxDepth,
        this.depth + 1
      ),
      // 右下
      new QuadTreeNode(
        { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxElements,
        this.maxDepth,
        this.depth + 1
      ),
    ];

    // 重新分配元素到子节点
    const elementsToRedistribute = [...this.elements];
    this.elements = [];

    for (const element of elementsToRedistribute) {
      let inserted = false;
      for (const child of this.children) {
        if (child.insert(element)) {
          inserted = true;
          break;
        }
      }
      // 如果子节点都不接受，保留在当前节点
      if (!inserted) {
        this.elements.push(element);
      }
    }
  }

  /**
   * 查询区域内的元素
   */
  query(bounds: Bounds): CanvasElement[] {
    const result: CanvasElement[] = [];

    // 检查是否相交
    if (!this.intersects(bounds)) {
      return result;
    }

    // 添加当前节点的元素
    for (const element of this.elements) {
      if (this.elementIntersectsBounds(element, bounds)) {
        result.push(element);
      }
    }

    // 递归查询子节点
    if (this.children) {
      for (const child of this.children) {
        result.push(...child.query(bounds));
      }
    }

    return result;
  }

  /**
   * 检查元素是否在节点边界内
   */
  private contains(element: CanvasElement): boolean {


    return this.elementIntersectsBounds(element, this.bounds);
  }

  /**
   * 检查节点边界是否与查询边界相交
   */
  private intersects(bounds: Bounds): boolean {
    return !(
      this.bounds.x + this.bounds.width < bounds.x ||
      this.bounds.x > bounds.x + bounds.width ||
      this.bounds.y + this.bounds.height < bounds.y ||
      this.bounds.y > bounds.y + bounds.height
    );
  }

  /**
   * 检查元素是否与边界相交
   */
  private elementIntersectsBounds(element: CanvasElement, bounds: Bounds): boolean {
    const elementBounds: Bounds = {
      x: element.position.x,
      y: element.position.y,
      width: element.size.width,
      height: element.size.height,
    };

    return !(
      elementBounds.x + elementBounds.width < bounds.x ||
      elementBounds.x > bounds.x + bounds.width ||
      // const elementBounds = getElementBounds(element); < bounds.y ||
      elementBounds.y + elementBounds.height < bounds.y ||
      elementBounds.y > bounds.y + bounds.height
    );
  }
}

/**
 * 四叉树空间索引
 */
export class QuadTree {
  private root: QuadTreeNode;

  constructor(bounds: Bounds, maxElements: number = 10, maxDepth: number = 5) {
    this.root = new QuadTreeNode(bounds, maxElements, maxDepth);
  }

  /**
   * 插入元素
   */
  insert(element: CanvasElement): boolean {
    return this.root.insert(element);
  }

  /**
   * 批量插入元素
   */
  insertAll(elements: CanvasElement[]) {
    for (const element of elements) {
      this.insert(element);
    }
  }

  /**
   * 查询区域内的元素
   */
  query(bounds: Bounds): CanvasElement[] {
    return this.root.query(bounds);
  }

  /**
   * 查询视口内的元素
   */
  queryViewport(viewport: Viewport, padding: number = 100): CanvasElement[] {
    const viewportBounds = getViewportBounds(viewport);
    const paddedBounds: Bounds = {
      x: viewportBounds.x - padding,
      y: viewportBounds.y - padding,
      width: viewportBounds.width + padding * 2,
      height: viewportBounds.height + padding * 2,
    };
    return this.query(paddedBounds);
  }
}

// ==================== 辅助函数 ====================

/**
 * 从元素列表构建四叉树
 */
export function buildQuadTree(
  elements: CanvasElement[],
  canvasBounds?: Bounds
): QuadTree {
  // 如果没有提供画布边界，自动计算
  if (!canvasBounds) {
    canvasBounds = calculateBoundingBox(elements);
    // 添加一些边距
    const padding = 1000;
    canvasBounds = {
      x: canvasBounds.x - padding,
      y: canvasBounds.y - padding,
      width: canvasBounds.width + padding * 2,
      height: canvasBounds.height + padding * 2,
    };
  }

  const quadTree = new QuadTree(canvasBounds);
  quadTree.insertAll(elements);
  return quadTree;
}

/**
 * 计算元素列表的包围盒
 */
export function calculateBoundingBox(elements: CanvasElement[]): Bounds {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 1000, height: 1000 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    minX = Math.min(minX, element.position.x);
    minY = Math.min(minY, element.position.y);
    maxX = Math.max(maxX, element.position.x + element.size.width);
    maxY = Math.max(maxY, element.position.y + element.size.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

