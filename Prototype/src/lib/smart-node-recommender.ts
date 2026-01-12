/**
 * LegalMind法律工作台 - 智能节点推荐引擎
 * 
 * 基于画布上下文智能推荐最相关的节点类型
 * 
 * @author LegalMind Team
 * @date 2025-11-04
 */

import { LegalNode } from '../components/workspace/types';

/**
 * 节点类型元数据
 */
export interface NodeTypeMetadata {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: 'core' | 'support' | 'analysis';
  commonlyFollows?: string[]; // 通常在哪些节点之后创建
  requiredFor?: string[]; // 哪些节点需要这个节点
  usageFrequency: number; // 使用频率权重（1-10）
}

/**
 * 推荐结果
 */
export interface NodeRecommendation {
  type: string;
  label: string;
  description: string;
  icon: string;
  score: number; // 推荐分数（0-100）
  reason: string; // 推荐理由
  isRecommended: boolean; // 是否为推荐项
}

/**
 * 节点类型元数据库
 */
const NODE_METADATA: Record<string, NodeTypeMetadata> = {
  'legal-case': {
    type: 'legal-case',
    label: '案件信息',
    description: '创建新的法律案件，记录案件基本信息、当事人、争议焦点等',
    icon: '⚖️',
    category: 'core',
    requiredFor: ['legal-person', 'legal-document', 'legal-hearing'],
    usageFrequency: 10,
  },
  'legal-person': {
    type: 'legal-person',
    label: '人物关系',
    description: '添加案件相关人物，包括原告、被告、证人、律师等',
    icon: '👥',
    category: 'core',
    commonlyFollows: ['legal-case'],
    usageFrequency: 9,
  },
  'legal-document': {
    type: 'legal-document',
    label: '文档管理',
    description: '上传和管理法律文档、证据材料、合同等',
    icon: '📄',
    category: 'support',
    commonlyFollows: ['legal-case', 'legal-person'],
    usageFrequency: 8,
  },
  'legal-timeline': {
    type: 'legal-timeline',
    label: '时间轴',
    description: '创建案件时间线，记录关键事件和里程碑',
    icon: '📅',
    category: 'analysis',
    commonlyFollows: ['legal-case'],
    usageFrequency: 7,
  },
  'legal-hearing': {
    type: 'legal-hearing',
    label: '庭审记录',
    description: '记录庭审信息、参与人员、庭审笔录等',
    icon: '🏛️',
    category: 'core',
    commonlyFollows: ['legal-case', 'legal-person'],
    usageFrequency: 8,
  },
  'legal-mediation': {
    type: 'legal-mediation',
    label: '调解记录',
    description: '记录调解过程、调解方案、和解协议等',
    icon: '🤝',
    category: 'support',
    commonlyFollows: ['legal-case', 'legal-person'],
    usageFrequency: 6,
  },
  'legal-ai': {
    type: 'legal-ai',
    label: 'AI助手',
    description: '使用AI分析案件、生成文书、提供法律建议',
    icon: '🤖',
    category: 'analysis',
    commonlyFollows: ['legal-case', 'legal-document'],
    usageFrequency: 7,
  },
};

/**
 * 智能节点推荐引擎
 */
export class SmartNodeRecommender {
  /**
   * 分析画布上下文并生成推荐
   * 
   * @param nodes 画布上现有的节点
   * @returns 推荐结果列表
   */
  static recommend(
    nodes: LegalNode[],
  ): NodeRecommendation[] {
    // 1. 统计现有节点类型
    const nodeTypeCounts = this.countNodeTypes(nodes);

    // 2. 分析画布状态
    const canvasState = this.analyzeCanvasState(nodes, nodeTypeCounts);

    // 3. 计算每种节点类型的推荐分数
    const recommendations: NodeRecommendation[] = Object.values(NODE_METADATA).map(metadata => {
      const score = this.calculateRecommendationScore(
        metadata,
        nodeTypeCounts,
        canvasState
      );

      const reason = this.generateRecommendationReason(
        metadata,
        nodeTypeCounts,
        canvasState
      );

      return {
        type: metadata.type,
        label: metadata.label,
        description: metadata.description,
        icon: metadata.icon,
        score,
        reason,
        isRecommended: score >= 70, // 分数>=70为推荐项
      };
    });

    // 4. 按分数排序
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations;
  }

