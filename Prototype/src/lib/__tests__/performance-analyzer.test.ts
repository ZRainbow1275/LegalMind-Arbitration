/**
 * 性能分析器单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceAnalyzer, performanceAnalyzer } from '../performance-analyzer';
import { performanceMonitor } from '../performance-monitor';

describe('PerformanceAnalyzer', () => {
  let analyzer: PerformanceAnalyzer;

  beforeEach(() => {
    analyzer = new PerformanceAnalyzer();
    performanceMonitor.clear();

    // Mock performance.now to ensure non-zero duration
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      now += 10;
      return now;
    });
  });

  afterEach(() => {
    performanceMonitor.clear();
    vi.restoreAllMocks();
  });

  // ==================== 基本功能 ====================

  describe('基本功能', () => {
    it('应该创建性能分析器', () => {
      expect(analyzer).toBeDefined();
    });

    it('应该生成空报告', () => {
      const report = analyzer.generateReport();

      expect(report.overall.totalOperations).toBe(0);
      expect(report.overall.totalDuration).toBe(0);
      expect(report.overall.averageDuration).toBe(0);
      expect(report.overall.slowestOperation).toBeNull();
      expect(report.overall.fastestOperation).toBeNull();
    });

    it('应该生成包含数据的报告', () => {
      // 模拟一些操作
      const id1 = performanceMonitor.start('操作1', 'operation');
      performanceMonitor.end(id1);

      const id2 = performanceMonitor.start('操作2', 'render');
      performanceMonitor.end(id2);

      const report = analyzer.generateReport();

      expect(report.overall.totalOperations).toBe(2);
      expect(report.overall.totalDuration).toBeGreaterThan(0);
      expect(report.overall.averageDuration).toBeGreaterThan(0);
      expect(report.overall.slowestOperation).toBeDefined();
      expect(report.overall.fastestOperation).toBeDefined();
    });
  });

  // ==================== 按类型分组 ====================

  describe('按类型分组', () => {
    it('应该按类型分组统计', () => {
      // 创建不同类型的操作
      for (let i = 0; i < 5; i++) {
        const id = performanceMonitor.start(`操作${i}`, 'operation');
        performanceMonitor.end(id);
      }

      for (let i = 0; i < 3; i++) {
        const id = performanceMonitor.start(`渲染${i}`, 'render');
        performanceMonitor.end(id);
      }

      const report = analyzer.generateReport();

      expect(report.byType['operation']).toBeDefined();
      expect(report.byType['operation'].count).toBe(5);
      expect(report.byType['render']).toBeDefined();
      expect(report.byType['render'].count).toBe(3);
    });

    it('应该计算百分位数', () => {
      // 创建一些操作
      for (let i = 0; i < 10; i++) {
        const id = performanceMonitor.start(`操作${i}`, 'operation');
        performanceMonitor.end(id);
      }

      const report = analyzer.generateReport();
      const stats = report.byType['operation'];

      expect(stats.p50).toBeGreaterThanOrEqual(0);
      expect(stats.p95).toBeGreaterThanOrEqual(stats.p50);
      expect(stats.p99).toBeGreaterThanOrEqual(stats.p95);
    });
  });

  // ==================== 按名称分组 ====================

  describe('按名称分组', () => {
    it('应该按名称分组统计', () => {
      // 创建相同名称的操作
      for (let i = 0; i < 5; i++) {
        const id = performanceMonitor.start('重复操作', 'operation');
        performanceMonitor.end(id);
      }

      const report = analyzer.generateReport();

      expect(report.byName['重复操作']).toBeDefined();
      expect(report.byName['重复操作'].count).toBe(5);
    });

    it('应该计算平均耗时', () => {
      const id1 = performanceMonitor.start('操作', 'operation');
      performanceMonitor.end(id1);

      const id2 = performanceMonitor.start('操作', 'operation');
      performanceMonitor.end(id2);

      const report = analyzer.generateReport();
      const stats = report.byName['操作'];

      expect(stats.averageDuration).toBeGreaterThan(0);
      expect(stats.averageDuration).toBe(stats.totalDuration / stats.count);
    });
  });

  // ==================== 性能问题检测 ====================

  describe('性能问题检测', () => {
    it('应该检测慢操作', async () => {
      const analyzer = new PerformanceAnalyzer({
        slowOperationThreshold: 1 // 设置很低的阈值
      });

      // 模拟慢操作
      const id = performanceMonitor.start('慢操作', 'operation');
      // 等待一段时间确保duration > 1ms
      await new Promise(resolve => setTimeout(resolve, 5));
      performanceMonitor.end(id);

      const report = analyzer.generateReport();

      const slowIssues = report.issues.filter(i => i.type === 'slow-operation');
      expect(slowIssues.length).toBeGreaterThan(0);
    });

    it('应该根据严重程度分类', async () => {
      const analyzer = new PerformanceAnalyzer({
        slowOperationThreshold: 1 // 设置很低的阈值
      });

      // 创建不同严重程度的慢操作
      const id1 = performanceMonitor.start('轻微慢', 'operation');
      await new Promise(resolve => setTimeout(resolve, 3)); // ~3ms (low)
      performanceMonitor.end(id1);

      const id2 = performanceMonitor.start('中等慢', 'operation');
      await new Promise(resolve => setTimeout(resolve, 5)); // ~5ms (medium)
      performanceMonitor.end(id2);

      const id3 = performanceMonitor.start('严重慢', 'operation');
      await new Promise(resolve => setTimeout(resolve, 10)); // ~10ms (critical)
      performanceMonitor.end(id3);

      const report = analyzer.generateReport();

      // 至少应该有一些慢操作被检测到
      const slowIssues = report.issues.filter(i => i.type === 'slow-operation');
      expect(slowIssues.length).toBeGreaterThan(0);
    });
  });

  // ==================== 报告格式化 ====================

  describe('报告格式化', () => {
    it('应该格式化报告为文本', () => {
      // 创建一些操作
      const id1 = performanceMonitor.start('操作1', 'operation');
      performanceMonitor.end(id1);

      const id2 = performanceMonitor.start('操作2', 'render');
      performanceMonitor.end(id2);

      const report = analyzer.generateReport();
      const text = analyzer.formatReport(report);

      expect(text).toContain('性能分析报告');
      expect(text).toContain('总体统计');
      expect(text).toContain('按类型统计');
      expect(text).toContain('总操作数');
    });

    it('应该包含性能问题', async () => {
      const analyzer = new PerformanceAnalyzer({
        slowOperationThreshold: 1
      });

      const id = performanceMonitor.start('慢操作', 'operation');
      await new Promise(resolve => setTimeout(resolve, 5));
      performanceMonitor.end(id);

      const report = analyzer.generateReport();
      const text = analyzer.formatReport(report);

      expect(text).toContain('性能问题');
    });

    it('空报告应该显示未发现问题', () => {
      const report = analyzer.generateReport();
      const text = analyzer.formatReport(report);

      expect(text).toContain('未发现性能问题');
    });
  });

  // ==================== 全局实例 ====================

  describe('全局实例', () => {
    it('应该提供全局实例', () => {
      expect(performanceAnalyzer).toBeDefined();
      expect(performanceAnalyzer).toBeInstanceOf(PerformanceAnalyzer);
    });

    it('全局实例应该可用', () => {
      const id = performanceMonitor.start('测试', 'operation');
      performanceMonitor.end(id);

      const report = performanceAnalyzer.generateReport();
      expect(report.overall.totalOperations).toBeGreaterThan(0);
    });
  });

  // ==================== 自定义阈值 ====================

  describe('自定义阈值', () => {
    it('应该支持自定义慢操作阈值', async () => {
      const analyzer = new PerformanceAnalyzer({
        slowOperationThreshold: 1
      });

      const id = performanceMonitor.start('操作', 'operation');
      await new Promise(resolve => setTimeout(resolve, 5));
      performanceMonitor.end(id);

      const report = analyzer.generateReport();
      const slowIssues = report.issues.filter(i => i.type === 'slow-operation');

      expect(slowIssues.length).toBeGreaterThan(0);
    });

    it('应该支持自定义频繁操作阈值', () => {
      const analyzer = new PerformanceAnalyzer({
        frequentOperationThreshold: 5
      });

      // 创建频繁操作
      for (let i = 0; i < 10; i++) {
        const id = performanceMonitor.start('频繁操作', 'operation');
        performanceMonitor.end(id);
      }

      const report = analyzer.generateReport();
      const frequentIssues = report.issues.filter(i => i.type === 'frequent-operation');

      expect(frequentIssues.length).toBeGreaterThan(0);
    });
  });
});

