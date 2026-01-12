/**
 * 法律关系分析引擎
 * 自动分析节点间的法律关系，生成关系图谱
 */

import { LegalNode } from '../components/DrawnixLegalWorkspace';

// 法律关系类型
export type LegalRelationType =
  | 'plaintiff-defendant'    // 原告-被告
  | 'evidence-support'       // 证据支持
  | 'evidence-against'       // 证据反对
  | 'legal-basis'            // 法律依据
  | 'hearing-participant'    // 庭审参与
  | 'document-reference'     // 文档引用
  | 'timeline-sequence'      // 时间顺序
  | 'ai-analysis';           // AI分析

// 法律关系
export interface LegalRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: LegalRelationType;
  strength: number;          // 关系强度 0-1
  description: string;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    confidence?: number;     // AI分析置信度
    [key: string]: any;
  };
}

// 关系路径
export interface RelationshipPath {
  nodes: string[];           // 节点ID序列
  relationships: LegalRelationship[];
  totalStrength: number;     // 路径总强度
  description: string;
}

// 关系图谱
export interface LegalRelationshipGraph {
  nodes: LegalNode[];
  relationships: LegalRelationship[];
  paths: RelationshipPath[];
  clusters: string[][];      // 节点聚类
}

/**
 * 法律关系分析器
 */
export class LegalRelationshipAnalyzer {
  /**
   * 分析节点间的法律关系
   */
  static analyzeRelationships(nodes: LegalNode[]): LegalRelationship[] {
    const relationships: LegalRelationship[] = [];

    // 1. 从节点连接中提取关系
    nodes.forEach(node => {
      node.data.connections.forEach(connId => {
        const targetNode = nodes.find(n => n.id === connId);
        if (!targetNode) return;

        const relationship = this.inferRelationshipType(node, targetNode, undefined);
        if (relationship) {
          relationships.push(relationship);
        }
      });
    });

    // 2. 基于节点类型推断隐式关系
    const implicitRelationships = this.inferImplicitRelationships(nodes);
    relationships.push(...implicitRelationships);

    // 3. 去重
    return this.deduplicateRelationships(relationships);
  }

  /**
   * 推断关系类型
   */
  private static inferRelationshipType(
    source: LegalNode,
    target: LegalNode,
    label?: string
  ): LegalRelationship | null {
    const relationshipId = `rel-${source.id}-${target.id}`;

    // 根据节点类型和连接标签推断关系类型
    if (source.type === 'legal-person' && target.type === 'legal-person') {
      return {
        id: relationshipId,
        sourceId: source.id,
        targetId: target.id,
        type: 'plaintiff-defendant',
        strength: 0.9,
        description: `${source.data.title} 与 ${target.data.title} 的当事人关系`,
      };
    }

    if (source.type === 'legal-document' && target.type === 'legal-case') {
      const isSupport = label?.includes('支持') || label?.includes('证明');
      const isAgainst = label?.includes('反对') || label?.includes('质疑');

      return {
        id: relationshipId,
        sourceId: source.id,
        targetId: target.id,
        type: isAgainst ? 'evidence-against' : 'evidence-support',
        strength: isSupport ? 0.8 : isAgainst ? 0.7 : 0.6,
        description: `${source.data.title} ${isAgainst ? '反对' : '支持'} ${target.data.title}`,
      };
    }

    if (source.type === 'legal-hearing' && target.type === 'legal-person') {
      return {
        id: relationshipId,
        sourceId: source.id,
        targetId: target.id,
        type: 'hearing-participant',
        strength: 0.7,
        description: `${target.data.title} 参与 ${source.data.title}`,
      };
    }

    if (source.type === 'legal-ai-assistant' && target.type === 'legal-case') {
      return {
        id: relationshipId,
        sourceId: source.id,
        targetId: target.id,
        type: 'ai-analysis',
        strength: 0.6,
        description: `AI分析 ${target.data.title}`,
        metadata: {
          confidence: 0.85,
        },
      };
    }

    // 默认关系
    return {
      id: relationshipId,
      sourceId: source.id,
      targetId: target.id,
      type: 'document-reference',
      strength: 0.5,
      description: `${source.data.title} 关联 ${target.data.title}`,
    };
  }

