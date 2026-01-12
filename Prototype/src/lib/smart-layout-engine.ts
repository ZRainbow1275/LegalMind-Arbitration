/**
 * 智能布局引擎
 *
 * 提供多种智能布局算法
 */

import { LegalNode, Connection } from '../interfaces/legal-elements';


/**
 * 布局类型
 */
export type LayoutType =
  | 'hierarchical'  // 层次布局
  | 'force'         // 力导向布局
  | 'circular'      // 环形布局
  | 'grid'          // 网格布局
  | 'tree'          // 树形布局
  | 'radial';       // 径向布局

/**
 * 布局选项
 */
export interface LayoutOptions {
  type: LayoutType;
  spacing?: number;      // 节点间距
  centerX?: number;      // 中心X坐标
  centerY?: number;      // 中心Y坐标
  animated?: boolean;    // 是否动画
}

/**
 * 智能布局引擎
 */
export class SmartLayoutEngine {
  /**
   * 应用布局
   */
  applyLayout(
    nodes: LegalNode[],
    connections: Connection[],
    options: LayoutOptions
  ): LegalNode[] {
    console.log(`[SmartLayoutEngine] 应用 ${options.type} 布局`);

    switch (options.type) {
      case 'hierarchical':
        return this.hierarchicalLayout(nodes, connections, options);
      case 'force':
        return this.forceLayout(nodes, connections, options);
      case 'circular':
        return this.circularLayout(nodes, options);
      case 'grid':
        return this.gridLayout(nodes, options);
      case 'tree':
        return this.treeLayout(nodes, connections, options);
      case 'radial':
        return this.radialLayout(nodes, connections, options);
      default:
        return nodes;
    }
  }

  /**
   * 层次布局（适合案件-当事人-文档结构）
   */
  private hierarchicalLayout(
    nodes: LegalNode[],
    _connections: Connection[],
    options: LayoutOptions
  ): LegalNode[] {
    const spacing = options.spacing || 350;
    const centerX = options.centerX || 500;
    const centerY = options.centerY || 300;

    // 按节点类型分层
    const layers: Map<number, LegalNode[]> = new Map();

    // 第0层：案件节点
    const caseNodes = nodes.filter(n => (n.type as string) === 'legal-case');
    layers.set(0, caseNodes);

    // 第1层：当事人节点
    const personNodes = nodes.filter(n => (n.type as string) === 'legal-person');
    layers.set(1, personNodes);

    // 第2层：文档节点
    const documentNodes = nodes.filter(n => (n.type as string) === 'legal-document');
    layers.set(2, documentNodes);

    // 第3层：庭审节点
    const hearingNodes = nodes.filter(n => (n.type as string) === 'legal-hearing');
    layers.set(3, hearingNodes);

    // 第4层：调解节点
    const mediationNodes = nodes.filter(n => (n.type as string) === 'legal-mediation');
    layers.set(4, mediationNodes);

    // 第5层：时间线节点
    const timelineNodes = nodes.filter(n => (n.type as string) === 'legal-timeline');
    layers.set(5, timelineNodes);

    // 布局每一层
    const layoutedNodes: LegalNode[] = [];
    let currentY = centerY;

    layers.forEach((layerNodes, _layerIndex) => {
      if (layerNodes.length === 0) return;

      const layerWidth = (layerNodes.length - 1) * spacing;
      let currentX = centerX - layerWidth / 2;

      layerNodes.forEach(node => {
        (node as any).position = { x: currentX, y: currentY };
        layoutedNodes.push(node);
        currentX += spacing;
      });

      currentY += 250; // 层间距
    });

    return layoutedNodes;
  }

  /**
   * 力导向布局（适合复杂关系网络）- 优化版
   */
  private forceLayout(
    nodes: LegalNode[],
    connections: Connection[],
    options: LayoutOptions
  ): LegalNode[] {
    const centerX = options.centerX || 500;
    const centerY = options.centerY || 300;

    // 根据节点数量动态调整迭代次数
    const iterations = Math.min(50, Math.max(20, 100 - nodes.length)); // 20-50次迭代
    const k = 200; // 理想距离
    const c = 0.15; // 冷却系数（提高以加快收敛）

    // 初始化随机位置
    const layoutedNodes = nodes.map(node => ({
      ...node,
      position: {
        x: centerX + (Math.random() - 0.5) * 400,
        y: centerY + (Math.random() - 0.5) * 400,
      },
      vx: 0,
      vy: 0,
    })) as any[];

    console.log(`[SmartLayoutEngine] 力导向布局：${nodes.length}个节点，${iterations}次迭代`);

    // 力导向迭代
    for (let iter = 0; iter < iterations; iter++) {
      const temperature = 1 - iter / iterations;

      // 计算斥力（所有节点对之间）- 优化：只计算距离较近的节点
      for (let i = 0; i < layoutedNodes.length; i++) {
        for (let j = i + 1; j < layoutedNodes.length; j++) {
          const node1 = layoutedNodes[i];
          const node2 = layoutedNodes[j];

          const dx = node2.position.x - node1.position.x;
          const dy = node2.position.y - node1.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;

          // 优化：只对距离小于3倍理想距离的节点计算斥力
          if (distance < k * 3) {
            const force = (k * k) / distance;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            node1.vx -= fx;
            node1.vy -= fy;
            node2.vx += fx;
            node2.vy += fy;
          }
        }
      }

      // 计算引力（连接的节点对之间）
      connections.forEach(conn => {
        const node1 = layoutedNodes.find(n => n.id === conn.source);
        const node2 = layoutedNodes.find(n => n.id === conn.target);

        if (!node1 || !node2) return;

        const dx = node2.position.x - node1.position.x;
        const dy = node2.position.y - node1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = (distance * distance) / k;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        node1.vx += fx;
        node1.vy += fy;
        node2.vx -= fx;
        node2.vy -= fy;
      });

      // 更新位置
      layoutedNodes.forEach(node => {
        node.position.x += node.vx * temperature * c;
        node.position.y += node.vy * temperature * c;
        node.vx = 0;
        node.vy = 0;
      });
    }

    console.log(`[SmartLayoutEngine] 力导向布局完成`);
    return layoutedNodes as LegalNode[];
  }

