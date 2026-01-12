/**
 * 仲裁庭管理器单元测试
 *
 * 测试范围：
 * - 仲裁员匹配度计算
 * - 仲裁员推荐算法
 * - 利益冲突检测
 * - 仲裁庭配置验证
 * - 自动组建仲裁庭
 */

import { describe, it, expect } from 'vitest';
import {
  calculateArbitratorMatch,
  recommendArbitrators,
  hasConflict,
  detectPanelConflicts,
  validatePanelComposition,
  autoFormPanel,
  createArbitrationPanel,
  type Arbitrator,
  type CaseInfo,
  type ArbitrationPanel
} from '../arbitration-panel-manager';

describe('ArbitrationPanelManager', () => {
  // 测试数据
  const mockArbitrators: Arbitrator[] = [
    {
      id: 'arb-1',
      name: '张三',
      title: '高级仲裁员',
      organization: '北京仲裁委员会',
      specialties: ['合同纠纷', '商事仲裁'],
      experience: 15,
      caseCount: 120,
      rating: 4.5,
      availability: 'available',
      languages: ['中文', '英文'],
      location: '北京',
      conflicts: []
    },
    {
      id: 'arb-2',
      name: '李四',
      title: '资深仲裁员',
      organization: '上海仲裁委员会',
      specialties: ['知识产权', '技术合同'],
      experience: 20,
      caseCount: 200,
      rating: 4.8,
      availability: 'available',
      languages: ['中文'],
      location: '上海',
      conflicts: ['company-A']
    },
    {
      id: 'arb-3',
      name: '王五',
      title: '仲裁员',
      organization: '深圳仲裁委员会',
      specialties: ['合同纠纷', '金融纠纷'],
      experience: 8,
      caseCount: 50,
      rating: 4.2,
      availability: 'available', // 改为available
      languages: ['中文', '英文'],
      location: '深圳',
      conflicts: []
    },
    {
      id: 'arb-4',
      name: '赵六',
      title: '仲裁员',
      organization: '广州仲裁委员会',
      specialties: ['商事仲裁'],
      experience: 12,
      caseCount: 80,
      rating: 4.3,
      availability: 'available',
      languages: ['中文'],
      location: '广州',
      conflicts: []
    }
  ];

  const mockCaseInfo: CaseInfo = {
    id: 'case-1',
    type: '合同纠纷',
    disputeAmount: 1000000,
    parties: {
      applicant: 'company-B',
      respondent: 'company-C'
    },
    specialtyRequired: ['合同纠纷', '商事仲裁']
  };

  // ==================== 仲裁员匹配度计算 ====================

  describe('calculateArbitratorMatch', () => {
    it('应该计算仲裁员匹配度', () => {
      const score = calculateArbitratorMatch(mockArbitrators[0], mockCaseInfo);
      
      // 验证匹配度在0-1之间
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      
      // 张三专业完全匹配，应该有较高分数
      expect(score).toBeGreaterThan(0.5);
    });

    it('应该根据专业领域匹配计算分数', () => {
      const score1 = calculateArbitratorMatch(mockArbitrators[0], mockCaseInfo); // 完全匹配
      const score2 = calculateArbitratorMatch(mockArbitrators[1], mockCaseInfo); // 不匹配
      
      // 专业匹配的分数应该更高
      expect(score1).toBeGreaterThan(score2);
    });

    it('应该考虑经验和评分', () => {
      const highExperience: Arbitrator = {
        ...mockArbitrators[0],
        experience: 20,
        rating: 5.0
      };
      
      const lowExperience: Arbitrator = {
        ...mockArbitrators[0],
        experience: 5,
        rating: 3.0
      };
      
      const score1 = calculateArbitratorMatch(highExperience, mockCaseInfo);
      const score2 = calculateArbitratorMatch(lowExperience, mockCaseInfo);
      
      // 高经验高评分的分数应该更高
      expect(score1).toBeGreaterThan(score2);
    });
  });

  // ==================== 仲裁员推荐 ====================

  describe('recommendArbitrators', () => {
    it('应该推荐可用的仲裁员', () => {
      const recommended = recommendArbitrators(mockArbitrators, mockCaseInfo, [], 2);
      
      // 应该返回2个仲裁员
      expect(recommended.length).toBe(2);
      
      // 所有推荐的仲裁员应该是可用的
      recommended.forEach(arb => {
        expect(arb.availability).toBe('available');
      });
    });

    it('应该排除指定的仲裁员', () => {
      const recommended = recommendArbitrators(mockArbitrators, mockCaseInfo, ['arb-1'], 2);
      
      // 不应该包含被排除的仲裁员
      expect(recommended.find(a => a.id === 'arb-1')).toBeUndefined();
    });

    it('应该排除有利益冲突的仲裁员', () => {
      const caseWithConflict: CaseInfo = {
        ...mockCaseInfo,
        parties: {
          applicant: 'company-A', // 李四有冲突
          respondent: 'company-B'
        }
      };
      
      const recommended = recommendArbitrators(mockArbitrators, caseWithConflict, [], 3);
      
      // 不应该包含有冲突的仲裁员
      expect(recommended.find(a => a.id === 'arb-2')).toBeUndefined();
    });

    it('应该按匹配度排序', () => {
      const recommended = recommendArbitrators(mockArbitrators, mockCaseInfo, [], 2);
      
      // 第一个应该是匹配度最高的
      const score1 = calculateArbitratorMatch(recommended[0], mockCaseInfo);
      const score2 = calculateArbitratorMatch(recommended[1], mockCaseInfo);
      
      expect(score1).toBeGreaterThanOrEqual(score2);
    });
  });

  // ==================== 利益冲突检测 ====================

  describe('hasConflict', () => {
    it('应该检测到利益冲突', () => {
      const caseWithConflict: CaseInfo = {
        ...mockCaseInfo,
        parties: {
          applicant: 'company-A',
          respondent: 'company-B'
        }
      };
      
      const result = hasConflict(mockArbitrators[1], caseWithConflict);
      
      // 李四与company-A有冲突
      expect(result).toBe(true);
    });

    it('应该检测无利益冲突', () => {
      const result = hasConflict(mockArbitrators[0], mockCaseInfo);
      
      // 张三没有冲突
      expect(result).toBe(false);
    });
  });

  describe('detectPanelConflicts', () => {
    it('应该检测仲裁庭的利益冲突', () => {
      const panel: ArbitrationPanel = {
        id: 'panel-1',
        caseId: 'case-1',
        caseName: '测试案件',
        caseType: '合同纠纷',
        disputeAmount: 1000000,
        composition: {
          presiding: 'arb-2', // 李四有冲突
          members: ['arb-1']
        },
        status: 'forming',
        challenges: []
      };
      
      const caseWithConflict: CaseInfo = {
        ...mockCaseInfo,
        parties: {
          applicant: 'company-A',
          respondent: 'company-B'
        }
      };
      
      const conflicts = detectPanelConflicts(panel, mockArbitrators, caseWithConflict);
      
      // 应该检测到冲突
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0]).toContain('李四');
    });

    it('应该检测无冲突的仲裁庭', () => {
      const panel: ArbitrationPanel = {
        id: 'panel-1',
        caseId: 'case-1',
        caseName: '测试案件',
        caseType: '合同纠纷',
        disputeAmount: 1000000,
        composition: {
          presiding: 'arb-1',
          members: []
        },
        status: 'forming',
        challenges: []
      };
      
      const conflicts = detectPanelConflicts(panel, mockArbitrators, mockCaseInfo);
      
      // 不应该有冲突
      expect(conflicts.length).toBe(0);
    });
  });

  // ==================== 仲裁庭配置验证 ====================

  describe('validatePanelComposition', () => {
    it('应该验证合法的仲裁庭配置', () => {
      const panel: ArbitrationPanel = {
        id: 'panel-1',
        caseId: 'case-1',
        caseName: '测试案件',
        caseType: '合同纠纷',
        disputeAmount: 1000000,
        composition: {
          presiding: 'arb-1', // 张三，经验15年
          members: []
        },
        status: 'forming',
        challenges: []
      };
      
      const result = validatePanelComposition(panel, mockArbitrators, mockCaseInfo);
      
      // 应该是合法的
      expect(result.isValid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('应该检测缺少首席仲裁员', () => {
      const panel: ArbitrationPanel = {
        id: 'panel-1',
        caseId: 'case-1',
        caseName: '测试案件',
        caseType: '合同纠纷',
        disputeAmount: 1000000,
        composition: {
          presiding: null,
          members: []
        },
        status: 'forming',
        challenges: []
      };
      
      const result = validatePanelComposition(panel, mockArbitrators, mockCaseInfo);
      
      // 应该有问题
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('未指定首席仲裁员');
    });

    it('应该警告首席仲裁员经验不足', () => {
      const panel: ArbitrationPanel = {
        id: 'panel-1',
        caseId: 'case-1',
        caseName: '测试案件',
        caseType: '合同纠纷',
        disputeAmount: 1000000,
        composition: {
          presiding: 'arb-3', // 王五，经验8年
          members: []
        },
        status: 'forming',
        challenges: []
      };
      
      const result = validatePanelComposition(panel, mockArbitrators, mockCaseInfo);
      
      // 应该有警告
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('经验不足10年'))).toBe(true);
    });

    it('应该警告仲裁员数量为偶数', () => {
      const panel: ArbitrationPanel = {
        id: 'panel-1',
        caseId: 'case-1',
        caseName: '测试案件',
        caseType: '合同纠纷',
        disputeAmount: 1000000,
        composition: {
          presiding: 'arb-1',
          members: ['arb-2'] // 总共2个
        },
        status: 'forming',
        challenges: []
      };
      
      const result = validatePanelComposition(panel, mockArbitrators, mockCaseInfo);
      
      // 应该有警告
      expect(result.warnings.some(w => w.includes('偶数'))).toBe(true);
    });
  });

  // ==================== 自动组建仲裁庭 ====================

  describe('autoFormPanel', () => {
    it('应该自动组建仲裁庭', () => {
      const composition = autoFormPanel(mockArbitrators, mockCaseInfo, 3);
      
      // 应该有首席仲裁员
      expect(composition.presiding).toBeTruthy();
      
      // 应该有2个成员（总共3个）
      expect(composition.members.length).toBe(2);
      
      // 首席仲裁员不应该在成员列表中
      expect(composition.members).not.toContain(composition.presiding);
    });

    it('应该选择经验丰富的首席仲裁员', () => {
      const composition = autoFormPanel(mockArbitrators, mockCaseInfo, 3);
      
      const presiding = mockArbitrators.find(a => a.id === composition.presiding);
      
      // 首席仲裁员应该有至少10年经验
      expect(presiding?.experience).toBeGreaterThanOrEqual(10);
    });

    it('应该处理空仲裁庭', () => {
      const composition = autoFormPanel(mockArbitrators, mockCaseInfo, 0);
      
      // 应该返回空配置
      expect(composition.presiding).toBeNull();
      expect(composition.members.length).toBe(0);
    });
  });

  // ==================== 创建仲裁庭 ====================

  describe('createArbitrationPanel', () => {
    it('应该创建仲裁庭', () => {
      const panel = createArbitrationPanel(mockCaseInfo, mockArbitrators, false);
      
      // 应该有ID
      expect(panel.id).toBeTruthy();
      
      // 应该有案件信息
      expect(panel.caseId).toBe(mockCaseInfo.id);
      expect(panel.caseType).toBe(mockCaseInfo.type);
      
      // 应该是forming状态
      expect(panel.status).toBe('forming');
      
      // 应该有空的配置
      expect(panel.composition.presiding).toBeNull();
      expect(panel.composition.members.length).toBe(0);
    });

    it('应该自动组建仲裁庭', () => {
      const panel = createArbitrationPanel(mockCaseInfo, mockArbitrators, true);
      
      // 应该有首席仲裁员
      expect(panel.composition.presiding).toBeTruthy();
      
      // 应该有成员
      expect(panel.composition.members.length).toBeGreaterThan(0);
    });
  });
});