  /**
   * 推断隐式关系
   */
  private static inferImplicitRelationships(nodes: LegalNode[]): LegalRelationship[] {
    const relationships: LegalRelationship[] = [];

    // 按时间顺序推断时间线关系
    const sortedNodes = [...nodes].sort((a, b) => {
      const timeA = new Date(a.data.createdAt || 0).getTime();
      const timeB = new Date(b.data.createdAt || 0).getTime();
      return timeA - timeB;
    });

    for (let i = 0; i < sortedNodes.length - 1; i++) {
      const current = sortedNodes[i];
      const next = sortedNodes[i + 1];

      // 只为相关类型的节点创建时间线关系
      if (
        (current.type === 'legal-hearing' || current.type === 'legal-timeline') &&
        (next.type === 'legal-hearing' || next.type === 'legal-timeline')
      ) {
        relationships.push({
          id: `timeline-${current.id}-${next.id}`,
          sourceId: current.id,
          targetId: next.id,
          type: 'timeline-sequence',
          strength: 0.4,
          description: `${current.data.title} 发生在 ${next.data.title} 之前`,
        });
      }
    }

    return relationships;
  }

  /**
   * 去重关系
   */
  private static deduplicateRelationships(
    relationships: LegalRelationship[]
  ): LegalRelationship[] {
    const seen = new Set<string>();
    return relationships.filter(rel => {
      const key = `${rel.sourceId}-${rel.targetId}-${rel.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * 查找关键路径
   */
  static findKeyPaths(
    relationships: LegalRelationship[],
    startNodeId?: string,
    endNodeId?: string
  ): RelationshipPath[] {
    const paths: RelationshipPath[] = [];

    // 如果指定了起点和终点，查找所有路径
    if (startNodeId && endNodeId) {
      const allPaths = this.findAllPaths(startNodeId, endNodeId, relationships);
      paths.push(...allPaths);
    } else {
      // 否则，查找最强的关系链
      const strongRelationships = relationships
        .filter(rel => rel.strength >= 0.7)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 5);

      strongRelationships.forEach(rel => {
        const path: RelationshipPath = {
          nodes: [rel.sourceId, rel.targetId],
          relationships: [rel],
          totalStrength: rel.strength,
          description: rel.description,
        };
        paths.push(path);
      });
    }

    return paths.sort((a, b) => b.totalStrength - a.totalStrength);
  }

  /**
   * 查找两个节点间的所有路径（DFS）
   */
  private static findAllPaths(
    startId: string,
    endId: string,
    relationships: LegalRelationship[],
    visited: Set<string> = new Set(),
    currentPath: LegalRelationship[] = []
  ): RelationshipPath[] {
    if (startId === endId) {
      return [{
        nodes: [startId, ...currentPath.map(r => r.targetId)],
        relationships: currentPath,
        totalStrength: currentPath.reduce((sum, r) => sum + r.strength, 0) / (currentPath.length || 1),
        description: currentPath.map(r => r.description).join(' → '),
      }];
    }

    visited.add(startId);
    const paths: RelationshipPath[] = [];

    const outgoingRels = relationships.filter(r => r.sourceId === startId && !visited.has(r.targetId));

    for (const rel of outgoingRels) {
      const subPaths = this.findAllPaths(
        rel.targetId,
        endId,
        relationships,
        new Set(visited),
        [...currentPath, rel]
      );
      paths.push(...subPaths);
    }

    return paths;
  }

  /**
   * 节点聚类（基于关系强度）
   */
  static clusterNodes(nodes: LegalNode[], relationships: LegalRelationship[]): string[][] {
    const clusters: string[][] = [];
    const visited = new Set<string>();

    nodes.forEach(node => {
      if (visited.has(node.id)) return;

      const cluster = this.getConnectedNodes(node.id, relationships, visited);
      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    });

    return clusters;
  }

  /**
   * 获取连通的节点
   */
  private static getConnectedNodes(
    nodeId: string,
    relationships: LegalRelationship[],
    visited: Set<string>
  ): string[] {
    const cluster: string[] = [nodeId];
    visited.add(nodeId);

    const connectedRels = relationships.filter(
      r => (r.sourceId === nodeId || r.targetId === nodeId) && r.strength >= 0.6
    );

    connectedRels.forEach(rel => {
      const nextId = rel.sourceId === nodeId ? rel.targetId : rel.sourceId;
      if (!visited.has(nextId)) {
        cluster.push(...this.getConnectedNodes(nextId, relationships, visited));
      }
    });

    return cluster;
  }

  /**
   * 生成完整的关系图谱
   */
  static generateGraph(nodes: LegalNode[]): LegalRelationshipGraph {
    const relationships = this.analyzeRelationships(nodes);
    const paths = this.findKeyPaths(relationships);
    const clusters = this.clusterNodes(nodes, relationships);

    return {
      nodes,
      relationships,
      paths,
      clusters,
    };
  }
}

