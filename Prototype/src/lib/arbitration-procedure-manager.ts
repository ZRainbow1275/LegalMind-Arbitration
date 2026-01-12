/**
 * 仲裁流程管理器
 * 
 * 功能：
 * 1. 流程节点状态管理
 * 2. 时限计算和提醒
 * 3. 程序异议处理
 * 4. 进度预测
 */

import { create } from 'zustand';
import localforage from 'localforage';
import { wrapSaveMethod } from './unified-data-manager';
import { performanceMonitor } from './performance-monitor';

// ==================== 数据结构定义 ====================

export interface ArbitrationStep {
  id: string;
  name: string;
  description: string;
  type: 'filing' | 'response' | 'tribunal' | 'hearing' | 'evidence' | 'deliberation' | 'award';
  status: 'pending' | 'active' | 'completed' | 'overdue' | 'skipped';
  startDate?: string;
  endDate?: string;
  deadline?: string;
  duration?: number; // 天数
  participants: string[];
  documents: string[];
  requirements: string[];
  dependencies: string[]; // 依赖的步骤ID
  aiSuggestions?: {
    nextActions: string[];
    riskFactors: string[];
    timeEstimate: number;
    confidence: number;
  };
}

export interface ArbitrationProcedure {
  id: string;
  caseId: string;
  caseName: string;
  currentStep: string;
  progress: number; // 0-1
  totalSteps: number;
  completedSteps: number;
  estimatedCompletion: string;
  steps: ArbitrationStep[];
  timeline: {
    filed: string;
    expectedAward: string;
    actualDuration?: number;
  };
  objections: ProcedureObjection[];
}

export interface ProcedureObjection {
  id: string;
  stepId: string;
  type: 'jurisdiction' | 'composition' | 'procedure' | 'evidence' | 'other';
  description: string;
  submittedBy: 'applicant' | 'respondent';
  submissionDate: string;
  status: 'pending' | 'accepted' | 'rejected' | 'resolved';
  resolution?: string;
  resolutionDate?: string;
}

export interface StepInput {
  name: string;
  description: string;
  type: ArbitrationStep['type'];
  duration: number;
  participants: string[];
  documents: string[];
  requirements: string[];
  dependencies?: string[];
}

// ==================== 核心算法 ====================

/**
 * 计算步骤截止日期
 */
export function calculateDeadline(
  startDate: string,
  duration: number
): string {
  const start = new Date(startDate);
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() + duration);
  return deadline.toISOString().split('T')[0];
}

/**
 * 检查步骤是否逾期
 */
export function isStepOverdue(step: ArbitrationStep): boolean {
  if (!step.deadline || step.status === 'completed' || step.status === 'skipped') {
    return false;
  }
  
  const now = new Date();
  const deadline = new Date(step.deadline);
  return now > deadline;
}

/**
 * 计算步骤进度
 */
export function calculateStepProgress(step: ArbitrationStep): number {
  if (step.status === 'completed') return 100;
  if (step.status === 'pending' || step.status === 'skipped') return 0;
  
  if (step.startDate && step.deadline) {
    const start = new Date(step.startDate).getTime();
    const end = new Date(step.deadline).getTime();
    const now = new Date().getTime();
    const progress = Math.min(Math.max((now - start) / (end - start) * 100, 0), 100);
    return Math.round(progress);
  }
  
  return 50; // 默认进度
}

/**
 * 计算整体进度
 */
export function calculateOverallProgress(steps: ArbitrationStep[]): number {
  if (steps.length === 0) return 0;
  
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const activeSteps = steps.filter(s => s.status === 'active');
  
  let totalProgress = completedSteps;
  
  // 加上活动步骤的部分进度
  activeSteps.forEach(step => {
    const stepProgress = calculateStepProgress(step);
    totalProgress += stepProgress / 100;
  });
  
  return totalProgress / steps.length;
}

/**
 * 预测完成时间
 */
export function predictCompletionDate(
  steps: ArbitrationStep[],
  currentDate: string = new Date().toISOString().split('T')[0]
): string {
  const remainingSteps = steps.filter(s => 
    s.status === 'pending' || s.status === 'active'
  );
  
  if (remainingSteps.length === 0) {
    return currentDate;
  }
  
  // 计算剩余天数
  let remainingDays = 0;
  remainingSteps.forEach(step => {
    if (step.status === 'active' && step.deadline) {
      const now = new Date(currentDate);
      const deadline = new Date(step.deadline);
      const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      remainingDays += daysLeft;
    } else if (step.duration) {
      remainingDays += step.duration;
    } else {
      remainingDays += 7; // 默认7天
    }
  });
  
  const completion = new Date(currentDate);
  completion.setDate(completion.getDate() + remainingDays);
  return completion.toISOString().split('T')[0];
}

