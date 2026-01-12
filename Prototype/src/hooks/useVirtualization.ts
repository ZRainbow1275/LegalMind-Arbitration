/**
 * 虚拟化渲染Hook
 * 只渲染可见区域的节点，提升大规模节点的性能
 */

import { useMemo } from 'react';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface LegalNode {
  id: string;
  position: Position;
  size?: Size;
  [key: string]: any;
}

interface VirtualizationOptions {
  viewport: Viewport;
  canvasSize: Size;
  padding?: number; // 额外渲染的边距（避免滚动时闪烁）
}

/**
 * 计算可见区域
 */
function calculateVisibleBounds(
  viewport: Viewport | undefined,
  canvasSize: Size,
  padding: number = 200
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  // 如果viewport未定义，返回默认边界（显示所有内容）
  if (!viewport || viewport.x === undefined || viewport.y === undefined) {
    return {
      minX: -10000,
      maxX: 10000,
      minY: -10000,
      maxY: 10000
    };
  }

  const { x, y, zoom } = viewport;

  // 计算可见区域的边界（考虑缩放）
  const minX = -x / zoom - padding;
  const maxX = (-x + canvasSize.width) / zoom + padding;
  const minY = -y / zoom - padding;
  const maxY = (-y + canvasSize.height) / zoom + padding;

  return { minX, maxX, minY, maxY };
}

/**
 * 检查节点是否在可见区域内
 */
function isNodeVisible(
  node: LegalNode,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): boolean {
  // 安全检查：确保node.data和node.data.position存在
  if (!node?.data?.position) {
    console.error('[Virtualization Error] 节点缺少position数据:', node);
    return false;
  }

  const nodeSize = node.size || { width: 280, height: 200 };
  const nodeMinX = node.data.position.x;
  const nodeMaxX = node.data.position.x + nodeSize.width;
  const nodeMinY = node.data.position.y;
  const nodeMaxY = node.data.position.y + nodeSize.height;

  // 检查节点是否与可见区域相交
  return !(
    nodeMaxX < bounds.minX ||
    nodeMinX > bounds.maxX ||
    nodeMaxY < bounds.minY ||
    nodeMinY > bounds.maxY
  );
}

/**
 * 虚拟化渲染Hook
 * 
 * @param nodes - 所有节点
 * @param options - 虚拟化选项
 * @returns 可见节点列表
 */
export function useVirtualization(
  nodes: LegalNode[],
  options: VirtualizationOptions
): {
  visibleNodes: LegalNode[];
  totalNodes: number;
  visibleCount: number;
  culledCount: number;
} {
  const { viewport, canvasSize, padding = 200 } = options;

  const result = useMemo(() => {
    // 安全检查：确保nodes是数组
    if (!Array.isArray(nodes)) {
      console.error('[useVirtualization] nodes不是数组:', nodes);
      return {
        visibleNodes: [],
        totalNodes: 0,
        visibleCount: 0,
        culledCount: 0,
      };
    }

    // 计算可见区域边界
    const bounds = calculateVisibleBounds(viewport, canvasSize, padding);

    // 过滤出可见节点
    const visibleNodes = nodes.filter(node => isNodeVisible(node, bounds));

    return {
      visibleNodes,
      totalNodes: nodes.length,
      visibleCount: visibleNodes.length,
      culledCount: nodes.length - visibleNodes.length,
    };
  }, [nodes, viewport, canvasSize, padding]);

  return result;
}

/**
 * 连接线虚拟化Hook
 * 只渲染连接到可见节点的连接线
 */
export function useConnectionVirtualization(
  connections: Array<{ id: string; source: string; target: string; [key: string]: any }>,
  visibleNodeIds: Set<string>
): {
  visibleConnections: Array<{ id: string; source: string; target: string; [key: string]: any }>;
  totalConnections: number;
  visibleCount: number;
  culledCount: number;
} {
  const result = useMemo(() => {
    // 安全检查：确保connections是数组
    if (!Array.isArray(connections)) {
      console.error('[useConnectionVirtualization] connections不是数组:', connections);
      return {
        visibleConnections: [],
        totalConnections: 0,
        visibleCount: 0,
        culledCount: 0,
      };
    }

    // 过滤出连接到可见节点的连接线
    const visibleConnections = connections.filter(
      conn => visibleNodeIds.has(conn.source) || visibleNodeIds.has(conn.target)
    );

    return {
      visibleConnections,
      totalConnections: connections.length,
      visibleCount: visibleConnections.length,
      culledCount: connections.length - visibleConnections.length,
    };
  }, [connections, visibleNodeIds]);

  return result;
}

/**
 * 性能统计Hook
 * 用于监控虚拟化的性能提升
 */
