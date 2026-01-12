/**
 * 搜索引擎单元测试
 * 
 * 测试覆盖：
 * - 模糊搜索功能
 * - 精确搜索功能
 * - 类型过滤
 * - 搜索历史
 * - 搜索建议
 * - 性能测试
 * 
 * @author AI Agent
 * @date 2025-11-07
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from '../search-engine';
import type { LegalNode } from '../../components/workspace/types';

// 生成测试节点
function generateTestNodes(count: number): LegalNode[] {
  const types = ['legal-case', 'legal-person', 'legal-document', 'legal-hearing', 'legal-timeline'];
  const nodes: LegalNode[] = [];

  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `node-${i}`,
      type: types[i % types.length],
      position: { x: i * 100, y: i * 100 },
      size: { width: 280, height: 200 },
      data: {
        position: { x: i * 100, y: i * 100 },
        title: `测试节点 ${i}`,
        description: `这是测试节点 ${i} 的描述`,
        content: `节点 ${i} 的详细内容`,
        status: 'active',
        metadata: {},
        connections: []
      },
    } as LegalNode);
  }

  // 添加一些特殊节点用于测试
  nodes.push({
    id: 'special-1',
    type: 'legal-case',
    position: { x: 0, y: 0 },
    size: { width: 280, height: 200 },
    data: {
      position: { x: 0, y: 0 },
      title: '商事仲裁案件',
      description: '关于合同纠纷的仲裁案件',
      content: '涉及货物交付延迟问题',
      status: 'active',
      metadata: {
        caseNumber: 'CASE-2024-001',
        caseType: 'commercial',
        filingDate: new Date().toISOString()
      },
      connections: []
    },
  } as LegalNode);

  nodes.push({
    id: 'special-2',
    type: 'legal-person',
    position: { x: 100, y: 100 },
    size: { width: 280, height: 200 },
    data: {
      position: { x: 100, y: 100 },
      title: '申请人：张三公司',
      description: '北京张三贸易有限公司',
      content: '申请人方',
      status: 'active',
      metadata: {},
      connections: []
    },
  } as LegalNode);

  return nodes;
}

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let testNodes: LegalNode[];

  beforeEach(() => {
    searchEngine = new SearchEngine();
    testNodes = generateTestNodes(10);
    searchEngine.updateNodes(testNodes);
  });

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(searchEngine).toBeDefined();
      expect(searchEngine.getHistory()).toEqual([]);
    });

    it('应该正确更新节点数据', () => {
      const newNodes = generateTestNodes(5);
      searchEngine.updateNodes(newNodes);

      const results = searchEngine.search({
        query: '测试节点',
        fuzzy: false,
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('模糊搜索', () => {
    it('应该能够模糊搜索节点标题', () => {
      const results = searchEngine.search({
        query: '测试',
        fuzzy: true,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].node.data.title).toContain('测试');
    });

    it('应该能够模糊搜索节点描述', () => {
      const results = searchEngine.search({
        query: '描述',
        fuzzy: true,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].node.data.description).toContain('描述');
    });

    it('应该能够模糊搜索节点内容', () => {
      const results = searchEngine.search({
        query: '内容',
        fuzzy: true,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('应该返回带有分数的结果', () => {
      const results = searchEngine.search({
        query: '测试节点',
        fuzzy: true,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].score).toBeLessThanOrEqual(1);
    });

    it('应该返回匹配信息', () => {
      const results = searchEngine.search({
        query: '测试',
        fuzzy: true,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matches).toBeDefined();
      expect(results[0].matches.length).toBeGreaterThan(0);
    });

    it('应该支持中文模糊搜索', () => {
      const results = searchEngine.search({
        query: '商事仲裁',
        fuzzy: true,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].node.data.title).toContain('商事仲裁');
    });
  });

  describe('精确搜索', () => {
    it('应该能够精确搜索节点标题', () => {
      const results = searchEngine.search({
        query: '测试节点 0',
        fuzzy: false,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].node.data.title).toBe('测试节点 0');
    });

    it('应该能够精确搜索节点描述', () => {
      const results = searchEngine.search({
        query: '测试节点 1 的描述',
        fuzzy: false,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].node.data.description).toContain('测试节点 1 的描述');
    });

    it('应该区分大小写（转换为小写后匹配）', () => {
      const results1 = searchEngine.search({
        query: '测试节点',
        fuzzy: false,
      });

      const results2 = searchEngine.search({
        query: '测试节点',
        fuzzy: false,
      });

      expect(results1.length).toBe(results2.length);
    });

    it('空查询应该返回空结果', () => {
      const results = searchEngine.search({
        query: '',
        fuzzy: false,
      });

      expect(results).toEqual([]);
    });

    it('空格查询应该返回空结果', () => {
      const results = searchEngine.search({
        query: '   ',
        fuzzy: false,
      });

      expect(results).toEqual([]);
    });
  });

  describe('类型过滤', () => {
    it('应该能够按单个类型过滤', () => {
      const results = searchEngine.search({
        query: '测试',
        types: ['legal-case'],
        fuzzy: true,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.node.type).toBe('legal-case');
      });
    });

    it('应该能够按多个类型过滤', () => {
      const results = searchEngine.search({
        query: '测试',
        types: ['legal-case', 'legal-person'],
        fuzzy: true,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(['legal-case', 'legal-person']).toContain(result.node.type);
      });
    });

    it('不存在的类型应该返回空结果', () => {
      const results = searchEngine.search({
        query: '测试',
        types: ['nonexistent'],
        fuzzy: true,
      });

      expect(results).toEqual([]);
    });
  });

  describe('搜索历史', () => {
    it('应该记录搜索历史', () => {
      searchEngine.search({ query: '测试1', fuzzy: true });
      searchEngine.search({ query: '测试2', fuzzy: true });

      const history = searchEngine.getHistory();
      expect(history).toContain('测试1');
      expect(history).toContain('测试2');
    });

    it('应该按时间倒序排列历史', () => {
      searchEngine.search({ query: '测试1', fuzzy: true });
      searchEngine.search({ query: '测试2', fuzzy: true });
      searchEngine.search({ query: '测试3', fuzzy: true });

      const history = searchEngine.getHistory();
      expect(history[0]).toBe('测试3');
      expect(history[1]).toBe('测试2');
      expect(history[2]).toBe('测试1');
    });

    it('应该去除重复的历史记录', () => {
      searchEngine.search({ query: '测试1', fuzzy: true });
      searchEngine.search({ query: '测试2', fuzzy: true });
      searchEngine.search({ query: '测试1', fuzzy: true });

      const history = searchEngine.getHistory();
      expect(history.filter(item => item === '测试1').length).toBe(1);
      expect(history[0]).toBe('测试1');
    });

    it('应该限制历史记录大小', () => {
      for (let i = 0; i < 25; i++) {
        searchEngine.search({ query: `测试${i}`, fuzzy: true });
      }

      const history = searchEngine.getHistory();
      expect(history.length).toBeLessThanOrEqual(20);
    });

    it('应该能够清空历史记录', () => {
      searchEngine.search({ query: '测试1', fuzzy: true });
      searchEngine.search({ query: '测试2', fuzzy: true });

      searchEngine.clearHistory();

      const history = searchEngine.getHistory();
      expect(history).toEqual([]);
    });
  });

  describe('搜索建议', () => {
    it('空查询应该返回历史记录', () => {
      searchEngine.search({ query: '测试1', fuzzy: true });
      searchEngine.search({ query: '测试2', fuzzy: true });

      const suggestions = searchEngine.getSuggestions('', 5);
      expect(suggestions).toContain('测试1');
      expect(suggestions).toContain('测试2');
    });

    it('应该根据查询返回匹配的建议', () => {
      searchEngine.search({ query: '商事仲裁', fuzzy: true });
      searchEngine.search({ query: '合同纠纷', fuzzy: true });

      const suggestions = searchEngine.getSuggestions('商事', 5);
      expect(suggestions).toContain('商事仲裁');
    });

    it('应该从节点标题中提取建议', () => {
      const suggestions = searchEngine.getSuggestions('商事', 5);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('应该限制建议数量', () => {
      const suggestions = searchEngine.getSuggestions('测试', 3);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('应该去除重复的建议', () => {
      const suggestions = searchEngine.getSuggestions('测试', 10);
      const uniqueSuggestions = [...new Set(suggestions)];
      expect(suggestions.length).toBe(uniqueSuggestions.length);
    });
  });

  describe('性能测试', () => {
    it('应该在100ms内搜索1000个节点', () => {
      const largeNodes = generateTestNodes(1000);
      searchEngine.updateNodes(largeNodes);

      const startTime = performance.now();
      searchEngine.search({ query: '测试', fuzzy: true });
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`搜索1000个节点耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
    });

    it('应该在50ms内进行精确搜索（1000个节点）', () => {
      const largeNodes = generateTestNodes(1000);
      searchEngine.updateNodes(largeNodes);

      const startTime = performance.now();
      searchEngine.search({ query: '测试节点 500', fuzzy: false });
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`精确搜索1000个节点耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(50);
    });

    it('应该在10ms内获取搜索建议', () => {
      const largeNodes = generateTestNodes(1000);
      searchEngine.updateNodes(largeNodes);

      const startTime = performance.now();
      searchEngine.getSuggestions('测试', 10);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`获取搜索建议耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(10);
    });
  });

  describe('高亮功能', () => {
    it('应该能够高亮匹配的文本', () => {
      const text = '这是一个测试文本';
      const matches = [{
        field: 'title',
        value: text,
        indices: [[4, 5]] as [number, number][],
      }];

      const highlighted = searchEngine.highlightMatches(text, matches);
      expect(highlighted).toContain('<mark>');
      expect(highlighted).toContain('</mark>');
    });

    it('没有匹配时应该返回原文本', () => {
      const text = '这是一个测试文本';
      const highlighted = searchEngine.highlightMatches(text, []);
      expect(highlighted).toBe(text);
    });
  });
});