  /**
   * 环形布局
   */
  private circularLayout(nodes: LegalNode[], options: LayoutOptions): LegalNode[] {
    const centerX = options.centerX || 500;
    const centerY = options.centerY || 300;
    const radius = 300;

    const layoutedNodes = nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      return {
        ...node,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
      };
    }) as LegalNode[];

    return layoutedNodes;
  }

  /**
   * 网格布局
   */
  private gridLayout(nodes: LegalNode[], options: LayoutOptions): LegalNode[] {
    const spacing = options.spacing || 350;
    const centerX = options.centerX || 500;
    const centerY = options.centerY || 300;

    const cols = Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / cols);

    const gridWidth = (cols - 1) * spacing;
    const gridHeight = (rows - 1) * spacing;
    const startX = centerX - gridWidth / 2;
    const startY = centerY - gridHeight / 2;

    const layoutedNodes = nodes.map((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      return {
        ...node,
        position: {
          x: startX + col * spacing,
          y: startY + row * spacing,
        },
      };
    }) as LegalNode[];

    return layoutedNodes;
  }

  /**
   * 树形布局
   */
  private treeLayout(
    nodes: LegalNode[],
    connections: Connection[],
    options: LayoutOptions
  ): LegalNode[] {
    const spacing = options.spacing || 350;
    const centerX = options.centerX || 500;
    const centerY = options.centerY || 100;

    // 查找根节点（案件节点）
    const rootNode = nodes.find(n => (n.type as string) === 'legal-case');
    if (!rootNode) {
      return this.gridLayout(nodes, options);
    }

    // 构建树结构
    const tree = this.buildTree(rootNode.id, nodes, connections);

    // 布局树
    const layoutedNodes: LegalNode[] = [];
    this.layoutTree(tree, centerX, centerY, spacing, layoutedNodes);

    return layoutedNodes;
  }

  /**
   * 径向布局
   */
  private radialLayout(
    nodes: LegalNode[],
    _connections: Connection[],
    options: LayoutOptions
  ): LegalNode[] {
    const centerX = options.centerX || 500;
    const centerY = options.centerY || 300;

    // 查找中心节点（案件节点）
    const centerNode = nodes.find(n => (n.type as string) === 'legal-case');
    if (!centerNode) {
      return this.circularLayout(nodes, options);
    }

    // 中心节点
    (centerNode as any).position = { x: centerX, y: centerY };

    // 其他节点按层级分布
    const otherNodes = nodes.filter(n => n.id !== centerNode.id);
    const radius = 300;

    const layoutedNodes = [centerNode, ...otherNodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / otherNodes.length;
      return {
        ...node,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
      };
    })] as LegalNode[];

    return layoutedNodes;
  }

  /**
   * 构建树结构
   */
  private buildTree(
    rootId: string,
    nodes: LegalNode[],
    connections: Connection[]
  ): any {
    const rootNode = nodes.find(n => n.id === rootId);
    if (!rootNode) return null;

    const children = connections
      .filter(c => c.source === rootId)
      .map(c => this.buildTree(c.target, nodes, connections))
      .filter(Boolean);

    return { node: rootNode, children };
  }

  /**
   * 布局树
   */
  private layoutTree(
    tree: any,
    x: number,
    y: number,
    spacing: number,
    result: LegalNode[]
  ): number {
    if (!tree) return 0;

    (tree.node as any).position = { x, y };
    result.push(tree.node);

    if (tree.children.length === 0) {
      return spacing;
    }

    let currentX = x;
    tree.children.forEach((child: any) => {
      const width = this.layoutTree(child, currentX, y + 250, spacing, result);
      currentX += width;
    });

    const totalWidth = currentX - x;
    (tree.node as any).position.x = x + totalWidth / 2 - spacing / 2;

    return totalWidth;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // 清理资源
  }
}

/**
 * 全局智能布局引擎实例
 */
export const smartLayoutEngine = new SmartLayoutEngine();