export function useVirtualizationStats(
  totalNodes: number,
  visibleNodes: number,
  totalConnections: number,
  visibleConnections: number
): {
  nodeCullingRate: number;
  connectionCullingRate: number;
  estimatedPerformanceGain: number;
} {
  return useMemo(() => {
    const nodeCullingRate = totalNodes > 0 
      ? ((totalNodes - visibleNodes) / totalNodes) * 100 
      : 0;
    
    const connectionCullingRate = totalConnections > 0
      ? ((totalConnections - visibleConnections) / totalConnections) * 100
      : 0;
    
    // 估算性能提升（基于渲染节点数的减少）
    const estimatedPerformanceGain = totalNodes > 0
      ? ((totalNodes - visibleNodes) / totalNodes) * 100
      : 0;
    
    return {
      nodeCullingRate: Math.round(nodeCullingRate * 10) / 10,
      connectionCullingRate: Math.round(connectionCullingRate * 10) / 10,
      estimatedPerformanceGain: Math.round(estimatedPerformanceGain * 10) / 10,
    };
  }, [totalNodes, visibleNodes, totalConnections, visibleConnections]);
}

/**
 * 空间索引Hook（用于快速查找可见节点）
 * 使用四叉树数据结构优化大规模节点的查找性能
 */
interface QuadTreeNode {
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  nodes: LegalNode[];
  children?: QuadTreeNode[];
}

function buildQuadTree(
  nodes: LegalNode[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  maxNodesPerQuad: number = 10,
  maxDepth: number = 5,
  currentDepth: number = 0
): QuadTreeNode {
  const quadTree: QuadTreeNode = {
    bounds,
    nodes: [],
  };
  
  // 如果节点数量少于阈值或达到最大深度，直接存储节点
  if (nodes.length <= maxNodesPerQuad || currentDepth >= maxDepth) {
    quadTree.nodes = nodes;
    return quadTree;
  }
  
  // 分割成四个子区域
  const midX = (bounds.minX + bounds.maxX) / 2;
  const midY = (bounds.minY + bounds.maxY) / 2;
  
  const quadrants = [
    { minX: bounds.minX, maxX: midX, minY: bounds.minY, maxY: midY }, // 左上
    { minX: midX, maxX: bounds.maxX, minY: bounds.minY, maxY: midY }, // 右上
    { minX: bounds.minX, maxX: midX, minY: midY, maxY: bounds.maxY }, // 左下
    { minX: midX, maxX: bounds.maxX, minY: midY, maxY: bounds.maxY }, // 右下
  ];
  
  quadTree.children = quadrants.map(quadBounds => {
    const quadNodes = nodes.filter(node => isNodeVisible(node, quadBounds));
    return buildQuadTree(quadNodes, quadBounds, maxNodesPerQuad, maxDepth, currentDepth + 1);
  });
  
  return quadTree;
}

function queryQuadTree(
  quadTree: QuadTreeNode,
  queryBounds: { minX: number; maxX: number; minY: number; maxY: number }
): LegalNode[] {
  // 检查查询区域是否与当前节点的边界相交
  if (
    queryBounds.maxX < quadTree.bounds.minX ||
    queryBounds.minX > quadTree.bounds.maxX ||
    queryBounds.maxY < quadTree.bounds.minY ||
    queryBounds.minY > quadTree.bounds.maxY
  ) {
    return [];
  }
  
  // 如果是叶子节点，返回所有节点
  if (!quadTree.children) {
    return quadTree.nodes.filter(node => isNodeVisible(node, queryBounds));
  }
  
  // 递归查询子节点
  return quadTree.children.flatMap(child => queryQuadTree(child, queryBounds));
}

/**
 * 使用四叉树优化的虚拟化Hook
 * 适用于超大规模节点（1000+）
 */
export function useQuadTreeVirtualization(
  nodes: LegalNode[],
  options: VirtualizationOptions
): {
  visibleNodes: LegalNode[];
  totalNodes: number;
  visibleCount: number;
  culledCount: number;
} {
  const { viewport, canvasSize, padding = 200 } = options;
  
  const result = useMemo(() => {
    if (nodes.length === 0) {
      return {
        visibleNodes: [],
        totalNodes: 0,
        visibleCount: 0,
        culledCount: 0,
      };
    }
    
    // 计算所有节点的边界
    const allBounds = nodes.reduce(
      (bounds, node) => {
        // 安全检查：确保node.data和node.data.position存在
        if (!node?.data?.position) {
          console.error('[Virtualization Error] 节点缺少position数据:', node);
          return bounds;
        }

        const nodeSize = node.size || { width: 280, height: 200 };
        return {
          minX: Math.min(bounds.minX, node.data.position.x),
          maxX: Math.max(bounds.maxX, node.data.position.x + nodeSize.width),
          minY: Math.min(bounds.minY, node.data.position.y),
          maxY: Math.max(bounds.maxY, node.data.position.y + nodeSize.height),
        };
      },
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );
    
    // 构建四叉树
    const quadTree = buildQuadTree(nodes, allBounds);
    
    // 计算可见区域边界
    const queryBounds = calculateVisibleBounds(viewport, canvasSize, padding);
    
    // 查询可见节点
    const visibleNodes = queryQuadTree(quadTree, queryBounds);
    
    return {
      visibleNodes,
      totalNodes: nodes.length,
      visibleCount: visibleNodes.length,
      culledCount: nodes.length - visibleNodes.length,
    };
  }, [nodes, viewport, canvasSize, padding]);
  
  return result;
}

