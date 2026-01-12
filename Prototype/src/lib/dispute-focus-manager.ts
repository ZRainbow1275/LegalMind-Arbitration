/**
 * 争议焦点管理器
 * 
 * 功能：
 * 1. 争议焦点自动提取和分类
 * 2. 双方立场分析
 * 3. 证据支撑度计算
 * 4. AI分析建议生成（模拟）
 */

import { create } from 'zustand';
import localforage from 'localforage';
import { wrapSaveMethod } from './unified-data-manager';
import { performanceMonitor } from './performance-monitor';

// ==================== 数据结构定义 ====================

export interface DisputeFocus {
  id: string;
  title: string;
  description: string;
  category: 'contract' | 'payment' | 'delivery' | 'quality' | 'liability' | 'other';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'analyzing' | 'resolved' | 'disputed';
  evidence: string[];
  parties: {
    applicant: {
      position: string;
      evidence: string[];
      supportScore: number; // 0-1
    };
    respondent: {
      position: string;
      evidence: string[];
      supportScore: number; // 0-1
    };
  };
  timeline: {
    created: string;
    lastUpdated: string;
    deadline?: string;
  };
  aiAnalysis?: {
    confidence: number;
    recommendation: string;
    riskLevel: 'low' | 'medium' | 'high';
    keyPoints: string[];
  };
}

export interface DisputeFocusInput {
  title: string;
  description: string;
  applicantPosition: string;
  respondentPosition: string;
  relatedEvidence?: string[];
}

// ==================== 核心算法 ====================

/**
 * 自动分类争议焦点
 */
export function categorizeDisputeFocus(title: string, description: string): DisputeFocus['category'] {
  const text = (title + ' ' + description).toLowerCase();

  // 关键词匹配
  if (text.includes('合同') || text.includes('条款') || text.includes('约定')) {
    return 'contract';
  }
  if (text.includes('付款') || text.includes('支付') || text.includes('费用') || text.includes('违约金')) {
    return 'payment';
  }
  if (text.includes('交付') || text.includes('延迟') || text.includes('逾期')) {
    return 'delivery';
  }
  if (text.includes('质量') || text.includes('瑕疵') || text.includes('缺陷')) {
    return 'quality';
  }
  if (text.includes('责任') || text.includes('赔偿') || text.includes('损失')) {
    return 'liability';
  }

  return 'other';
}

/**
 * 评估争议焦点优先级
 */
