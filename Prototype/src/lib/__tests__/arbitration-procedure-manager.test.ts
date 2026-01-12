/**
 * 仲裁流程管理器单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDeadline,
  isStepOverdue,
  calculateStepProgress,
  calculateOverallProgress,
  predictCompletionDate,
  checkDependencies,
  getNextExecutableStep,
  generateStepSuggestions,
  createArbitrationProcedure,
  type ArbitrationStep,
  type StepInput
} from '../arbitration-procedure-manager';

describe('ArbitrationProcedureManager', () => {
  // 测试数据
  const mockSteps: ArbitrationStep[] = [
    {
      id: 'step-1',
      name: '立案',
      description: '提交仲裁申请',
      type: 'filing',
      status: 'completed',
      startDate: '2025-01-01',
      endDate: '2025-01-05',
      deadline: '2025-01-10',
      duration: 10,
      participants: ['申请人'],
      documents: ['仲裁申请书'],
      requirements: ['缴纳仲裁费'],
      dependencies: []
    },
    {
      id: 'step-2',
      name: '答辩',
      description: '被申请人答辩',
      type: 'response',
      status: 'active',
      startDate: '2025-01-06',
      deadline: '2025-01-20',
      duration: 15,
      participants: ['被申请人'],
      documents: ['答辩书'],
      requirements: ['提交答辩意见'],
      dependencies: ['step-1']
    },
    {
      id: 'step-3',
      name: '组庭',
      description: '组建仲裁庭',
      type: 'tribunal',
      status: 'pending',
      duration: 7,
      participants: ['双方当事人'],
      documents: [],
      requirements: ['选定仲裁员'],
      dependencies: ['step-2']
    }
  ];

  // ==================== 截止日期计算 ====================

  describe('calculateDeadline', () => {
    it('应该正确计算截止日期', () => {
      const deadline = calculateDeadline('2025-01-01', 10);
      expect(deadline).toBe('2025-01-11');
    });

    it('应该处理跨月的情况', () => {
      const deadline = calculateDeadline('2025-01-25', 10);
      expect(deadline).toBe('2025-02-04');
    });

    it('应该处理跨年的情况', () => {
      const deadline = calculateDeadline('2024-12-25', 10);
      expect(deadline).toBe('2025-01-04');
    });
  });

  // ==================== 逾期检测 ====================

  describe('isStepOverdue', () => {
    it('应该检测逾期步骤', () => {
      const overdueStep: ArbitrationStep = {
        ...mockSteps[0],
        status: 'active',
        deadline: '2020-01-01' // 过去的日期
      };
      expect(isStepOverdue(overdueStep)).toBe(true);
    });

    it('应该检测未逾期步骤', () => {
      const futureStep: ArbitrationStep = {
        ...mockSteps[0],
        status: 'active',
        deadline: '2030-01-01' // 未来的日期
      };
      expect(isStepOverdue(futureStep)).toBe(false);
    });

    it('已完成的步骤不应该算逾期', () => {
      const completedStep: ArbitrationStep = {
        ...mockSteps[0],
        status: 'completed',
        deadline: '2020-01-01'
      };
      expect(isStepOverdue(completedStep)).toBe(false);
    });

    it('跳过的步骤不应该算逾期', () => {
      const skippedStep: ArbitrationStep = {
        ...mockSteps[0],
        status: 'skipped',
        deadline: '2020-01-01'
      };
      expect(isStepOverdue(skippedStep)).toBe(false);
    });

    it('没有截止日期的步骤不应该算逾期', () => {
      const noDeadlineStep: ArbitrationStep = {
        ...mockSteps[0],
        status: 'active',
        deadline: undefined
      };
      expect(isStepOverdue(noDeadlineStep)).toBe(false);
    });
  });

  // ==================== 步骤进度计算 ====================

  describe('calculateStepProgress', () => {
    it('已完成步骤进度应该是100', () => {
      const completedStep: ArbitrationStep = {
        ...mockSteps[0],
        status: 'completed'
      };
      expect(calculateStepProgress(completedStep)).toBe(100);
    });

    it('待处理步骤进度应该是0', () => {
      const pendingStep: ArbitrationStep = {
        ...mockSteps[0],
        status: 'pending'
      };
      expect(calculateStepProgress(pendingStep)).toBe(0);
    });

    it('跳过步骤进度应该是0', () => {
      const skippedStep: ArbitrationStep = {
        ...mockSteps[0],
        status: 'skipped'
      };
      expect(calculateStepProgress(skippedStep)).toBe(0);
    });

    it('活动步骤应该根据时间计算进度', () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 5); // 5天前开始
      const end = new Date(now);
      end.setDate(end.getDate() + 5); // 5天后结束

      const activeStep: ArbitrationStep = {
        ...mockSteps[0],
        status: 'active',
        startDate: start.toISOString().split('T')[0],
        deadline: end.toISOString().split('T')[0]
      };

      const progress = calculateStepProgress(activeStep);
      expect(progress).toBeGreaterThan(40);
      expect(progress).toBeLessThan(60);
    });

    it('没有时间信息的活动步骤应该返回默认进度', () => {
      const activeStep: ArbitrationStep = {
        ...mockSteps[0],
        status: 'active',
        startDate: undefined,
        deadline: undefined
      };
      expect(calculateStepProgress(activeStep)).toBe(50);
    });
  });

  // ==================== 整体进度计算 ====================

  describe('calculateOverallProgress', () => {
    it('应该计算整体进度', () => {
      const progress = calculateOverallProgress(mockSteps);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(1);
    });

    it('所有步骤完成时进度应该是1', () => {
      const completedSteps = mockSteps.map(s => ({
        ...s,
        status: 'completed' as const
      }));
      expect(calculateOverallProgress(completedSteps)).toBe(1);
    });

    it('所有步骤待处理时进度应该是0', () => {
      const pendingSteps = mockSteps.map(s => ({
        ...s,
        status: 'pending' as const
      }));
      expect(calculateOverallProgress(pendingSteps)).toBe(0);
    });

    it('空步骤列表进度应该是0', () => {
      expect(calculateOverallProgress([])).toBe(0);
    });
  });

  // ==================== 完成时间预测 ====================

  describe('predictCompletionDate', () => {
    it('应该预测完成时间', () => {
      const completion = predictCompletionDate(mockSteps, '2025-01-15');
      expect(completion).toBeTruthy();
      expect(new Date(completion).getTime()).toBeGreaterThan(new Date('2025-01-15').getTime());
    });

    it('所有步骤完成时应该返回当前日期', () => {
      const completedSteps = mockSteps.map(s => ({
        ...s,
        status: 'completed' as const
      }));
      const completion = predictCompletionDate(completedSteps, '2025-01-15');
      expect(completion).toBe('2025-01-15');
    });

    it('应该考虑剩余步骤的持续时间', () => {
      const steps: ArbitrationStep[] = [
        {
          ...mockSteps[0],
          status: 'pending',
          duration: 10
        },
        {
          ...mockSteps[1],
          status: 'pending',
          duration: 15
        }
      ];

      const completion = predictCompletionDate(steps, '2025-01-01');
      const expected = new Date('2025-01-01');
      expected.setDate(expected.getDate() + 25); // 10 + 15
      expect(completion).toBe(expected.toISOString().split('T')[0]);
    });
  });

  // ==================== 依赖检查 ====================

  describe('checkDependencies', () => {
    it('没有依赖的步骤应该返回true', () => {
      const step: ArbitrationStep = {
        ...mockSteps[0],
        dependencies: []
      };
      expect(checkDependencies(step, mockSteps)).toBe(true);
    });

    it('依赖已完成的步骤应该返回true', () => {
      const step: ArbitrationStep = {
        ...mockSteps[1],
        dependencies: ['step-1']
      };
      expect(checkDependencies(step, mockSteps)).toBe(true);
    });

    it('依赖未完成的步骤应该返回false', () => {
      const step: ArbitrationStep = {
        ...mockSteps[2],
        dependencies: ['step-2'] // step-2是active状态
      };
      expect(checkDependencies(step, mockSteps)).toBe(false);
    });

    it('依赖不存在的步骤应该返回false', () => {
      const step: ArbitrationStep = {
        ...mockSteps[0],
        dependencies: ['non-existent']
      };
      expect(checkDependencies(step, mockSteps)).toBe(false);
    });
  });

  // ==================== 获取下一个可执行步骤 ====================

  describe('getNextExecutableStep', () => {
    it('应该返回依赖已满足的待处理步骤', () => {
      const steps: ArbitrationStep[] = [
        { ...mockSteps[0], status: 'completed' },
        { ...mockSteps[1], status: 'completed' },
        { ...mockSteps[2], status: 'pending', dependencies: ['step-1', 'step-2'] }
      ];

      const next = getNextExecutableStep(steps);
      expect(next).toBeTruthy();
      expect(next?.id).toBe('step-3');
    });

    it('没有可执行步骤时应该返回null', () => {
      const steps: ArbitrationStep[] = [
        { ...mockSteps[0], status: 'completed' },
        { ...mockSteps[1], status: 'active' },
        { ...mockSteps[2], status: 'pending', dependencies: ['step-2'] }
      ];

      const next = getNextExecutableStep(steps);
      expect(next).toBeNull();
    });

    it('所有步骤完成时应该返回null', () => {
      const completedSteps = mockSteps.map(s => ({
        ...s,
        status: 'completed' as const
      }));

      const next = getNextExecutableStep(completedSteps);
      expect(next).toBeNull();
    });
  });

  // ==================== AI建议生成 ====================

  describe('generateStepSuggestions', () => {
    it('应该生成步骤建议', () => {
      const suggestions = generateStepSuggestions(mockSteps[0], mockSteps);

      expect(suggestions).toBeTruthy();
      expect(suggestions!.nextActions).toBeDefined();
      expect(suggestions!.riskFactors).toBeDefined();
      expect(suggestions!.timeEstimate).toBeDefined();
      expect(suggestions!.confidence).toBeDefined();
    });

    it('应该根据步骤类型生成不同的建议', () => {
      const filingSuggestions = generateStepSuggestions(
        { ...mockSteps[0], type: 'filing' },
        mockSteps
      );
      const hearingSuggestions = generateStepSuggestions(
        { ...mockSteps[0], type: 'hearing' },
        mockSteps
      );

      expect(filingSuggestions!.nextActions).not.toEqual(hearingSuggestions!.nextActions);
    });

    it('应该检测时间紧迫的风险', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const urgentStep: ArbitrationStep = {
        ...mockSteps[0],
        deadline: tomorrow.toISOString().split('T')[0]
      };

      const suggestions = generateStepSuggestions(urgentStep, mockSteps);
      expect(suggestions!.riskFactors.some(r => r.includes('时间紧迫'))).toBe(true);
    });

    it('置信度应该在合理范围内', () => {
      const suggestions = generateStepSuggestions(mockSteps[0], mockSteps);
      expect(suggestions!.confidence).toBeGreaterThanOrEqual(0.6);
      expect(suggestions!.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  // ==================== 创建仲裁程序 ====================

  describe('createArbitrationProcedure', () => {
    it('应该创建仲裁程序', () => {
      const stepInputs: StepInput[] = [
        {
          name: '立案',
          description: '提交仲裁申请',
          type: 'filing',
          duration: 10,
          participants: ['申请人'],
          documents: ['仲裁申请书'],
          requirements: ['缴纳仲裁费']
        },
        {
          name: '答辩',
          description: '被申请人答辩',
          type: 'response',
          duration: 15,
          participants: ['被申请人'],
          documents: ['答辩书'],
          requirements: ['提交答辩意见'],
          dependencies: ['step-1']
        }
      ];

      const procedure = createArbitrationProcedure('case-1', '测试案件', stepInputs);

      expect(procedure.id).toBeTruthy();
      expect(procedure.caseId).toBe('case-1');
      expect(procedure.caseName).toBe('测试案件');
      expect(procedure.steps.length).toBe(2);
      expect(procedure.totalSteps).toBe(2);
      expect(procedure.completedSteps).toBe(0);
      expect(procedure.progress).toBe(0);
    });
  });
});

