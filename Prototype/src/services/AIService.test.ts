/**
 * AIService单元测试
 * 
 * 测试AI服务接口和MockAIService实现
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIServiceFactory, MockAIService } from './AIService';

describe('AIServiceFactory', () => {
  it('应该创建MockAIService实例', () => {
    const service = AIServiceFactory.create('mock');
    expect(service).toBeInstanceOf(MockAIService);
  });

  it('应该返回默认的MockAIService', () => {
    const service = AIServiceFactory.getDefault();
    expect(service).toBeInstanceOf(MockAIService);
  });

  it('应该在请求不支持的提供商时抛出错误', () => {
    expect(() => AIServiceFactory.create('openai' as any)).toThrow();
    expect(() => AIServiceFactory.create('claude' as any)).toThrow();
    expect(() => AIServiceFactory.create('local' as any)).toThrow();
  });
});

describe('MockAIService', () => {
  let service: MockAIService;

  beforeEach(() => {
    service = new MockAIService();
  });

  describe('analyzeUserIntent', () => {
    it('应该识别创建案件节点的意图', async () => {
      const response = await service.analyzeUserIntent('创建一个新的案件', {});
      
      expect(response.type).toBe('node-suggestion');
      expect(response.content).toContain('案件');
      expect(response.confidence).toBeGreaterThan(0.8);
      expect(response.metadata?.suggestedNodeType).toBe('legal-case');
    });

    it('应该识别创建人物节点的意图', async () => {
      const response = await service.analyzeUserIntent('添加当事人信息', {});
      
      expect(response.type).toBe('node-suggestion');
      expect(response.content).toContain('人物');
      expect(response.metadata?.suggestedNodeType).toBe('legal-person');
    });

    it('应该识别分析请求', async () => {
      const response = await service.analyzeUserIntent('分析案件关系', {});
      
      expect(response.type).toBe('analysis');
      expect(response.content).toContain('分析');
    });

    it('应该返回默认响应', async () => {
      const response = await service.analyzeUserIntent('随机输入', {});
      
      expect(response.type).toBe('text');
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('应该返回有效的响应ID和时间戳', async () => {
      const response = await service.analyzeUserIntent('测试', {});
      
      expect(response.id).toBeTruthy();
      expect(response.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('suggestNodes', () => {
    it('应该为案件关键词建议案件节点', async () => {
      const suggestions = await service.suggestNodes('创建案件', []);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('legal-case');
      expect(suggestions[0].confidence).toBeGreaterThan(0.8);
    });

    it('应该为人物关键词建议人物节点', async () => {
      const suggestions = await service.suggestNodes('添加当事人', []);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('legal-person');
    });

    it('应该为文档关键词建议文档节点', async () => {
      const suggestions = await service.suggestNodes('上传证据文档', []);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('legal-document');
    });

    it('应该返回空数组如果没有匹配', async () => {
      const suggestions = await service.suggestNodes('随机文本', []);
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('suggestConnections', () => {
    it('应该建议案件和人物之间的连接', async () => {
      const nodes = [
        { id: '1', type: 'legal-case', data: {} },
        { id: '2', type: 'legal-person', data: {} }
      ];
      
      const suggestions = await service.suggestConnections(nodes);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('relationship');
      expect(suggestions[0].fromNodeId).toBe('1');
      expect(suggestions[0].toNodeId).toBe('2');
    });

    it('应该返回空数组如果没有节点', async () => {
      const suggestions = await service.suggestConnections([]);
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('analyzeCaseRelationships', () => {
    it('应该返回案件分析结果', async () => {
      const nodes = [
        { id: '1', type: 'legal-case', data: {} },
        { id: '2', type: 'legal-person', data: {} }
      ];
      
      const analysis = await service.analyzeCaseRelationships(nodes);
      
      expect(analysis.summary).toBeTruthy();
      expect(analysis.keyElements).toBeInstanceOf(Array);
      expect(analysis.risks).toBeInstanceOf(Array);
      expect(analysis.recommendations).toBeInstanceOf(Array);
      expect(analysis.confidence).toBeGreaterThan(0);
    });
  });

  describe('generateLegalDocument', () => {
    it('应该生成仲裁申请书', async () => {
      const document = await service.generateLegalDocument({
        templateType: 'complaint',
        caseData: {
          applicant: '张三',
          respondent: '李四'
        }
      });
      
      expect(document).toContain('仲裁申请书');
      expect(document).toContain('张三');
      expect(document).toContain('李四');
    });

    it('应该生成答辩书', async () => {
      const document = await service.generateLegalDocument({
        templateType: 'answer',
        caseData: {
          respondent: '李四'
        }
      });
      
      expect(document).toContain('答辩书');
      expect(document).toContain('李四');
    });

    it('应该生成默认文档', async () => {
      const document = await service.generateLegalDocument({
        templateType: 'evidence-list' as any,
        caseData: {
          caseNumber: 'ARB-2024-001'
        }
      });
      
      expect(document).toContain('ARB-2024-001');
    });
  });

  describe('isAvailable', () => {
    it('应该始终返回true', async () => {
      const available = await service.isAvailable();
      
      expect(available).toBe(true);
    });
  });
});

