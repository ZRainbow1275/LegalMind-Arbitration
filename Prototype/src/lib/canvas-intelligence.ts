/**
 * 画布智能化服务
 *
 * 提供智能搜索、过滤、高亮、路径等功能
 */

import { LegalNode, Connection } from '../interfaces/legal-elements';
import { CanvasState } from '../interfaces/case-canvas-mapping';

import { performanceMonitor } from './performance-monitor';

/**
 * 搜索结果
 */
export interface SearchResult {
  node: LegalNode;
  score: number; // 匹配分数 (0-1)
  matchedFields: string[]; // 匹配的字段
}

/**
 * 过滤选项
 */
export interface FilterOptions {
  types?: string[]; // 节点类型
  tags?: string[]; // 标签
  dateRange?: { start: string; end: string }; // 日期范围
  roles?: string[]; // 角色
}

/**
 * 路径结果
 */
export interface PathResult {
  nodes: LegalNode[];
  connections: Connection[];
  distance: number; // 路径长度
}

/**
 * 画布智能化服务
 */
export class CanvasIntelligence {
  private searchIndex: Map<string, Set<string>> = new Map(); // 搜索索引
  private indexBuilt = false;

  /**
   * 构建搜索索引
   */
  private buildSearchIndex(nodes: LegalNode[]): void {
    this.searchIndex.clear();

    nodes.forEach(node => {
      // 索引节点名称
      if (node.data.name) {
        this.addToIndex(node.data.name.toLowerCase(), node.id);
      }

      // 索引节点描述
      if (node.data.description) {
        this.addToIndex(node.data.description.toLowerCase(), node.id);
      }

      // 索引节点标签
      if (node.data.tags && Array.isArray(node.data.tags)) {
        node.data.tags.forEach((tag: string) => {
          this.addToIndex(tag.toLowerCase(), node.id);
        });
      }

      // 索引节点角色
      if (node.data.role) {
        this.addToIndex(node.data.role.toLowerCase(), node.id);
      }

      // 索引文档元数据
      if (node.data.metadata) {
        const metadata = node.data.metadata as any;
        if (metadata.fileName) {
          this.addToIndex(metadata.fileName.toLowerCase(), node.id);
        }
        if (metadata.documentType) {
          this.addToIndex(metadata.documentType.toLowerCase(), node.id);
        }
      }
    });

    this.indexBuilt = true;
    console.log(`[CanvasIntelligence] 搜索索引已构建，包含 ${this.searchIndex.size} 个词条`);
  }