/**
 * 检查步骤依赖是否满足
 */
export function checkDependencies(
  step: ArbitrationStep,
  allSteps: ArbitrationStep[]
): boolean {
  if (!step.dependencies || step.dependencies.length === 0) {
    return true;
  }
  
  return step.dependencies.every(depId => {
    const depStep = allSteps.find(s => s.id === depId);
    return depStep && depStep.status === 'completed';
  });
}

/**
 * 获取下一个可执行步骤
 */
export function getNextExecutableStep(
  steps: ArbitrationStep[]
): ArbitrationStep | null {
  const pendingSteps = steps.filter(s => s.status === 'pending');
  
  for (const step of pendingSteps) {
    if (checkDependencies(step, steps)) {
      return step;
    }
  }
  
  return null;
}

/**
 * 生成AI建议（模拟）
 */
export function generateStepSuggestions(
  step: ArbitrationStep,
  allSteps: ArbitrationStep[]
): ArbitrationStep['aiSuggestions'] {
  const nextActions: string[] = [];
  const riskFactors: string[] = [];
  
  // 基于步骤类型的建议
  const typeActions: Record<ArbitrationStep['type'], string[]> = {
    filing: ['准备仲裁申请书', '收集初步证据', '缴纳仲裁费用'],
    response: ['准备答辩书', '提出反请求（如有）', '补充证据材料'],
    tribunal: ['选定仲裁员', '检查回避关系', '确认仲裁庭组成'],
    hearing: ['准备庭审提纲', '通知证人出庭', '安排庭审设备'],
    evidence: ['整理证据清单', '准备质证意见', '补充证据材料'],
    deliberation: ['组织合议会议', '讨论案件焦点', '形成初步意见'],
    award: ['起草裁决书', '合议确认', '送达裁决书']
  };
  
  nextActions.push(...(typeActions[step.type] || []));
  
  // 检查风险因素
  if (step.deadline) {
    const now = new Date();
    const deadline = new Date(step.deadline);
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 3) {
      riskFactors.push('时间紧迫，需加快进度');
    }
  }
  
  if (step.participants.length > 5) {
    riskFactors.push('参与方较多，协调难度大');
  }
  
  if (step.documents.length > 10) {
    riskFactors.push('文档数量多，需仔细审查');
  }
  
  // 估算时间
  const timeEstimate = step.duration || 7;
  
  // 计算置信度
  const completedSteps = allSteps.filter(s => s.status === 'completed').length;
  const confidence = Math.min(0.6 + (completedSteps / allSteps.length) * 0.3, 0.95);
  
  return {
    nextActions: nextActions.slice(0, 3),
    riskFactors,
    timeEstimate,
    confidence
  };
}

/**
 * 创建仲裁程序
 */
