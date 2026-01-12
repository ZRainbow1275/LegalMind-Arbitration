/**
 * HearingDataAdapter单元测试
 */

import { describe, it, expect } from 'vitest';
import { HearingDataAdapter } from '../HearingDataAdapter';

describe('HearingDataAdapter', () => {
  const adapter = new HearingDataAdapter();

  describe('toCanvas', () => {
    it('应该将庭审数据转换为画布数据', () => {
      const hearingData = {
        id: 'hearing-1',
        type: 'hearing' as const,
        caseId: 'case-1',
        hearingDate: '2025-01-01',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [
          { id: 'p1', name: '原告', role: 'plaintiff' as const },
          { id: 'p2', name: '被告', role: 'defendant' as const },
        ],
        evidences: [ // 实际字段名：evidences
          {
            id: 'e1',
            title: '证据1',
            type: 'document' as const,
            description: '证据描述',
            submittedBy: 'p1',
            submittedAt: '2025-01-01'
          },
        ],
        timeline: [
          {
            id: 't1',
            timestamp: '2025-01-01 10:00',
            type: 'statement' as const,
            description: '开庭陈述',
            relatedParticipants: ['p1'],
            relatedEvidences: []
          },
        ],
        decisions: [],
      };

      const canvasData = adapter.toCanvas(hearingData);

      expect(canvasData.elements).toBeDefined();
      expect(Object.keys(canvasData.elements).length).toBeGreaterThan(0);
    });

    it('应该创建参与者节点', () => {
      const hearingData = {
        id: 'hearing-1',
        type: 'hearing' as const,
        caseId: 'case-1',
        hearingDate: '2025-01-01',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [
          { id: 'p1', name: '原告', role: 'plaintiff' as const },
        ],
        evidences: [], // 实际字段名：evidences
        timeline: [],
        decisions: [],
      };

      const canvasData = adapter.toCanvas(hearingData);
      const elements = Object.values(canvasData.elements);

      // 实际创建的是LegalNode类型，不是text类型
      const participantElements = elements.filter(el =>
        el.type === 'party'
      );

      expect(participantElements.length).toBeGreaterThan(0);
    });

    it('应该创建证据节点', () => {
      const hearingData = {
        id: 'hearing-1',
        type: 'hearing' as const,
        caseId: 'case-1',
        hearingDate: '2025-01-01',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [],
        evidences: [ // 实际字段名：evidences
          {
            id: 'e1',
            title: '证据1',
            type: 'document' as const,
            description: '证据描述',
            submittedBy: 'p1',
            submittedAt: '2025-01-01'
          },
        ],
        timeline: [],
        decisions: [],
      };

      const canvasData = adapter.toCanvas(hearingData);
      const elements = Object.values(canvasData.elements);

      // 实际创建的是LegalNode类型，不是text类型
      const evidenceElements = elements.filter(el =>
        el.type === 'evidence'
      );

      expect(evidenceElements.length).toBeGreaterThan(0);
    });

    it('应该创建时间线节点', () => {
      const hearingData = {
        id: 'hearing-1',
        type: 'hearing' as const,
        caseId: 'case-1',
        hearingDate: '2025-01-01',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [],
        evidences: [], // 实际字段名：evidences
        timeline: [
          {
            id: 't1',
            timestamp: '2025-01-01 10:00',
            type: 'statement' as const,
            description: '开庭陈述',
            relatedParticipants: ['p1'],
            relatedEvidences: []
          },
        ],
        decisions: [],
      };

      const canvasData = adapter.toCanvas(hearingData);
      const elements = Object.values(canvasData.elements);

      // 实际创建的是LegalNode类型，不是text类型
      const timelineElements = elements.filter(el =>
        el.type === 'timeline'
      );

      expect(timelineElements.length).toBeGreaterThan(0);
    });
  });

  describe('fromCanvas', () => {
    it('应该将画布数据转换回庭审数据', () => {
      const hearingData = {
        id: 'hearing-1',
        type: 'hearing' as const,
        caseId: 'case-1',
        hearingDate: '2025-01-01',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [
          { id: 'p1', name: '原告', role: 'plaintiff' as const },
        ],
        evidences: [ // 实际字段名：evidences
          {
            id: 'e1',
            title: '证据1',
            type: 'document' as const,
            description: '证据描述',
            submittedBy: 'p1',
            submittedAt: '2025-01-01'
          },
        ],
        timeline: [
          {
            id: 't1',
            timestamp: '2025-01-01 10:00',
            type: 'statement' as const,
            description: '开庭陈述',
            relatedParticipants: ['p1'],
            relatedEvidences: []
          },
        ],
        decisions: [],
      };

      const canvasData = adapter.toCanvas(hearingData);
      const converted = adapter.fromCanvas(canvasData);

      expect(converted.id).toBe(hearingData.id);
      expect(converted.caseId).toBe(hearingData.caseId);
    });

    it('应该保留参与者信息', () => {
      const hearingData = {
        id: 'hearing-1',
        type: 'hearing' as const,
        caseId: 'case-1',
        hearingDate: '2025-01-01',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [
          { id: 'p1', name: '原告', role: 'plaintiff' as const },
          { id: 'p2', name: '被告', role: 'defendant' as const },
        ],
        evidences: [], // 实际字段名：evidences
        timeline: [],
        decisions: [],
      };

      const canvasData = adapter.toCanvas(hearingData);
      const converted = adapter.fromCanvas(canvasData);

      expect(converted.participants.length).toBe(2);
    });
  });

  describe('validate', () => {
    it('应该验证合法的庭审数据', () => {
      const hearingData = {
        id: 'hearing-1',
        type: 'hearing' as const,
        caseId: 'case-1',
        hearingDate: '2025-01-01',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [
          { id: 'p1', name: '原告', role: 'plaintiff' as const },
        ],
        evidences: [], // 实际字段名：evidences
        timeline: [],
        decisions: [],
      };

      const result = adapter.validate(hearingData);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('应该检测缺少必填字段', () => {
      const hearingData = {
        id: 'hearing-1',
        type: 'hearing',
        // 缺少caseId
        hearingDate: '2025-01-01',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [],
        evidences: [], // 实际字段名：evidences
        timeline: [],
        decisions: [],
      };

      const result = adapter.validate(hearingData as any);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该检测无效的参与者', () => {
      const hearingData = {
        id: 'hearing-1',
        type: 'hearing',
        caseId: 'case-1',
        hearingDate: '2025-01-01',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [
          { id: 'p1' }, // 缺少name和role
        ],
        evidences: [], // 实际字段名：evidences
        timeline: [],
        decisions: [],
      };

      const result = adapter.validate(hearingData as any);

      expect(result.valid).toBe(false);
    });
  });

  describe('getTemplate', () => {
    it('应该返回庭审模板', () => {
      const template = adapter.getTemplate();

      expect(template.elements).toBeDefined();
      expect(Object.keys(template.elements).length).toBeGreaterThan(0);
    });

    it('模板应该包含基本结构', () => {
      const template = adapter.getTemplate();
      const elements = Object.values(template.elements);

      // 应该有标题
      const titleElements = elements.filter(el =>
        el.type === 'text' && el.content?.includes('庭审')
      );

      expect(titleElements.length).toBeGreaterThan(0);
    });
  });
});