  /**
   * 添加到索引
   */
  private addToIndex(text: string, nodeId: string): void {
    // 分词（简单实现：按空格分割）
    const words = text.split(/\s+/);
    words.forEach(word => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word)!.add(nodeId);
    });
  }

  /**
   * 智能搜索（优化版）
   */
  search(state: CanvasState, query: string): SearchResult[] {
    const perfId = performanceMonitor.start('CanvasIntelligence.search', 'operation');
    try {
      if (!query || query.trim() === '') {
        return [];
      }

      // 构建索引（如果还没有）
      if (!this.indexBuilt) {
        this.buildSearchIndex(state.nodes);
      }

      const results: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      // 使用索引快速查找
      const candidateNodeIds = new Set<string>();

      // 查找包含查询词的节点
      this.searchIndex.forEach((nodeIds, word) => {
        if (word.includes(lowerQuery)) {
          nodeIds.forEach(id => candidateNodeIds.add(id));
        }
      });

      // 如果索引没有结果，回退到全文搜索
      if (candidateNodeIds.size === 0) {
        return this.fullTextSearch(state.nodes, lowerQuery);
      }

      // 对候选节点进行详细评分
      const candidateNodes = state.nodes.filter(node => candidateNodeIds.has(node.id));

      candidateNodes.forEach(node => {
        const matchedFields: string[] = [];
        let score = 0;

        // 搜索节点名称
        if (node.data.name && node.data.name.toLowerCase().includes(lowerQuery)) {
          matchedFields.push('name');
          score += 0.5;
        }

        // 搜索节点描述
        if (node.data.description && node.data.description.toLowerCase().includes(lowerQuery)) {
          matchedFields.push('description');
          score += 0.3;
        }

        // 搜索节点标签
        if (node.data.tags && Array.isArray(node.data.tags)) {
          const matchedTags = node.data.tags.filter((tag: string) =>
            tag.toLowerCase().includes(lowerQuery)
          );
          if (matchedTags.length > 0) {
            matchedFields.push('tags');
            score += 0.2 * matchedTags.length;
          }
        }

        // 搜索节点角色
        if (node.data.role && node.data.role.toLowerCase().includes(lowerQuery)) {
          matchedFields.push('role');
          score += 0.4;
        }

        // 搜索文档元数据
        if (node.data.metadata) {
          const metadata = node.data.metadata as any;
          if (metadata.fileName && metadata.fileName.toLowerCase().includes(lowerQuery)) {
            matchedFields.push('fileName');
            score += 0.4;
          }
          if (metadata.documentType && metadata.documentType.toLowerCase().includes(lowerQuery)) {
            matchedFields.push('documentType');
            score += 0.3;
          }
        }

        if (matchedFields.length > 0) {
          results.push({ node, score, matchedFields });
        }
      });

      // 按分数排序
      results.sort((a, b) => b.score - a.score);

      console.log(`[CanvasIntelligence] 搜索"${query}"找到 ${results.length} 个结果`);
      return results;
    } finally {
      performanceMonitor.end(perfId);
    }
  }

  /**
   * 全文搜索（回退方案）
   */
  private fullTextSearch(nodes: LegalNode[], lowerQuery: string): SearchResult[] {
    const results: SearchResult[] = [];

    nodes.forEach(node => {
      const matchedFields: string[] = [];
      let score = 0;

      // 搜索节点名称
      if (node.data.name && node.data.name.toLowerCase().includes(lowerQuery)) {
        matchedFields.push('name');
        score += 0.5;
      }

      // 搜索节点描述
      if (node.data.description && node.data.description.toLowerCase().includes(lowerQuery)) {
        matchedFields.push('description');
        score += 0.3;
      }

      // 搜索节点标签
      if (node.data.tags && Array.isArray(node.data.tags)) {
        const matchedTags = node.data.tags.filter((tag: string) =>
          tag.toLowerCase().includes(lowerQuery)
        );
        if (matchedTags.length > 0) {
          matchedFields.push('tags');
          score += 0.2 * matchedTags.length;
        }
      }

      if (matchedFields.length > 0) {
        results.push({ node, score, matchedFields });
      }
    });

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * 智能过滤
   */
  filter(state: CanvasState, options: FilterOptions): LegalNode[] {
    let filteredNodes = [...state.nodes];

    // 按类型过滤
    if (options.types && options.types.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        options.types!.includes(node.type)
      );
    }

    // 按标签过滤
    if (options.tags && options.tags.length > 0) {
      filteredNodes = filteredNodes.filter(node => {
        if (!node.data.tags || !Array.isArray(node.data.tags)) {
          return false;
        }
        return options.tags!.some(tag => node.data.tags.includes(tag));
      });
    }

    // 按日期范围过滤
    if (options.dateRange) {
      filteredNodes = filteredNodes.filter(node => {
        const nodeDate = node.data.date || node.data.createdAt;
        if (!nodeDate) return false;

        const date = new Date(nodeDate);
        const start = new Date(options.dateRange!.start);
        const end = new Date(options.dateRange!.end);

        return date >= start && date <= end;
      });
    }

    // 按角色过滤
    if (options.roles && options.roles.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        node.data.role && options.roles!.includes(node.data.role)
      );
    }

    console.log(`[CanvasIntelligence] 过滤后剩余 ${filteredNodes.length} 个节点`);
    return filteredNodes;
  }

  /**
   * 智能高亮（查找相关节点）
   */
  highlightRelated(state: CanvasState, nodeId: string): string[] {
    const relatedNodeIds = new Set<string>();
    relatedNodeIds.add(nodeId);

    // 查找直接连接的节点
    state.connections.forEach(conn => {
      if (conn.source === nodeId) {
        relatedNodeIds.add(conn.target);
      }
      if (conn.target === nodeId) {
        relatedNodeIds.add(conn.source);
      }
    });

    // 查找二级连接的节点（可选）
    const firstLevelNodes = Array.from(relatedNodeIds);
    firstLevelNodes.forEach(id => {
      if (id === nodeId) return;

      state.connections.forEach(conn => {
        if (conn.source === id) {
          relatedNodeIds.add(conn.target);
        }
        if (conn.target === id) {
          relatedNodeIds.add(conn.source);
        }
      });
    });

    console.log(`[CanvasIntelligence] 节点 ${nodeId} 有 ${relatedNodeIds.size - 1} 个相关节点`);
    return Array.from(relatedNodeIds);
  }

  /**
   * 智能路径（查找两个节点之间的最短路径）
   */
  findPath(state: CanvasState, sourceId: string, targetId: string): PathResult | null {
    // 使用BFS查找最短路径
    const queue: { nodeId: string; path: string[]; connections: Connection[] }[] = [
      { nodeId: sourceId, path: [sourceId], connections: [] },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const { nodeId, path, connections } = current;

      if (nodeId === targetId) {
        // 找到目标节点
        const nodes = path.map(id => state.nodes.find(n => n.id === id)!).filter(Boolean);
        console.log(`[CanvasIntelligence] 找到路径，长度: ${connections.length}`);
        return {
          nodes,
          connections,
          distance: connections.length,
        };
      }

      if (visited.has(nodeId)) {
        continue;
      }

      visited.add(nodeId);

      // 查找相邻节点
      state.connections.forEach(conn => {
        let nextNodeId: string | null = null;
        let connection: Connection | null = null;

        if (conn.source === nodeId && !visited.has(conn.target)) {
          nextNodeId = conn.target;
          connection = conn;
        } else if (conn.target === nodeId && !visited.has(conn.source)) {
          nextNodeId = conn.source;
          connection = conn;
        }

        if (nextNodeId && connection) {
          queue.push({
            nodeId: nextNodeId,
            path: [...path, nextNodeId],
            connections: [...connections, connection],
          });
        }
      });
    }

    console.log(`[CanvasIntelligence] 未找到从 ${sourceId} 到 ${targetId} 的路径`);
    return null;
  }

  /**
   * 智能缩放（自动适应内容）
   */
  autoZoom(state: CanvasState, containerWidth: number, containerHeight: number): {
    zoom: number;
    x: number;
    y: number;
  } {
    if (state.nodes.length === 0) {
      return { zoom: 1, x: 0, y: 0 };
    }

    // 计算所有节点的边界框
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    state.nodes.forEach(node => {
      const x = node.position.x;
      const y = node.position.y;
      const width = 300; // 假设节点宽度
      const height = 200; // 假设节点高度

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    // 计算内容的宽度和高度
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // 计算缩放比例（留10%边距）
    const zoomX = (containerWidth * 0.9) / contentWidth;
    const zoomY = (containerHeight * 0.9) / contentHeight;
    const zoom = Math.min(zoomX, zoomY, 1); // 最大缩放为1

    // 计算居中偏移
    const x = (containerWidth - contentWidth * zoom) / 2 - minX * zoom;
    const y = (containerHeight - contentHeight * zoom) / 2 - minY * zoom;

    console.log(`[CanvasIntelligence] 自动缩放: zoom=${zoom.toFixed(2)}, x=${x.toFixed(0)}, y=${y.toFixed(0)}`);
    return { zoom, x, y };
  }

  /**
   * 智能对齐
   */
  alignNodes(nodes: LegalNode[], direction: 'horizontal' | 'vertical'): LegalNode[] {
    if (nodes.length < 2) return nodes;

    const alignedNodes = [...nodes];

    if (direction === 'horizontal') {
      // 水平对齐（对齐到第一个节点的Y坐标）
      const targetY = nodes[0].position.y;
      alignedNodes.forEach(node => {
        node.position.y = targetY;
      });
    } else {
      // 垂直对齐（对齐到第一个节点的X坐标）
      const targetX = nodes[0].position.x;
      alignedNodes.forEach(node => {
        node.position.x = targetX;
      });
    }

    console.log(`[CanvasIntelligence] ${direction}对齐 ${nodes.length} 个节点`);
    return alignedNodes;
  }

  /**
   * 智能分布
   */
  distributeNodes(nodes: LegalNode[], direction: 'horizontal' | 'vertical', spacing: number = 350): LegalNode[] {
    if (nodes.length < 2) return nodes;

    const distributedNodes = [...nodes];

    // 按位置排序
    if (direction === 'horizontal') {
      distributedNodes.sort((a, b) => a.position.x - b.position.x);
    } else {
      distributedNodes.sort((a, b) => a.position.y - b.position.y);
    }

    // 均匀分布
    distributedNodes.forEach((node, index) => {
      if (direction === 'horizontal') {
        node.position.x = distributedNodes[0].position.x + index * spacing;
      } else {
        node.position.y = distributedNodes[0].position.y + index * spacing;
      }
    });

    console.log(`[CanvasIntelligence] ${direction}分布 ${nodes.length} 个节点`);
    return distributedNodes;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // 清理资源
  }
}

/**
 * 全局画布智能化实例
 */
export const canvasIntelligence = new CanvasIntelligence();

