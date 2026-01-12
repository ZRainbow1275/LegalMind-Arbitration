/**
 * 证据链分析引擎 V2
 * 分析证据之间的逻辑关系，评估证据强度
 */

import { create } from 'zustand';
import { LegalNode } from '../components/DrawnixLegalWorkspace';
import { Connection } from '../components/workspace/types';

// 证据类型
export type EvidenceType =
  | 'direct'      // 直接证据
  | 'indirect'    // 间接证据
  | 'physical'    // 物证
  | 'documentary' // 书证
  | 'testimony'   // 证言
  | 'expert'      // 鉴定意见
  | 'audio-video' // 视听资料
  | 'electronic'; // 电子数据

// 证据关系类型
export type EvidenceRelationType =
  | 'support'     // 支持
  | 'contradict'  // 矛盾
  | 'corroborate' // 佐证
  | 'weaken'      // 削弱
  | 'neutral';    // 中立

// 证据节点
export interface EvidenceNode {
  id: string;
  title: string;
  description: string;
  type: EvidenceType;
  strength: number;        // 证据强度 0-1
  reliability: number;     // 可靠性 0-1
  relevance: number;       // 相关性 0-1
  metadata?: {
    source?: string;       // 来源
    date?: string;         // 日期
    authenticator?: string; // 认证人
    [key: string]: any;
  };
}

// 证据关系
export interface EvidenceRelation {
  id: string;
  sourceId: string;
  targetId: string;
  type: EvidenceRelationType;
  strength: number;        // 关系强度 0-1
  description: string;
}

// 证据链
export interface EvidenceChain {
  id: string;
  evidences: EvidenceNode[];
  relations: EvidenceRelation[];
  conclusion: string;
  overallStrength: number; // 整体强度 0-1
  completeness: number;    // 完整性 0-1
  consistency: number;     // 一致性 0-1
}

// 证据分析结果
export interface EvidenceAnalysisResult {
  evidences: EvidenceNode[];
  relations: EvidenceRelation[];
  chains: EvidenceChain[];
  supportingEvidence: EvidenceNode[];
  contradictingEvidence: EvidenceNode[];
  weaknesses: string[];
  recommendations: string[];
}

/**
 * 证据链分析器 V2
 */
export class EvidenceChainAnalyzerV2 {
  /**
   * 从节点中提取证据
   */
  static extractEvidences(nodes: LegalNode[]): EvidenceNode[] {
    return nodes
      .filter(node => node.type === 'legal-document')
      .map(node => this.nodeToEvidence(node));
  }

  /**
   * 节点转证据
   */
  private static nodeToEvidence(node: LegalNode): EvidenceNode {
    // 根据节点描述推断证据类型
    const description = node.data.description.toLowerCase();
    let type: EvidenceType = 'documentary';

    if (description.includes('物证') || description.includes('实物')) {
      type = 'physical';
    } else if (description.includes('证言') || description.includes('证词')) {
      type = 'testimony';
    } else if (description.includes('鉴定') || description.includes('专家')) {
      type = 'expert';
    } else if (description.includes('视频') || description.includes('音频') || description.includes('录音')) {
      type = 'audio-video';
    } else if (description.includes('电子') || description.includes('数据')) {
      type = 'electronic';
    }

    // 计算证据强度（基于连接数和状态）
    const connectionCount = node.data.connections.length;
    const baseStrength = 0.5;
    const connectionBonus = Math.min(connectionCount * 0.1, 0.3);
    const statusBonus = node.data.status === 'completed' ? 0.2 : 0;
    const strength = Math.min(baseStrength + connectionBonus + statusBonus, 1.0);

    return {
      id: node.id,
      title: node.data.title,
      description: node.data.description,
      type,
      strength,
      reliability: 0.7 + Math.random() * 0.3, // 模拟可靠性
      relevance: 0.6 + Math.random() * 0.4,   // 模拟相关性
      metadata: node.data.metadata,
    };
  }

  /**
   * 分析证据关系
   */
  static analyzeRelations(
    evidences: EvidenceNode[],
    nodes: LegalNode[],
    connections: Connection[] = []
  ): EvidenceRelation[] {
    const relations: EvidenceRelation[] = [];

    // 从连接列表中提取关系
    connections.forEach(conn => {
      const sourceNode = nodes.find(n => n.id === conn.source);
      const targetNode = nodes.find(n => n.id === conn.target);

      if (!sourceNode || !targetNode) return;
      if (sourceNode.type !== 'legal-document' || targetNode.type !== 'legal-document') return;

      const relation = this.inferRelationType(sourceNode, targetNode, conn.label);
      if (relation) {
        relations.push(relation);
      }
    });

    // 推断隐式关系
    const implicitRelations = this.inferImplicitRelations(evidences);
    relations.push(...implicitRelations);

    return this.deduplicateRelations(relations);
  }