export function createArbitrationProcedure(
  caseId: string,
  caseName: string,
  steps: StepInput[]
): ArbitrationProcedure {
  const id = `proc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString().split('T')[0];
  
  // 创建步骤
  const procedureSteps: ArbitrationStep[] = steps.map((input, index) => {
    const stepId = `step-${Date.now()}-${index}`;
    return {
      id: stepId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: index === 0 ? 'active' : 'pending',
      startDate: index === 0 ? now : undefined,
      deadline: index === 0 ? calculateDeadline(now, input.duration) : undefined,
      duration: input.duration,
      participants: input.participants,
      documents: input.documents,
      requirements: input.requirements,
      dependencies: input.dependencies || []
    };
  });
  
  // 计算预计完成时间
  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
  const estimatedCompletion = calculateDeadline(now, totalDuration);
  
  return {
    id,
    caseId,
    caseName,
    currentStep: procedureSteps[0]?.id || '',
    progress: 0,
    totalSteps: procedureSteps.length,
    completedSteps: 0,
    estimatedCompletion,
    steps: procedureSteps,
    timeline: {
      filed: now,
      expectedAward: estimatedCompletion
    },
    objections: []
  };
}

// ==================== Zustand Store ====================

interface ProcedureStore {
  procedures: ArbitrationProcedure[];
  loading: boolean;
  error: string | null;

  // 操作方法
  createProcedure: (caseId: string, caseName: string, steps: StepInput[]) => void;
  updateProcedure: (id: string, updates: Partial<ArbitrationProcedure>) => void;
  deleteProcedure: (id: string) => void;
  updateStep: (procedureId: string, stepId: string, updates: Partial<ArbitrationStep>) => void;
  completeStep: (procedureId: string, stepId: string) => void;
  startNextStep: (procedureId: string) => void;
  addObjection: (procedureId: string, objection: Omit<ProcedureObjection, 'id'>) => void;
  resolveObjection: (procedureId: string, objectionId: string, resolution: string) => void;
  updateProgress: (procedureId: string) => void;
  loadProcedures: () => Promise<void>;
  saveProcedures: () => Promise<void>;
}

export const useProcedureStore = create<ProcedureStore>((set, get) => ({
  procedures: [],
  loading: false,
  error: null,

  createProcedure: (caseId, caseName, steps) => {
    const newProcedure = createArbitrationProcedure(caseId, caseName, steps);
    set(state => ({
      procedures: [...state.procedures, newProcedure]
    }));
    get().saveProcedures();
  },

  updateProcedure: (id, updates) => {
    set(state => ({
      procedures: state.procedures.map(p =>
        p.id === id ? { ...p, ...updates } : p
      )
    }));
    get().saveProcedures();
  },

  deleteProcedure: (id) => {
    set(state => ({
      procedures: state.procedures.filter(p => p.id !== id)
    }));
    get().saveProcedures();
  },

  updateStep: (procedureId, stepId, updates) => {
    set(state => ({
      procedures: state.procedures.map(p => {
        if (p.id !== procedureId) return p;

        return {
          ...p,
          steps: p.steps.map(s => {
            if (s.id !== stepId) return s;

            const updatedStep = { ...s, ...updates };

            // 检查是否逾期
            if (isStepOverdue(updatedStep)) {
              updatedStep.status = 'overdue';
            }

            // 生成AI建议
            if (updatedStep.status === 'active') {
              updatedStep.aiSuggestions = generateStepSuggestions(updatedStep, p.steps);
            }

            return updatedStep;
          })
        };
      })
    }));
    get().saveProcedures();
  },

  completeStep: (procedureId, stepId) => {
    const now = new Date().toISOString().split('T')[0];
    get().updateStep(procedureId, stepId, {
      status: 'completed',
      endDate: now
    });
    get().updateProgress(procedureId);
  },

  startNextStep: (procedureId) => {
    const procedure = get().procedures.find(p => p.id === procedureId);
    if (!procedure) return;

    const nextStep = getNextExecutableStep(procedure.steps);
    if (!nextStep) return;

    const now = new Date().toISOString().split('T')[0];
    const deadline = calculateDeadline(now, nextStep.duration || 7);

    get().updateStep(procedureId, nextStep.id, {
      status: 'active',
      startDate: now,
      deadline
    });

    get().updateProcedure(procedureId, {
      currentStep: nextStep.id
    });
  },

  addObjection: (procedureId, objection) => {
    const perfId = performanceMonitor.start('添加程序异议', 'operation', { procedureId });
    const id = `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newObjection: ProcedureObjection = {
      ...objection,
      id
    };

    set(state => ({
      procedures: state.procedures.map(p =>
        p.id === procedureId
          ? { ...p, objections: [...p.objections, newObjection] }
          : p
      )
    }));
    get().saveProcedures();
    performanceMonitor.end(perfId);
  },

  resolveObjection: (procedureId, objectionId, resolution) => {
    const now = new Date().toISOString().split('T')[0];

    set(state => ({
      procedures: state.procedures.map(p => {
        if (p.id !== procedureId) return p;

        return {
          ...p,
          objections: p.objections.map(obj =>
            obj.id === objectionId
              ? { ...obj, status: 'resolved', resolution, resolutionDate: now }
              : obj
          )
        };
      })
    }));
    get().saveProcedures();
  },

  updateProgress: (procedureId) => {
    const procedure = get().procedures.find(p => p.id === procedureId);
    if (!procedure) return;

    const progress = calculateOverallProgress(procedure.steps);
    const completedSteps = procedure.steps.filter(s => s.status === 'completed').length;
    const estimatedCompletion = predictCompletionDate(procedure.steps);

    get().updateProcedure(procedureId, {
      progress,
      completedSteps,
      estimatedCompletion
    });
  },

  loadProcedures: async () => {
    set({ loading: true, error: null });
    try {
      const saved = await localforage.getItem<ArbitrationProcedure[]>('arbitration-procedures');
      if (saved) {
        set({ procedures: saved, loading: false });
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

  saveProcedures: wrapSaveMethod(async () => {
    try {
      await localforage.setItem('arbitration-procedures', get().procedures);
    } catch (error) {
      console.error('保存仲裁程序失败:', error);
    }
  }, '仲裁程序')
}));

