/**
 * 争议焦点管理器单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  categorizeDisputeFocus,
  assessPriority,
  calculateEvidenceSupport,
  extractKeyPoints,
  generateAIAnalysis,
  createDisputeFocus,
  type DisputeFocus,
  type DisputeFocusInput
} from '../dispute-focus-manager';

describe('DisputeFocusManager', () => {
  // 测试数据
  const mockEvidence = [
    { id: 'ev-1', relevance: 0.9, weight: 0.8 },
    { id: 'ev-2', relevance: 0.7, weight: 0.6 },
    { id: 'ev-3', relevance: 0.5, weight: 0.5 },
    { id: 'ev-4', relevance: 0.8, weight: 0.7 },
    { id: 'ev-5', relevance: 0.6, weight: 0.5 }
  ];

  // ==================== 争议焦点分类 ====================

  describe('categorizeDisputeFocus', () => {
    it('应该识别合同类争议', () => {
      const category = categorizeDisputeFocus('合同纠纷', '关于合同条款的约定');
      expect(category).toBe('contract');
    });

    it('应该识别付款类争议', () => {
      const category = categorizeDisputeFocus('付款争议', '关于支付费用的问题');
      expect(category).toBe('payment');
    });

    it('应该识别交付类争议', () => {
      const category = categorizeDisputeFocus('交付延迟', '关于逾期交付的问题');
      expect(category).toBe('delivery');
    });

    it('应该识别质量类争议', () => {
      const category = categorizeDisputeFocus('质量问题', '产品存在质量瑕疵');
      expect(category).toBe('quality');
    });

    it('应该识别责任类争议', () => {
      const category = categorizeDisputeFocus('责任认定', '关于赔偿损失的责任');
      expect(category).toBe('liability');
    });

    it('应该将未匹配的归为其他类', () => {
      const category = categorizeDisputeFocus('其他问题', '一些其他的争议');
      expect(category).toBe('other');
    });
  });

  // ==================== 优先级评估 ====================

  describe('assessPriority', () => {
    it('应该评估高优先级', () => {
      const priority = assessPriority(
        '关于重大违约责任的赔偿问题，涉及巨额损失',
        5,
        'liability'
      );
      expect(priority).toBe('high');
    });

    it('应该评估中优先级', () => {
      const priority = assessPriority(
        '关于付款时间的约定',
        3,
        'payment'
      );
      expect(priority).toBe('medium');
    });

    it('应该评估低优先级', () => {
      const priority = assessPriority(
        '其他问题',
        1,
        'other'
      );
      expect(priority).toBe('low');
    });

    it('证据数量应该影响优先级', () => {
      const lowEvidence = assessPriority('问题描述', 1, 'other');
      const highEvidence = assessPriority('问题描述', 6, 'other');

      // 证据数量多的应该有更高或相等的优先级
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      expect(priorityOrder[highEvidence]).toBeGreaterThanOrEqual(priorityOrder[lowEvidence]);
    });

    it('关键词应该提升优先级', () => {
      const withKeyword = assessPriority('重大违约责任', 2, 'other');
      const withoutKeyword = assessPriority('一般问题', 2, 'other');

      // 有关键词的优先级应该更高或相等
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      expect(priorityOrder[withKeyword]).toBeGreaterThanOrEqual(priorityOrder[withoutKeyword]);
    });
  });

  // ==================== 证据支撑度计算 ====================

  describe('calculateEvidenceSupport', () => {
    it('应该计算证据支撑度', () => {
      const support = calculateEvidenceSupport(
        '申请人立场',
        ['ev-1', 'ev-2'],
        mockEvidence
      );

      expect(support).toBeGreaterThan(0);
      expect(support).toBeLessThanOrEqual(1);
    });

    it('没有证据时支撑度应该是0', () => {
      const support = calculateEvidenceSupport(
        '申请人立场',
        [],
        mockEvidence
      );
      expect(support).toBe(0);
    });

    it('高质量证据应该有更高的支撑度', () => {
      const highQuality = calculateEvidenceSupport(
        '立场',
        ['ev-1'], // relevance: 0.9, weight: 0.8
        mockEvidence
      );
      const lowQuality = calculateEvidenceSupport(
        '立场',
        ['ev-3'], // relevance: 0.5, weight: 0.5
        mockEvidence
      );

      expect(highQuality).toBeGreaterThan(lowQuality);
    });

    it('证据数量应该提供加成', () => {
      const oneEvidence = calculateEvidenceSupport(
        '立场',
        ['ev-3'], // 使用较低质量的证据
        mockEvidence
      );
      const multipleEvidence = calculateEvidenceSupport(
        '立场',
        ['ev-3', 'ev-4', 'ev-5'], // 多个证据
        mockEvidence
      );

      // 多个证据应该有更高的支撑度（因为有数量加成）
      expect(multipleEvidence).toBeGreaterThan(oneEvidence);
    });

    it('不存在的证据应该被忽略', () => {
      const support = calculateEvidenceSupport(
        '立场',
        ['ev-1', 'non-existent'],
        mockEvidence
      );

      expect(support).toBeGreaterThan(0);
      expect(support).toBeLessThanOrEqual(1);
    });

    it('支撑度不应该超过1', () => {
      const support = calculateEvidenceSupport(
        '立场',
        ['ev-1', 'ev-2', 'ev-3', 'ev-4', 'ev-5'],
        mockEvidence
      );

      expect(support).toBeLessThanOrEqual(1);
    });
  });

  // ==================== 关键论点提取 ====================

  describe('extractKeyPoints', () => {
    it('应该提取包含关键词的句子', () => {
      const position = '申请人主张被申请人违反合同约定。申请人认为应当赔偿损失。其他内容。';
      const keyPoints = extractKeyPoints(position);

      expect(keyPoints.length).toBeGreaterThan(0);
      expect(keyPoints.some(p => p.includes('主张') || p.includes('认为'))).toBe(true);
    });

    it('应该过滤太短的句子', () => {
      const position = '主张。申请人主张被申请人违反合同约定。';
      const keyPoints = extractKeyPoints(position);

      expect(keyPoints.every(p => p.length > 10)).toBe(true);
    });

    it('没有关键词时应该返回前几个句子', () => {
      const position = '这是第一句话。这是第二句话。这是第三句话。这是第四句话。';
      const keyPoints = extractKeyPoints(position);

      expect(keyPoints.length).toBeGreaterThan(0);
      expect(keyPoints.length).toBeLessThanOrEqual(3);
    });

    it('应该限制返回的关键点数量', () => {
      const position = '申请人主张第一点。申请人认为第二点。申请人要求第三点。申请人证明第四点。申请人约定第五点。申请人违反第六点。';
      const keyPoints = extractKeyPoints(position);

      expect(keyPoints.length).toBeLessThanOrEqual(5);
    });

    it('应该处理空字符串', () => {
      const keyPoints = extractKeyPoints('');
      expect(keyPoints).toEqual([]);
    });
  });

  // ==================== AI分析生成 ====================

  describe('generateAIAnalysis', () => {
    const mockFocus: Omit<DisputeFocus, 'aiAnalysis'> = {
      id: 'focus-1',
      title: '付款争议',
      description: '关于付款时间的争议',
      category: 'payment',
      priority: 'high',
      status: 'analyzing',
      evidence: ['ev-1', 'ev-2', 'ev-3'],
      parties: {
        applicant: {
          position: '申请人主张被申请人应当按约定时间付款。申请人认为延迟付款造成损失。',
          evidence: ['ev-1', 'ev-2'],
          supportScore: 0.8
        },
        respondent: {
          position: '被申请人认为付款时间有争议。被申请人要求重新计算。',
          evidence: ['ev-3'],
          supportScore: 0.4
        }
      },
      timeline: {
        created: '2025-01-01',
        lastUpdated: '2025-01-10'
      }
    };

    it('应该生成AI分析', () => {
      const analysis = generateAIAnalysis(mockFocus);

      expect(analysis).toBeTruthy();
      expect(analysis!.confidence).toBeDefined();
      expect(analysis!.recommendation).toBeDefined();
      expect(analysis!.riskLevel).toBeDefined();
      expect(analysis!.keyPoints).toBeDefined();
    });

    it('置信度应该在合理范围内', () => {
      const analysis = generateAIAnalysis(mockFocus);

      expect(analysis!.confidence).toBeGreaterThanOrEqual(0.5);
      expect(analysis!.confidence).toBeLessThanOrEqual(0.95);
    });

    it('应该根据证据支撑度差异评估风险', () => {
      const highDiff: Omit<DisputeFocus, 'aiAnalysis'> = {
        ...mockFocus,
        parties: {
          applicant: { ...mockFocus.parties.applicant, supportScore: 0.9 },
          respondent: { ...mockFocus.parties.respondent, supportScore: 0.3 }
        }
      };

      const analysis = generateAIAnalysis(highDiff);
      expect(analysis!.riskLevel).toBe('low');
    });

    it('证据不足时应该评估为高风险', () => {
      const lowEvidence: Omit<DisputeFocus, 'aiAnalysis'> = {
        ...mockFocus,
        evidence: ['ev-1'],
        parties: {
          applicant: { ...mockFocus.parties.applicant, supportScore: 0.5 },
          respondent: { ...mockFocus.parties.respondent, supportScore: 0.5 }
        }
      };

      const analysis = generateAIAnalysis(lowEvidence);
      expect(analysis!.riskLevel).toBe('high');
    });

    it('应该包含关键点', () => {
      const analysis = generateAIAnalysis(mockFocus);

      expect(analysis!.keyPoints).toBeDefined();
      expect(Array.isArray(analysis!.keyPoints)).toBe(true);
      expect(analysis!.keyPoints.length).toBeGreaterThan(0);
    });

    it('应该根据支撑度差异生成不同建议', () => {
      const applicantStrong: Omit<DisputeFocus, 'aiAnalysis'> = {
        ...mockFocus,
        parties: {
          applicant: { ...mockFocus.parties.applicant, supportScore: 0.9 },
          respondent: { ...mockFocus.parties.respondent, supportScore: 0.3 }
        }
      };

      const respondentStrong: Omit<DisputeFocus, 'aiAnalysis'> = {
        ...mockFocus,
        parties: {
          applicant: { ...mockFocus.parties.applicant, supportScore: 0.3 },
          respondent: { ...mockFocus.parties.respondent, supportScore: 0.9 }
        }
      };

      const analysis1 = generateAIAnalysis(applicantStrong);
      const analysis2 = generateAIAnalysis(respondentStrong);

      expect(analysis1!.recommendation).not.toBe(analysis2!.recommendation);
    });
  });

  // ==================== 创建争议焦点 ====================

  describe('createDisputeFocus', () => {
    it('应该创建争议焦点', () => {
      const input: DisputeFocusInput = {
        title: '付款争议',
        description: '关于付款时间的争议',
        applicantPosition: '申请人主张被申请人应当按约定时间付款',
        respondentPosition: '被申请人认为付款时间有争议',
        relatedEvidence: ['ev-1', 'ev-2']
      };

      const focus = createDisputeFocus(input, mockEvidence);

      expect(focus.id).toBeTruthy();
      expect(focus.title).toBe(input.title);
      expect(focus.description).toBe(input.description);
      expect(focus.category).toBe('payment');
      expect(focus.priority).toBeDefined();
      expect(focus.status).toBe('pending');
      expect(focus.parties.applicant.position).toBe(input.applicantPosition);
      expect(focus.parties.respondent.position).toBe(input.respondentPosition);
    });

    it('应该自动分类和评估优先级', () => {
      const input: DisputeFocusInput = {
        title: '重大违约责任',
        description: '关于重大违约责任的赔偿问题',
        applicantPosition: '申请人主张赔偿',
        respondentPosition: '被申请人拒绝',
        relatedEvidence: ['ev-1', 'ev-2', 'ev-3', 'ev-4', 'ev-5']
      };

      const focus = createDisputeFocus(input, mockEvidence);

      expect(focus.category).toBe('liability');
      expect(focus.priority).toBe('high');
    });

    it('应该计算证据支撑度', () => {
      const input: DisputeFocusInput = {
        title: '争议',
        description: '描述',
        applicantPosition: '立场',
        respondentPosition: '立场',
        relatedEvidence: ['ev-1', 'ev-2']
      };

      const focus = createDisputeFocus(input, mockEvidence);

      expect(focus.parties.applicant.supportScore).toBeGreaterThanOrEqual(0);
      expect(focus.parties.applicant.supportScore).toBeLessThanOrEqual(1);
      expect(focus.parties.respondent.supportScore).toBeGreaterThanOrEqual(0);
      expect(focus.parties.respondent.supportScore).toBeLessThanOrEqual(1);
    });
  });
});