  /**
   * 推断关系类型
   */
  private static inferRelationType(
    source: LegalNode,
    target: LegalNode,
    label?: string
  ): EvidenceRelation | null {
    const labelLower = (label || '').toLowerCase();

    let type: EvidenceRelationType = 'neutral';
    let strength = 0.5;

    if (labelLower.includes('支持') || labelLower.includes('证明')) {
      type = 'support';
      strength = 0.8;
    } else if (labelLower.includes('矛盾') || labelLower.includes('冲突')) {
      type = 'contradict';
      strength = 0.9;
    } else if (labelLower.includes('佐证') || labelLower.includes('印证')) {
      type = 'corroborate';
      strength = 0.7;
    } else if (labelLower.includes('削弱') || labelLower.includes('质疑')) {
      type = 'weaken';
      strength = 0.6;
    }

    return {
      id: `rel-${source.id}-${target.id}`,
      sourceId: source.id,
      targetId: target.id,
      type,
      strength,
      description: `${source.data.title} ${this.getRelationLabel(type)} ${target.data.title}`,
    };
  }

  /**
   * 获取关系标签
   */
  private static getRelationLabel(type: EvidenceRelationType): string {
    const labels: Record<EvidenceRelationType, string> = {
      support: '支持',
      contradict: '矛盾',
      corroborate: '佐证',
      weaken: '削弱',
      neutral: '关联',
    };
    return labels[type];
  }

  /**
   * 推断隐式关系
   */
  private static inferImplicitRelations(evidences: EvidenceNode[]): EvidenceRelation[] {
    const relations: EvidenceRelation[] = [];

    // 相同类型的证据可能互相佐证
    for (let i = 0; i < evidences.length; i++) {
      for (let j = i + 1; j < evidences.length; j++) {
        const ev1 = evidences[i];
        const ev2 = evidences[j];

        if (ev1.type === ev2.type && ev1.type !== 'documentary') {
          relations.push({
            id: `implicit-${ev1.id}-${ev2.id}`,
            sourceId: ev1.id,
            targetId: ev2.id,
            type: 'corroborate',
            strength: 0.4,
            description: `${ev1.title} 与 ${ev2.title} 类型相同，可能互相佐证`,
          });
        }
      }
    }

    return relations;
  }