  /**
   * 统计节点类型数量
   */
  private static countNodeTypes(nodes: LegalNode[]): Record<string, number> {
    const counts: Record<string, number> = {};

    nodes.forEach(node => {
      counts[node.type] = (counts[node.type] || 0) + 1;
    });

    return counts;
  }

  /**
   * 分析画布状态
   */
  private static analyzeCanvasState(
    nodes: LegalNode[],
    nodeTypeCounts: Record<string, number>
  ): {
    isEmpty: boolean;
    hasCase: boolean;
    hasPerson: boolean;
    hasDocument: boolean;
    totalNodes: number;
    dominantType: string | null;
  } {
    const totalNodes = nodes.length;
    const isEmpty = totalNodes === 0;
    const hasCase = (nodeTypeCounts['legal-case'] || 0) > 0;
    const hasPerson = (nodeTypeCounts['legal-person'] || 0) > 0;
    const hasDocument = (nodeTypeCounts['legal-document'] || 0) > 0;

    // 找出数量最多的节点类型
    let dominantType: string | null = null;
    let maxCount = 0;
    Object.entries(nodeTypeCounts).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    });

    return {
      isEmpty,
      hasCase,
      hasPerson,
      hasDocument,
      totalNodes,
      dominantType,
    };
  }

  /**
   * 计算推荐分数
   */
  private static calculateRecommendationScore(
    metadata: NodeTypeMetadata,
    nodeTypeCounts: Record<string, number>,
    canvasState: any
  ): number {
    let score = 0;

    // 基础分数：使用频率
    score += metadata.usageFrequency * 5;

    // 空画布：优先推荐案件信息
    if (canvasState.isEmpty) {
      if (metadata.type === 'legal-case') {
        score += 30;
      }
      return Math.min(score, 100);
    }

    // 有案件但没有人物：推荐人物关系
    if (canvasState.hasCase && !canvasState.hasPerson) {
      if (metadata.type === 'legal-person') {
        score += 25;
      }
    }

    // 有案件和人物但没有文档：推荐文档管理
    if (canvasState.hasCase && canvasState.hasPerson && !canvasState.hasDocument) {
      if (metadata.type === 'legal-document') {
        score += 20;
      }
    }

    // 根据commonlyFollows规则加分
    if (metadata.commonlyFollows) {
      metadata.commonlyFollows.forEach(followType => {
        if (nodeTypeCounts[followType] > 0) {
          score += 15;
        }
      });
    }

    // 已有该类型节点：降低分数（避免重复）
    const existingCount = nodeTypeCounts[metadata.type] || 0;
    if (existingCount > 0) {
      score -= existingCount * 5;
    }

    // 核心节点类型加分
    if (metadata.category === 'core') {
      score += 10;
    }

    return Math.max(0, Math.min(score, 100));
  }

  /**
   * 生成推荐理由
   */
  private static generateRecommendationReason(
    metadata: NodeTypeMetadata,
    nodeTypeCounts: Record<string, number>,
    canvasState: any
  ): string {
    // 空画布
    if (canvasState.isEmpty) {
      if (metadata.type === 'legal-case') {
        return '开始新案件，建立工作台基础';
      }
      return '创建第一个节点';
    }

    // 有案件但没有人物
    if (canvasState.hasCase && !canvasState.hasPerson && metadata.type === 'legal-person') {
      return '添加案件相关人物信息';
    }

    // 有案件和人物但没有文档
    if (canvasState.hasCase && canvasState.hasPerson && !canvasState.hasDocument && metadata.type === 'legal-document') {
      return '上传案件相关文档和证据';
    }

    // 根据commonlyFollows生成理由
    if (metadata.commonlyFollows) {
      for (const followType of metadata.commonlyFollows) {
        if (nodeTypeCounts[followType] > 0) {
          const followMetadata = NODE_METADATA[followType];
          return `补充${followMetadata.label}的相关信息`;
        }
      }
    }

    // 默认理由
    return metadata.description;
  }
}



