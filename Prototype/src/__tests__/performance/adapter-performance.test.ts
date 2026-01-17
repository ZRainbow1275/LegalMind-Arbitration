/**
 * 数据适配器性能测试
 * 
 * 测试目标：
 * 1. 大量数据转换性能
 * 2. 数据验证性能
 * 3. 模板生成性能
 */

import { describe, it, expect } from 'vitest';
import { HearingDataAdapter } from '../../adapters/HearingDataAdapter';
import { MediationDataAdapter } from '../../adapters/MediationDataAdapter';
import type { HearingData, MediationData } from '../../types/embedding-interface';

const describePerf = process.env.RUN_PERF_TESTS === '1' ? describe : describe.skip;

describePerf('数据适配器性能测试', () => {
  describe('HearingDataAdapter性能', () => {
    it('应该在100ms内转换包含100个参与者的庭审数据', () => {
      const adapter = new HearingDataAdapter();

      // 创建包含100个参与者的庭审数据
      const hearingData: HearingData = {
        id: 'hearing-perf-001',
        type: 'hearing',
        caseId: 'CASE-2024-001',
        hearingDate: new Date().toISOString(),
        participants: Array.from({ length: 100 }, (_, i) => ({
          id: `participant-${i}`,
          name: `参与者${i}`,
          role: i % 3 === 0 ? 'plaintiff' : i % 3 === 1 ? 'defendant' : 'witness',
          organization: `组织${i}`,
        })),
        evidences: Array.from({ length: 50 }, (_, i) => ({
          id: `evidence-${i}`,
          title: `证据${i}`,
          description: `证据描述${i}`,
          type: 'document',
          submittedBy: `participant-${i % 100}`,
          submittedAt: new Date().toISOString(),
        })),
        timeline: Array.from({ length: 30 }, (_, i) => ({
          id: `event-${i}`,
          timestamp: new Date(Date.now() + i * 3600000).toISOString(),
          type: 'statement',
          description: `事件${i}`,
          participants: [`participant-${i % 100}`],
          relatedParticipants: [`participant-${i % 100}`],
          relatedEvidences: [],
        })),
        decisions: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 测试转换性能
      const startTime = performance.now();
      const canvasData = adapter.toCanvas(hearingData);
      const convertTime = performance.now() - startTime;

      console.log(`转换100个参与者的庭审数据耗时: ${convertTime.toFixed(2)}ms`);
      console.log(`生成的画布元素数量: ${Object.keys(canvasData.elements).length}`);
      expect(convertTime).toBeLessThan(100);
    });

    it('应该在50ms内转换包含50个参与者的庭审数据', () => {
      const adapter = new HearingDataAdapter();

      // 创建包含50个参与者的庭审数据
      const hearingData: HearingData = {
        id: 'hearing-perf-002',
        type: 'hearing',
        caseId: 'CASE-2024-002',
        hearingDate: new Date().toISOString(),
        participants: Array.from({ length: 50 }, (_, i) => ({
          id: `participant-${i}`,
          name: `参与者${i}`,
          role: i % 3 === 0 ? 'plaintiff' : i % 3 === 1 ? 'defendant' : 'witness',
        })),
        evidences: Array.from({ length: 25 }, (_, i) => ({
          id: `evidence-${i}`,
          title: `证据${i}`,
          description: `证据描述${i}`,
          type: 'document',
          submittedBy: `participant-${i % 50}`,
          submittedAt: new Date().toISOString(),
        })),
        timeline: [],
        decisions: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 测试转换性能
      const startTime = performance.now();
      adapter.toCanvas(hearingData);
      const convertTime = performance.now() - startTime;

      console.log(`转换50个参与者的庭审数据耗时: ${convertTime.toFixed(2)}ms`);
      expect(convertTime).toBeLessThan(50);
    });

    it('应该在50ms内验证包含100个参与者的庭审数据', () => {
      const adapter = new HearingDataAdapter();

      // 创建包含100个参与者的庭审数据
      const hearingData: HearingData = {
        id: 'hearing-perf-003',
        type: 'hearing',
        caseId: 'CASE-2024-003',
        hearingDate: new Date().toISOString(),
        participants: Array.from({ length: 100 }, (_, i) => ({
          id: `participant-${i}`,
          name: `参与者${i}`,
          role: i % 3 === 0 ? 'plaintiff' : i % 3 === 1 ? 'defendant' : 'witness',
        })),
        evidences: [],
        timeline: [],
        decisions: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 测试验证性能
      const startTime = performance.now();
      const result = adapter.validate(hearingData);
      const validateTime = performance.now() - startTime;

      console.log(`验证100个参与者的庭审数据耗时: ${validateTime.toFixed(2)}ms`);
      expect(validateTime).toBeLessThan(50);
      expect(result.valid).toBe(true);
    });

    it('应该在10ms内生成庭审模板', () => {
      const adapter = new HearingDataAdapter();

      // 测试模板生成性能
      const startTime = performance.now();
      const template = adapter.getTemplate();
      const generateTime = performance.now() - startTime;

      console.log(`生成庭审模板耗时: ${generateTime.toFixed(2)}ms`);
      expect(generateTime).toBeLessThan(10);
      expect(template.elements).toBeDefined();
    });

    it('应该在100ms内完成双向转换（100个参与者）', () => {
      const adapter = new HearingDataAdapter();

      // 创建包含100个参与者的庭审数据
      const hearingData: HearingData = {
        id: 'hearing-perf-004',
        type: 'hearing',
        caseId: 'CASE-2024-004',
        hearingDate: new Date().toISOString(),
        participants: Array.from({ length: 100 }, (_, i) => ({
          id: `participant-${i}`,
          name: `参与者${i}`,
          role: i % 3 === 0 ? 'plaintiff' : i % 3 === 1 ? 'defendant' : 'witness',
        })),
        evidences: [],
        timeline: [],
        decisions: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 测试双向转换性能
      const startTime = performance.now();
      const canvasData = adapter.toCanvas(hearingData);
      const convertedBack = adapter.fromCanvas(canvasData);
      const totalTime = performance.now() - startTime;

      console.log(`双向转换100个参与者的庭审数据耗时: ${totalTime.toFixed(2)}ms`);
      expect(totalTime).toBeLessThan(100);
      expect(convertedBack.participants.length).toBe(100);
    });
  });

  describe('MediationDataAdapter性能', () => {
    it('应该在100ms内转换包含50个当事方的调解数据', () => {
      const adapter = new MediationDataAdapter();

      // 创建包含50个当事方的调解数据
      const mediationData: MediationData = {
        id: 'mediation-perf-001',
        type: 'mediation',
        caseId: 'CASE-2024-001',
        mediator: {
          id: 'mediator-001',
          name: '调解员',
        },
        parties: Array.from({ length: 50 }, (_, i) => ({
          id: `party-${i}`,
          name: `当事方${i}`,
          type: i % 2 === 0 ? 'individual' : 'organization',
          interests: [`利益${i}`],
          concerns: [`关注点${i}`],
        })),
        disputes: Array.from({ length: 20 }, (_, i) => ({
          id: `dispute-${i}`,
          title: `争议${i}`,
          description: `争议描述${i}`,
          category: 'contract',
          severity: 'medium',
          relatedParties: [`party-${i % 50}`],
        })),
        proposals: [],
        agreements: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 测试转换性能
      const startTime = performance.now();
      const canvasData = adapter.toCanvas(mediationData);
      const convertTime = performance.now() - startTime;

      console.log(`转换50个当事方的调解数据耗时: ${convertTime.toFixed(2)}ms`);
      console.log(`生成的画布元素数量: ${Object.keys(canvasData.elements).length}`);
      expect(convertTime).toBeLessThan(100);
    });

    it('应该在50ms内验证包含50个当事方的调解数据', () => {
      const adapter = new MediationDataAdapter();

      // 创建包含50个当事方的调解数据
      const mediationData: MediationData = {
        id: 'mediation-perf-002',
        type: 'mediation',
        caseId: 'CASE-2024-002',
        mediator: {
          id: 'mediator-001',
          name: '调解员',
        },
        parties: Array.from({ length: 50 }, (_, i) => ({
          id: `party-${i}`,
          name: `当事方${i}`,
          type: 'individual',
          interests: [],
          concerns: [],
        })),
        disputes: [],
        proposals: [],
        agreements: [],
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 测试验证性能
      const startTime = performance.now();
      const result = adapter.validate(mediationData);
      const validateTime = performance.now() - startTime;

      console.log(`验证50个当事方的调解数据耗时: ${validateTime.toFixed(2)}ms`);
      expect(validateTime).toBeLessThan(50);
      expect(result.valid).toBe(true);
    });

    it('应该在10ms内生成调解模板', () => {
      const adapter = new MediationDataAdapter();

      // 测试模板生成性能
      const startTime = performance.now();
      const template = adapter.getTemplate();
      const generateTime = performance.now() - startTime;

      console.log(`生成调解模板耗时: ${generateTime.toFixed(2)}ms`);
      expect(generateTime).toBeLessThan(10);
      expect(template.elements).toBeDefined();
    });
  });
});