export function assessPriority(
  description: string,
  evidenceCount: number,
  category: DisputeFocus['category']
): DisputeFocus['priority'] {
  let score = 0;

  // 基于类别的基础分数
  const categoryScores: Record<DisputeFocus['category'], number> = {
    contract: 3,
    payment: 3,
    delivery: 2,
    quality: 2,
    liability: 3,
    other: 1
  };
  score += categoryScores[category];

  // 基于证据数量
  if (evidenceCount >= 5) score += 2;
  else if (evidenceCount >= 3) score += 1;

  // 基于描述长度（复杂度）
  if (description.length > 200) score += 1;

  // 关键词加权
  const highPriorityKeywords = ['违约', '赔偿', '损失', '责任', '重大'];
  const hasHighPriorityKeyword = highPriorityKeywords.some(keyword =>
    description.includes(keyword)
  );
  if (hasHighPriorityKeyword) score += 2;

  // 转换为优先级
  if (score >= 6) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

/**
 * 计算证据支撑度
 */
export function calculateEvidenceSupport(
  _position: string,
  evidenceList: string[],
  allEvidence: Array<{ id: string; relevance: number; weight: number }>
): number {
  if (evidenceList.length === 0) return 0;

  // 计算平均相关性和权重
  let totalScore = 0;
  let validEvidenceCount = 0;

  evidenceList.forEach(evidenceId => {
    const evidence = allEvidence.find(e => e.id === evidenceId);
    if (evidence) {
      // 综合相关性和权重
      const score = (evidence.relevance * 0.6 + evidence.weight * 0.4);
      totalScore += score;
      validEvidenceCount++;
    }
  });

  if (validEvidenceCount === 0) return 0;

  const averageScore = totalScore / validEvidenceCount;

  // 考虑证据数量的影响
  const quantityBonus = Math.min(validEvidenceCount / 5, 0.2); // 最多20%加成

  return Math.min(averageScore + quantityBonus, 1);
}

/**
 * 提取关键论点
 */
export function extractKeyPoints(position: string): string[] {
  const keyPoints: string[] = [];

  // 简单的句子分割
  const sentences = position.split(/[。！？；]/).filter(s => s.trim().length > 0);

  // 提取包含关键词的句子
  const keywords = ['主张', '认为', '要求', '违反', '约定', '证明', '事实'];

  sentences.forEach(sentence => {
    const hasKeyword = keywords.some(keyword => sentence.includes(keyword));
    if (hasKeyword && sentence.length > 10) {
      keyPoints.push(sentence.trim());
    }
  });

  // 如果没有找到关键点，返回前3个句子
  if (keyPoints.length === 0) {
    return sentences.slice(0, 3).map(s => s.trim());
  }

  return keyPoints.slice(0, 5); // 最多返回5个关键点
}

/**
 * 生成AI分析建议（模拟）
 */
export function generateAIAnalysis(
  focus: Omit<DisputeFocus, 'aiAnalysis'>
): DisputeFocus['aiAnalysis'] {
  const { parties, category, evidence } = focus;

  // 计算置信度
  const applicantSupport = parties.applicant.supportScore;
  const respondentSupport = parties.respondent.supportScore;
  const evidenceCount = evidence.length;

  // 基础置信度
  let confidence = 0.5;

  // 证据数量影响
  confidence += Math.min(evidenceCount / 10, 0.2);

  // 双方支撑度差异影响
  const supportDiff = Math.abs(applicantSupport - respondentSupport);
  confidence += supportDiff * 0.3;

  confidence = Math.min(confidence, 0.95);

  // 生成建议
  const recommendations: string[] = [];

  if (applicantSupport > respondentSupport + 0.2) {
    recommendations.push('申请人证据支撑较强，建议重点审查被申请人的抗辩理由');
  } else if (respondentSupport > applicantSupport + 0.2) {
    recommendations.push('被申请人证据支撑较强，建议申请人补充证据');
  } else {
    recommendations.push('双方证据支撑度相当，建议进一步质证和辩论');
  }

  if (evidenceCount < 3) {
    recommendations.push('证据数量较少，建议双方补充相关证据');
  }

  // 基于类别的建议
  const categoryRecommendations: Record<DisputeFocus['category'], string> = {
    contract: '建议重点审查合同条款的约定和解释',
    payment: '建议核实付款记录和计算标准',
    delivery: '建议审查交付时间和不可抗力证明',
    quality: '建议进行质量鉴定或专家意见',
    liability: '建议明确责任划分和因果关系',
    other: '建议进一步明确争议焦点'
  };
  recommendations.push(categoryRecommendations[category]);

  // 评估风险等级
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  if (supportDiff > 0.4) {
    riskLevel = 'low'; // 证据明显倾向一方，风险低
  } else if (supportDiff < 0.1 && evidenceCount < 3) {
    riskLevel = 'high'; // 证据不足且双方相当，风险高
  }

  // 提取关键点
  const keyPoints = [
    ...extractKeyPoints(parties.applicant.position).slice(0, 2),
    ...extractKeyPoints(parties.respondent.position).slice(0, 2)
  ];

  return {
    confidence,
    recommendation: recommendations[0],
    riskLevel,
    keyPoints
  };
}

/**
 * 创建争议焦点
 */
export function createDisputeFocus(
  input: DisputeFocusInput,
  allEvidence: Array<{ id: string; relevance: number; weight: number }> = []
): DisputeFocus {
  const id = `focus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString().split('T')[0];

  // 自动分类
  const category = categorizeDisputeFocus(input.title, input.description);

  // 评估优先级
  const priority = assessPriority(
    input.description,
    input.relatedEvidence?.length || 0,
    category
  );

  // 计算证据支撑度
  const applicantSupport = calculateEvidenceSupport(
    input.applicantPosition,
    input.relatedEvidence || [],
    allEvidence
  );

  const respondentSupport = calculateEvidenceSupport(
    input.respondentPosition,
    input.relatedEvidence || [],
    allEvidence
  );

  const focus: Omit<DisputeFocus, 'aiAnalysis'> = {
    id,
    title: input.title,
    description: input.description,
    category,
    priority,
    status: 'pending',
    evidence: input.relatedEvidence || [],
    parties: {
      applicant: {
        position: input.applicantPosition,
        evidence: input.relatedEvidence || [],
        supportScore: applicantSupport
      },
      respondent: {
        position: input.respondentPosition,
        evidence: input.relatedEvidence || [],
        supportScore: respondentSupport
      }
    },
    timeline: {
      created: now,
      lastUpdated: now
    }
  };

  // 生成AI分析
  const aiAnalysis = generateAIAnalysis(focus);

  return {
    ...focus,
    aiAnalysis
  };
}

// ==================== Zustand Store ====================

interface DisputeFocusStore {
  foci: DisputeFocus[];
  loading: boolean;
  error: string | null;

  // 操作方法
  addFocus: (input: DisputeFocusInput, allEvidence?: Array<{ id: string; relevance: number; weight: number }>) => void;
  updateFocus: (id: string, updates: Partial<DisputeFocus>) => void;
  deleteFocus: (id: string) => void;
  analyzeFocus: (id: string, allEvidence?: Array<{ id: string; relevance: number; weight: number }>) => void;
  loadFoci: () => Promise<void>;
  saveFoci: () => Promise<void>;
}

export const useDisputeFocusStore = create<DisputeFocusStore>((set, get) => ({
  foci: [],
  loading: false,
  error: null,

  addFocus: (input, allEvidence = []) => {
    const perfId = performanceMonitor.start('添加争议焦点', 'operation');
    const newFocus = createDisputeFocus(input, allEvidence);
    set(state => ({
      foci: [...state.foci, newFocus]
    }));
    get().saveFoci();
    performanceMonitor.end(perfId);
  },

  updateFocus: (id, updates) => {
    const perfId = performanceMonitor.start('更新争议焦点', 'operation', { focusId: id });
    set(state => ({
      foci: state.foci.map(focus =>
        focus.id === id
          ? {
            ...focus,
            ...updates,
            timeline: {
              ...focus.timeline,
              lastUpdated: new Date().toISOString().split('T')[0]
            }
          }
          : focus
      )
    }));
    get().saveFoci();
    performanceMonitor.end(perfId);
  },

  deleteFocus: (id) => {
    const perfId = performanceMonitor.start('删除争议焦点', 'operation', { focusId: id });
    set(state => ({
      foci: state.foci.filter(focus => focus.id !== id)
    }));
    get().saveFoci();
    performanceMonitor.end(perfId);
  },

  analyzeFocus: (id, allEvidence = []) => {
    const focus = get().foci.find(f => f.id === id);
    if (!focus) return;

    // 重新计算证据支撑度
    const applicantSupport = calculateEvidenceSupport(
      focus.parties.applicant.position,
      focus.parties.applicant.evidence,
      allEvidence
    );

    const respondentSupport = calculateEvidenceSupport(
      focus.parties.respondent.position,
      focus.parties.respondent.evidence,
      allEvidence
    );

    // 重新生成AI分析
    const updatedFocus: Omit<DisputeFocus, 'aiAnalysis'> = {
      ...focus,
      parties: {
        applicant: {
          ...focus.parties.applicant,
          supportScore: applicantSupport
        },
        respondent: {
          ...focus.parties.respondent,
          supportScore: respondentSupport
        }
      }
    };

    const aiAnalysis = generateAIAnalysis(updatedFocus);

    get().updateFocus(id, {
      parties: updatedFocus.parties,
      aiAnalysis,
      status: 'analyzing'
    });
  },

  loadFoci: async () => {
    set({ loading: true, error: null });
    try {
      const saved = await localforage.getItem<DisputeFocus[]>('dispute-foci');
      if (saved) {
        set({ foci: saved, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载失败',
        loading: false
      });
    }
  },

  saveFoci: wrapSaveMethod(async () => {
    try {
      await localforage.setItem('dispute-foci', get().foci);
    } catch (error) {
      console.error('保存争议焦点失败:', error);
    }
  }, '争议焦点')
}));

