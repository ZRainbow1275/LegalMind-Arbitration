/**
 * 数据适配器与画布集成测试
 * 
 * 测试HearingDataAdapter和MediationDataAdapter与画布系统的集成
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../../lib/canvas-store';
import { HearingDataAdapter } from '../../adapters/HearingDataAdapter';
import { MediationDataAdapter } from '../../adapters/MediationDataAdapter';
import type { HearingData, MediationData } from '../../types/embedding-interface';

describe('数据适配器与画布集成测试', () => {
  beforeEach(() => {
    // 重置store
    useCanvasStore.setState({
      canvas: null,
      selection: { elementIds: [] },
      history: [],
      historyIndex: -1,
      loading: false,
      error: null,
    });
  });

  describe('HearingDataAdapter集成', () => {
    const hearingAdapter = new HearingDataAdapter();

    it('应该将庭审数据转换为画布数据并加载', () => {
      const { initCanvas, getAllElements } = useCanvasStore.getState();

      // 创建庭审数据
      const hearingData: HearingData = {
        id: 'hearing-1',
        type: 'hearing',
        caseId: 'case-1',
        hearingDate: '2025-01-15',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [
          { id: 'p1', name: '张三', role: 'plaintiff' },
          { id: 'p2', name: '李四', role: 'defendant' },
          { id: 'p3', name: '王法官', role: 'arbitrator' },
        ],
        evidences: [
          { id: 'e1', title: '合同文件', type: 'document', submittedBy: 'p1', description: '合同原件', submittedAt: '2025-01-15T09:00:00Z' },
          { id: 'e2', title: '转账记录', type: 'document', submittedBy: 'p1', description: '银行转账凭证', submittedAt: '2025-01-15T09:05:00Z' },
        ],
        timeline: [
          {
            id: 't1',
            timestamp: '2025-01-15T09:00:00Z',
            type: 'statement',
            description: '庭审开始',
            relatedParticipants: ['p3'],
            relatedEvidences: []
          },
          {
            id: 't2',
            timestamp: '2025-01-15T09:15:00Z',
            type: 'statement',
            description: '原告陈述',
            relatedParticipants: ['p1'],
            relatedEvidences: ['e1', 'e2'],
          },
        ],
        decisions: [],
      };

      // 转换为画布数据
      const canvasData = hearingAdapter.toCanvas(hearingData);

      // 初始化画布
      initCanvas('Test Canvas');
      useCanvasStore.setState({ canvas: canvasData });

      // 验证元素已加载
      const elements = getAllElements();
      expect(elements.length).toBeGreaterThan(0);

      // 验证包含参与人节点
      const participantNodes = elements.filter(el => el.type === 'party');
      expect(participantNodes.length).toBe(3);

      // 验证包含证据节点
      const evidenceNodes = elements.filter(el => el.type === 'evidence');
      expect(evidenceNodes.length).toBe(2);

      // 验证包含时间线节点
      const timelineNodes = elements.filter(el => el.type === 'timeline');
      expect(timelineNodes.length).toBe(2);
    });

    it('应该支持画布数据转换回庭审数据', () => {
      const { initCanvas } = useCanvasStore.getState();

      // 创建庭审数据
      const originalData: HearingData = {
        id: 'hearing-2',
        type: 'hearing',
        caseId: 'case-2',
        hearingDate: '2025-01-20',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [
          { id: 'p1', name: '赵六', role: 'plaintiff' },
          { id: 'p2', name: '孙七', role: 'defendant' },
        ],
        evidences: [
          { id: 'e1', title: '证据1', type: 'document', submittedBy: 'p1', description: '证据描述', submittedAt: '2025-01-20T09:00:00Z' },
        ],
        timeline: [],
        decisions: [],
      };

      // 转换为画布数据
      const canvasData = hearingAdapter.toCanvas(originalData);

      // 加载到画布
      initCanvas('Test Canvas');
      useCanvasStore.setState({ canvas: canvasData });

      // 转换回庭审数据
      const convertedData = hearingAdapter.fromCanvas(canvasData);

      // 验证数据一致性
      expect(convertedData.id).toBe(originalData.id);
      expect(convertedData.caseId).toBe(originalData.caseId);
      expect(convertedData.participants.length).toBe(originalData.participants.length);
      expect(convertedData.evidences.length).toBe(originalData.evidences.length);
    });

    it('应该验证庭审数据的有效性', () => {
      const invalidData: HearingData = {
        id: '',
        caseId: '',
        hearingDate: '2025-01-15',
        type: 'hearing',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [
          { id: 'p1', name: '', role: 'plaintiff' }, // 缺少名称
        ],
        evidences: [],
        timeline: [],
        decisions: [],
      };

      const result = hearingAdapter.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
      expect(result.errors.some(e => e.field === 'caseId')).toBe(true);
      expect(result.errors.some(e => e.field.includes('participants'))).toBe(true);
    });

    it('应该加载庭审模板', () => {
      const { initCanvas, getAllElements } = useCanvasStore.getState();

      // 获取模板
      const template = hearingAdapter.getTemplate();

      // 加载模板
      initCanvas('Test Canvas');
      useCanvasStore.setState({ canvas: template });

      // 验证模板包含基本元素
      const elements = getAllElements();
      expect(elements.length).toBeGreaterThan(0);

      // 验证包含标题
      const titleElements = elements.filter(el => el.type === 'text' && el.content?.includes('庭审'));
      expect(titleElements.length).toBeGreaterThan(0);
    });
  });

  describe('MediationDataAdapter集成', () => {
    const mediationAdapter = new MediationDataAdapter();

    it('应该将调解数据转换为画布数据并加载', () => {
      const { initCanvas, getAllElements } = useCanvasStore.getState();

      // 创建调解数据
      const mediationData: MediationData = {
        id: 'mediation-1',
        type: 'mediation',
        caseId: 'case-1',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parties: [
          { id: 'p1', name: '甲方', type: 'individual', interests: [], concerns: [] },
          { id: 'p2', name: '乙方', type: 'organization', interests: [], concerns: [] },
        ],
        mediator: { id: 'm1', name: '调解员张三' },
        disputes: [
          { id: 'd1', title: '合同纠纷', description: '合同纠纷', category: 'contract', severity: 'high', relatedParties: ['p1', 'p2'] },
        ],
        proposals: [
          { id: 'pr1', title: '方案1', content: '分期付款方案', proposedBy: 'p1', status: 'pending', proposedAt: '2025-01-15T10:00:00Z', relatedDisputes: ['d1'] },
        ],
        agreements: [],
      };

      // 转换为画布数据
      const canvasData = mediationAdapter.toCanvas(mediationData);

      // 初始化画布
      initCanvas('Test Canvas');
      useCanvasStore.setState({ canvas: canvasData });

      // 验证元素已加载
      const elements = getAllElements();
      expect(elements.length).toBeGreaterThan(0);

      // 验证包含当事人节点
      const partyNodes = elements.filter(el => el.type === 'party');
      expect(partyNodes.length).toBe(2);

      // 验证包含调解员节点（使用person类型）
      const mediatorNodes = elements.filter(el => el.type === 'person');
      expect(mediatorNodes.length).toBeGreaterThanOrEqual(1);

      // 验证包含争议节点（使用claim类型）
      const disputeNodes = elements.filter(el => el.type === 'claim');
      expect(disputeNodes.length).toBeGreaterThanOrEqual(1);
    });

    it('应该支持画布数据转换回调解数据', () => {
      const { initCanvas } = useCanvasStore.getState();

      // 创建调解数据
      const originalData: MediationData = {
        id: 'mediation-2',
        type: 'mediation',
        caseId: 'case-2',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parties: [
          { id: 'p1', name: '甲方', type: 'individual', interests: [], concerns: [] },
          { id: 'p2', name: '乙方', type: 'organization', interests: [], concerns: [] },
        ],
        mediator: { id: 'm1', name: '调解员' },
        disputes: [],
        proposals: [],
        agreements: [],
      };

      // 转换为画布数据
      const canvasData = mediationAdapter.toCanvas(originalData);

      // 加载到画布
      initCanvas('Test Canvas');
      useCanvasStore.setState({ canvas: canvasData });

      // 转换回调解数据
      const convertedData = mediationAdapter.fromCanvas(canvasData);

      // 验证数据一致性
      expect(convertedData.id).toBe(originalData.id);
      expect(convertedData.caseId).toBe(originalData.caseId);
      expect(convertedData.parties.length).toBe(originalData.parties.length);
      expect(convertedData.mediator.name).toBe(originalData.mediator.name);
    });

    it('应该验证调解数据的有效性', () => {
      const invalidData: MediationData = {
        id: '',
        type: 'mediation',
        caseId: '',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parties: [],
        mediator: { id: 'm1', name: '' }, // 缺少名称
        disputes: [],
        proposals: [],
        agreements: [],
      };

      const result = mediationAdapter.validate(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该加载调解模板', () => {
      const { initCanvas, getAllElements } = useCanvasStore.getState();

      // 获取模板
      const template = mediationAdapter.getTemplate();

      // 加载模板
      initCanvas('Test Canvas');
      useCanvasStore.setState({ canvas: template });

      // 验证模板包含基本元素
      const elements = getAllElements();
      expect(elements.length).toBeGreaterThan(0);

      // 验证包含标题
      const titleElements = elements.filter(el => el.type === 'text' && el.content?.includes('调解'));
      expect(titleElements.length).toBeGreaterThan(0);
    });
  });

  describe('适配器切换', () => {
    it('应该支持在不同适配器之间切换', () => {
      const { initCanvas, getAllElements } = useCanvasStore.getState();
      const hearingAdapter = new HearingDataAdapter();
      const mediationAdapter = new MediationDataAdapter();

      // 加载庭审模板
      const hearingTemplate = hearingAdapter.getTemplate();
      initCanvas('Test Canvas');
      useCanvasStore.setState({ canvas: hearingTemplate });

      const hearingElements = getAllElements();
      expect(hearingElements.length).toBeGreaterThan(0);

      // 切换到调解模板
      const mediationTemplate = mediationAdapter.getTemplate();
      useCanvasStore.setState({ canvas: mediationTemplate });

      const mediationElements = getAllElements();
      expect(mediationElements.length).toBeGreaterThan(0);
      expect(mediationElements).not.toEqual(hearingElements);
    });
  });
});

