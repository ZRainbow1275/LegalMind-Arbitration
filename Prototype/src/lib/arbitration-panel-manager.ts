/**
 * 仲裁庭管理器
 * 
 * 功能：
 * 1. 仲裁员推荐算法
 * 2. 回避关系检测
 * 3. 仲裁庭配置验证
 */

import { create } from 'zustand';
import localforage from 'localforage';
import { wrapSaveMethod } from './unified-data-manager';
import { performanceMonitor } from './performance-monitor';

// ==================== 数据结构定义 ====================

export interface Arbitrator {
  id: string;
  name: string;
  title: string; // 职称
  organization: string; // 所属机构
  specialties: string[]; // 专业领域
  experience: number; // 从业年限
  caseCount: number; // 办案数量
  rating: number; // 评分 0-5
  availability: 'available' | 'busy' | 'unavailable';
  languages: string[]; // 语言能力
  location: string; // 所在地
  conflicts: string[]; // 利益冲突方（公司/个人ID）
}

export interface ArbitrationPanel {
  id: string;
  caseId: string;
  caseName: string;
  caseType: string; // 案件类型
  disputeAmount: number; // 争议金额
  composition: {
    presiding: string | null; // 首席仲裁员ID
    members: string[]; // 仲裁员ID列表
  };
  status: 'forming' | 'formed' | 'challenged' | 'confirmed';
  formationDate?: string;
  confirmationDate?: string;
  challenges: PanelChallenge[]; // 回避申请
  validationResult?: {
    isValid: boolean;
    issues: string[];
    warnings: string[];
  };
}

export interface PanelChallenge {
  id: string;
  arbitratorId: string;
  reason: string;
  submittedBy: 'applicant' | 'respondent';
  submissionDate: string;
  status: 'pending' | 'accepted' | 'rejected';
  resolution?: string;
  resolutionDate?: string;
}

export interface CaseInfo {
  id: string;
  type: string;
  disputeAmount: number;
  parties: {
    applicant: string;
    respondent: string;
  };
  specialtyRequired: string[];
}

// ==================== 核心算法 ====================

/**
 * 计算仲裁员匹配度
 */
export function calculateArbitratorMatch(
  arbitrator: Arbitrator,
  caseInfo: CaseInfo
): number {
  let score = 0;

  // 专业领域匹配（40%）
  const specialtyMatch = caseInfo.specialtyRequired.filter(s =>
    arbitrator.specialties.includes(s)
  ).length;
  const specialtyScore = specialtyMatch / Math.max(caseInfo.specialtyRequired.length, 1);
  score += specialtyScore * 0.4;

  // 经验评分（30%）
  const experienceScore = Math.min(arbitrator.experience / 20, 1); // 20年经验为满分
  score += experienceScore * 0.3;

  // 办案数量（15%）
  const caseCountScore = Math.min(arbitrator.caseCount / 100, 1); // 100个案件为满分
  score += caseCountScore * 0.15;

  // 评分（15%）
  const ratingScore = arbitrator.rating / 5;
  score += ratingScore * 0.15;

  return Math.min(score, 1);
}

/**
 * 推荐仲裁员
 */
export function recommendArbitrators(
  allArbitrators: Arbitrator[],
  caseInfo: CaseInfo,
  excludeIds: string[] = [],
  count: number = 5
): Arbitrator[] {
  // 过滤可用的仲裁员
  const available = allArbitrators.filter(a =>
    a.availability === 'available' &&
    !excludeIds.includes(a.id) &&
    !hasConflict(a, caseInfo)
  );

  // 计算匹配度并排序
  const scored = available.map(arbitrator => ({
    arbitrator,
    score: calculateArbitratorMatch(arbitrator, caseInfo)
  })).sort((a, b) => b.score - a.score);

  // 返回前N个
  return scored.slice(0, count).map(s => s.arbitrator);
}

/**
 * 检测利益冲突
 */
export function hasConflict(
  arbitrator: Arbitrator,
  caseInfo: CaseInfo
): boolean {
  const parties = [caseInfo.parties.applicant, caseInfo.parties.respondent];
  return parties.some(party => arbitrator.conflicts.includes(party));
}

/**
 * 检测仲裁庭回避关系
 */
export function detectPanelConflicts(
  panel: ArbitrationPanel,
  allArbitrators: Arbitrator[],
  caseInfo: CaseInfo
): string[] {
  const conflicts: string[] = [];

  const arbitratorIds = [
    panel.composition.presiding,
    ...panel.composition.members
  ].filter(id => id !== null) as string[];

  arbitratorIds.forEach(id => {
    const arbitrator = allArbitrators.find(a => a.id === id);
    if (!arbitrator) return;

    if (hasConflict(arbitrator, caseInfo)) {
      conflicts.push(`仲裁员${arbitrator.name}与当事人存在利益冲突`);
    }
  });

  return conflicts;
}

/**
 * 验证仲裁庭配置
 */