  /**
   * 去重关系
   */
  private static deduplicateRelations(relations: EvidenceRelation[]): EvidenceRelation[] {
    const seen = new Set<string>();
    return relations.filter(rel => {
      const key = `${rel.sourceId}-${rel.targetId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * 构建证据链
   */
  static buildChains(
    evidences: EvidenceNode[],
    relations: EvidenceRelation[]
  ): EvidenceChain[] {
    const chains: EvidenceChain[] = [];

    // 找到所有支持性证据链
    const supportingRelations = relations.filter(r => r.type === 'support' || r.type === 'corroborate');

    // 从每个证据开始构建链
    evidences.forEach(evidence => {
      const chain = this.buildChainFromEvidence(evidence, evidences, supportingRelations);
      if (chain.evidences.length > 1) {
        chains.push(chain);
      }
    });

    return chains.sort((a, b) => b.overallStrength - a.overallStrength);
  }

  /**
   * 从证据构建链
   */
  private static buildChainFromEvidence(
    startEvidence: EvidenceNode,
    allEvidences: EvidenceNode[],
    relations: EvidenceRelation[]
  ): EvidenceChain {
    const chainEvidences: EvidenceNode[] = [startEvidence];
    const chainRelations: EvidenceRelation[] = [];
    const visited = new Set<string>([startEvidence.id]);

    // BFS构建链
    const queue = [startEvidence.id];
    while (queue.length > 0) {
      const currentId = queue.shift()!;

      const outgoingRels = relations.filter(r => r.sourceId === currentId && !visited.has(r.targetId));

      outgoingRels.forEach(rel => {
        const targetEvidence = allEvidences.find(e => e.id === rel.targetId);
        if (targetEvidence) {
          chainEvidences.push(targetEvidence);
          chainRelations.push(rel);
          visited.add(rel.targetId);
          queue.push(rel.targetId);
        }
      });
    }

    // 计算整体强度
    const overallStrength = chainEvidences.reduce((sum, e) => sum + e.strength, 0) / chainEvidences.length;

    // 计算完整性（证据数量）
    const completeness = Math.min(chainEvidences.length / 5, 1.0);

    // 计算一致性（关系强度）
    const consistency = chainRelations.length > 0
      ? chainRelations.reduce((sum, r) => sum + r.strength, 0) / chainRelations.length
      : 1.0;

    return {
      id: `chain-${startEvidence.id}`,
      evidences: chainEvidences,
      relations: chainRelations,
      conclusion: `基于 ${chainEvidences.length} 个证据的证据链`,
      overallStrength,
      completeness,
      consistency,
    };
  }

  /**
   * 完整分析
   */
  static analyze(nodes: LegalNode[], connections: Connection[] = []): EvidenceAnalysisResult {
    const evidences = this.extractEvidences(nodes);
    const relations = this.analyzeRelations(evidences, nodes, connections);
    const chains = this.buildChains(evidences, relations);

    // 分类证据
    const supportingEvidence = evidences.filter(e =>
      relations.some(r => r.sourceId === e.id && (r.type === 'support' || r.type === 'corroborate'))
    );

    const contradictingEvidence = evidences.filter(e =>
      relations.some(r => r.sourceId === e.id && (r.type === 'contradict' || r.type === 'weaken'))
    );

    // 识别弱点
    const weaknesses: string[] = [];
    if (evidences.length < 3) {
      weaknesses.push('证据数量不足，建议补充更多证据');
    }
    if (contradictingEvidence.length > supportingEvidence.length) {
      weaknesses.push('矛盾证据较多，需要解释或排除');
    }
    if (chains.length === 0) {
      weaknesses.push('缺乏完整的证据链，证据之间缺少关联');
    }

    // 生成建议
    const recommendations: string[] = [];
    if (evidences.some(e => e.type === 'testimony' && e.reliability < 0.7)) {
      recommendations.push('部分证言可靠性较低，建议寻找其他佐证');
    }
    if (evidences.filter(e => e.type === 'expert').length === 0) {
      recommendations.push('建议添加专家鉴定意见以增强证据力度');
    }
    if (chains.length > 0 && chains[0].completeness < 0.6) {
      recommendations.push('证据链不够完整，建议补充中间环节的证据');
    }

    return {
      evidences,
      relations,
      chains,
      supportingEvidence,
      contradictingEvidence,
      weaknesses,
      recommendations,
    };
  }
}

// ============================================================================
// Zustand Store 和额外类型定义（用于组件）
// ============================================================================

// 证据类型（用于组件）
export interface Evidence {
  id: string;
  title: string;
  type: string;
  description: string;
  submittedBy: string;
  submissionDate: string;
  authenticity: string;
  relevance: number;
  weight: number;
  connections: string[];
  metadata?: {
    fileSize?: string;
    format?: string;
    pages?: number;
  };
  aiAnalysis?: {
    keyPoints: string[];
    contradictions: string[];
    supportingEvidence: string[];
    riskFactors: string[];
    confidence: number;
  };
}

// 证据输入类型
export interface EvidenceInput {
  title: string;
  type: string;
  description: string;
  submittedBy: string;
  metadata?: {
    fileSize?: string;
    format?: string;
    pages?: number;
  };
}

// 证据链类型（用于组件）
export interface Chain {
  id: string;
  name: string;
  description: string;
  evidenceIds: string[];
  strength: number;
  completeness: number;
  consistency: number;
  createdAt: string;
}

// Zustand Store接口
interface EvidenceStore {
  evidences: Evidence[];
  chains: Chain[];
  loading: boolean;
  addEvidence: (input: EvidenceInput) => void;
  updateEvidence: (id: string, updates: Partial<Evidence>) => void;
  deleteEvidence: (id: string) => void;
  analyzeEvidence: (id: string) => void;
  createChain: (name: string, description: string, evidenceIds: string[]) => void;
  analyzeChain: (chainId: string) => void;
  loadData: () => void;
}

// Zustand Store实现
export const useEvidenceStore = create<EvidenceStore>((set, get) => ({
  evidences: [],
  chains: [],
  loading: false,

  addEvidence: (input: EvidenceInput) => {
    const newEvidence: Evidence = {
      id: `ev-${Date.now()}`,
      ...input,
      submissionDate: new Date().toISOString().split('T')[0],
      authenticity: 'pending',
      relevance: 0.5,
      weight: 0.5,
      connections: [],
    };
    set((state) => ({
      evidences: [...state.evidences, newEvidence],
    }));
  },

  updateEvidence: (id: string, updates: Partial<Evidence>) => {
    set((state) => ({
      evidences: state.evidences.map((ev) =>
        ev.id === id ? { ...ev, ...updates } : ev
      ),
    }));
  },

  deleteEvidence: (id: string) => {
    set((state) => ({
      evidences: state.evidences.filter((ev) => ev.id !== id),
      chains: state.chains.map((chain) => ({
        ...chain,
        evidenceIds: chain.evidenceIds.filter((evId) => evId !== id),
      })),
    }));
  },

  analyzeEvidence: (id: string) => {
    // 模拟AI分析
    const mockAnalysis = {
      keyPoints: ['关键点1', '关键点2', '关键点3'],
      contradictions: [],
      supportingEvidence: [],
      riskFactors: [],
      confidence: 0.85,
    };
    get().updateEvidence(id, { aiAnalysis: mockAnalysis });
  },

  createChain: (name: string, description: string, evidenceIds: string[]) => {
    const newChain: Chain = {
      id: `chain-${Date.now()}`,
      name,
      description,
      evidenceIds,
      strength: 0.8,
      completeness: 0.75,
      consistency: 0.9,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      chains: [...state.chains, newChain],
    }));
  },

  analyzeChain: (chainId: string) => {
    // 模拟证据链分析
    set((state) => ({
      chains: state.chains.map((chain) =>
        chain.id === chainId
          ? {
            ...chain,
            strength: Math.random() * 0.3 + 0.7,
            completeness: Math.random() * 0.3 + 0.7,
            consistency: Math.random() * 0.3 + 0.7,
          }
          : chain
      ),
    }));
  },

  loadData: () => {
    // 模拟数据加载
    set({ loading: true });
    setTimeout(() => {
      set({ loading: false });
    }, 500);
  },
}));