export function validatePanelComposition(
  panel: ArbitrationPanel,
  allArbitrators: Arbitrator[],
  caseInfo: CaseInfo
): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 检查首席仲裁员
  if (!panel.composition.presiding) {
    issues.push('未指定首席仲裁员');
  } else {
    const presiding = allArbitrators.find(a => a.id === panel.composition.presiding);
    if (!presiding) {
      issues.push('首席仲裁员不存在');
    } else if (presiding.availability !== 'available') {
      issues.push('首席仲裁员不可用');
    } else if (presiding.experience < 10) {
      warnings.push('首席仲裁员经验不足10年');
    }
  }

  // 检查仲裁员数量
  const totalArbitrators = panel.composition.members.length + (panel.composition.presiding ? 1 : 0);
  if (totalArbitrators === 0) {
    issues.push('仲裁庭无仲裁员');
  } else if (totalArbitrators % 2 === 0) {
    warnings.push('仲裁员数量为偶数，建议使用奇数');
  }

  // 检查专业领域覆盖
  const arbitrators = allArbitrators.filter(a =>
    a.id === panel.composition.presiding ||
    panel.composition.members.includes(a.id)
  );

  const coveredSpecialties = new Set<string>();
  arbitrators.forEach(a => {
    a.specialties.forEach(s => coveredSpecialties.add(s));
  });

  const uncoveredSpecialties = caseInfo.specialtyRequired.filter(s =>
    !coveredSpecialties.has(s)
  );

  if (uncoveredSpecialties.length > 0) {
    warnings.push(`缺少以下专业领域：${uncoveredSpecialties.join(', ')}`);
  }

  // 检查利益冲突
  const conflicts = detectPanelConflicts(panel, allArbitrators, caseInfo);
  if (conflicts.length > 0) {
    issues.push(...conflicts);
  }

  // 检查地域平衡
  const locations = arbitrators.map(a => a.location);
  const uniqueLocations = new Set(locations);
  if (uniqueLocations.size === 1 && arbitrators.length > 1) {
    warnings.push('所有仲裁员来自同一地区，建议增加地域多样性');
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * 自动组建仲裁庭
 */
export function autoFormPanel(
  allArbitrators: Arbitrator[],
  caseInfo: CaseInfo,
  panelSize: number = 3
): {
  presiding: string | null;
  members: string[];
} {
  if (panelSize < 1) {
    return { presiding: null, members: [] };
  }

  // 推荐首席仲裁员（经验最丰富的）
  const presidingCandidates = recommendArbitrators(allArbitrators, caseInfo, [], 5)
    .filter(a => a.experience >= 10)
    .sort((a, b) => b.experience - a.experience);

  const presiding = presidingCandidates[0]?.id || null;

  // 推荐其他仲裁员
  const memberCandidates = recommendArbitrators(
    allArbitrators,
    caseInfo,
    presiding ? [presiding] : [],
    panelSize - 1
  );

  const members = memberCandidates.map(a => a.id);

  return { presiding, members };
}

/**
 * 创建仲裁庭
 */
export function createArbitrationPanel(
  caseInfo: CaseInfo,
  allArbitrators: Arbitrator[],
  autoForm: boolean = false
): ArbitrationPanel {
  const id = `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString().split('T')[0];

  let composition: ArbitrationPanel['composition'];

  if (autoForm) {
    composition = autoFormPanel(allArbitrators, caseInfo);
  } else {
    composition = {
      presiding: null,
      members: []
    };
  }

  return {
    id,
    caseId: caseInfo.id,
    caseName: `案件${caseInfo.id}`,
    caseType: caseInfo.type,
    disputeAmount: caseInfo.disputeAmount,
    composition,
    status: 'forming',
    formationDate: now,
    challenges: []
  };
}

// ==================== Zustand Store ====================

interface PanelStore {
  arbitrators: Arbitrator[];
  panels: ArbitrationPanel[];
  loading: boolean;
  error: string | null;

  // 操作方法
  addArbitrator: (arbitrator: Omit<Arbitrator, 'id'>) => void;
  updateArbitrator: (id: string, updates: Partial<Arbitrator>) => void;
  deleteArbitrator: (id: string) => void;
  createPanel: (caseInfo: CaseInfo, autoForm?: boolean) => void;
  updatePanel: (id: string, updates: Partial<ArbitrationPanel>) => void;
  deletePanel: (id: string) => void;
  setPresiding: (panelId: string, arbitratorId: string) => void;
  addMember: (panelId: string, arbitratorId: string) => void;
  removeMember: (panelId: string, arbitratorId: string) => void;
  validatePanel: (panelId: string, caseInfo: CaseInfo) => void;
  addChallenge: (panelId: string, challenge: Omit<PanelChallenge, 'id'>) => void;
  resolveChallenge: (panelId: string, challengeId: string, accepted: boolean, resolution: string) => void;
  recommendForCase: (caseInfo: CaseInfo, count?: number) => Arbitrator[];
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
}

export const usePanelStore = create<PanelStore>((set, get) => ({
  arbitrators: [],
  panels: [],
  loading: false,
  error: null,

  addArbitrator: (arbitrator) => {
    const id = `arb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newArbitrator: Arbitrator = { ...arbitrator, id };
    set(state => ({
      arbitrators: [...state.arbitrators, newArbitrator]
    }));
    get().saveData();
  },

  updateArbitrator: (id, updates) => {
    set(state => ({
      arbitrators: state.arbitrators.map(a =>
        a.id === id ? { ...a, ...updates } : a
      )
    }));
    get().saveData();
  },

  deleteArbitrator: (id) => {
    set(state => ({
      arbitrators: state.arbitrators.filter(a => a.id !== id),
      panels: state.panels.map(p => ({
        ...p,
        composition: {
          presiding: p.composition.presiding === id ? null : p.composition.presiding,
          members: p.composition.members.filter(m => m !== id)
        }
      }))
    }));
    get().saveData();
  },

  createPanel: (caseInfo, autoForm = false) => {
    const { arbitrators } = get();
    const newPanel = createArbitrationPanel(caseInfo, arbitrators, autoForm);
    set(state => ({
      panels: [...state.panels, newPanel]
    }));
    get().saveData();
  },

  updatePanel: (id, updates) => {
    set(state => ({
      panels: state.panels.map(p =>
        p.id === id ? { ...p, ...updates } : p
      )
    }));
    get().saveData();
  },

  deletePanel: (id) => {
    set(state => ({
      panels: state.panels.filter(p => p.id !== id)
    }));
    get().saveData();
  },

  setPresiding: (panelId, arbitratorId) => {
    set(state => ({
      panels: state.panels.map(p =>
        p.id === panelId
          ? {
            ...p,
            composition: { ...p.composition, presiding: arbitratorId }
          }
          : p
      )
    }));
    get().saveData();
  },

  addMember: (panelId, arbitratorId) => {
    set(state => ({
      panels: state.panels.map(p => {
        if (p.id !== panelId) return p;

        // 避免重复添加
        if (p.composition.members.includes(arbitratorId)) return p;

        return {
          ...p,
          composition: {
            ...p.composition,
            members: [...p.composition.members, arbitratorId]
          }
        };
      })
    }));
    get().saveData();
  },

  removeMember: (panelId, arbitratorId) => {
    set(state => ({
      panels: state.panels.map(p =>
        p.id === panelId
          ? {
            ...p,
            composition: {
              ...p.composition,
              members: p.composition.members.filter(m => m !== arbitratorId)
            }
          }
          : p
      )
    }));
    get().saveData();
  },

  validatePanel: (panelId, caseInfo) => {
    const { panels, arbitrators } = get();
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;

    const validationResult = validatePanelComposition(panel, arbitrators, caseInfo);

    get().updatePanel(panelId, {
      validationResult,
      status: validationResult.isValid ? 'formed' : 'forming'
    });
  },

  addChallenge: (panelId, challenge) => {
    const id = `chal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newChallenge: PanelChallenge = { ...challenge, id };

    set(state => ({
      panels: state.panels.map(p =>
        p.id === panelId
          ? {
            ...p,
            challenges: [...p.challenges, newChallenge],
            status: 'challenged'
          }
          : p
      )
    }));
    get().saveData();
  },

  resolveChallenge: (panelId, challengeId, accepted, resolution) => {
    const perfId = performanceMonitor.start('处理回避申请', 'operation', { panelId, challengeId });
    const now = new Date().toISOString().split('T')[0];

    set(state => ({
      panels: state.panels.map(p => {
        if (p.id !== panelId) return p;

        const updatedChallenges = p.challenges.map(c =>
          c.id === challengeId
            ? {
              ...c,
              status: (accepted ? 'accepted' : 'rejected') as 'accepted' | 'rejected',
              resolution,
              resolutionDate: now
            }
            : c
        );

        // 如果回避申请被接受，移除该仲裁员
        let updatedComposition = p.composition;
        if (accepted) {
          const challenge = p.challenges.find(c => c.id === challengeId);
          if (challenge) {
            updatedComposition = {
              presiding: p.composition.presiding === challenge.arbitratorId
                ? null
                : p.composition.presiding,
              members: p.composition.members.filter(m => m !== challenge.arbitratorId)
            };
          }
        }

        return {
          ...p,
          challenges: updatedChallenges,
          composition: updatedComposition,
          status: 'forming'
        };
      })
    }));
    get().saveData();
    performanceMonitor.end(perfId);
  },

  recommendForCase: (caseInfo, count = 5) => {
    const { arbitrators } = get();
    return recommendArbitrators(arbitrators, caseInfo, [], count);
  },

  loadData: async () => {
    set({ loading: true, error: null });
    try {
      const savedArbitrators = await localforage.getItem<Arbitrator[]>('arbitrators');
      const savedPanels = await localforage.getItem<ArbitrationPanel[]>('arbitration-panels');

      set({
        arbitrators: savedArbitrators || [],
        panels: savedPanels || [],
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载失败',
        loading: false
      });
    }
  },

  saveData: wrapSaveMethod(async () => {
    const { arbitrators, panels } = get();
    try {
      await localforage.setItem('arbitrators', arbitrators);
      await localforage.setItem('arbitration-panels', panels);
    } catch (error) {
      console.error('保存仲裁庭数据失败:', error);
    }
  }, '仲裁庭')
}));

