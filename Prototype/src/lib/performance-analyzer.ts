/**
 * 性能分析工具
 * 
 * 提供详细的性能分析、报告和可视化功能
 */

import { performanceMonitor, type PerformanceMetric } from './performance-monitor';

type CompletedMetric = PerformanceMetric & { duration: number };

// ==================== 类型定义 ====================

export interface PerformanceReport {
  /**
   * 报告生成时间
   */
  timestamp: number;

  /**
   * 时间范围（毫秒）
   */
  timeRange: number;

  /**
   * 总体统计
   */
  overall: {
    totalOperations: number;
    totalDuration: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
    fastestOperation: PerformanceMetric | null;
  };

  /**
   * 按类型分组的统计
   */
  byType: Record<string, {
    count: number;
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p50: number;
    p95: number;
    p99: number;
  }>;

  /**
   * 按名称分组的统计
   */
  byName: Record<string, {
    count: number;
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
  }>;

  /**
   * 性能问题
   */
  issues: PerformanceIssue[];
}

export interface PerformanceIssue {
  type: 'slow-operation' | 'frequent-operation' | 'memory-leak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric?: PerformanceMetric;
  count?: number;
}

export interface PerformanceThresholds {
  /**
   * 慢操作阈值（毫秒）
   */
  slowOperationThreshold: number;

  /**
   * 频繁操作阈值（次数/秒）
   */
  frequentOperationThreshold: number;

  /**
   * 内存泄漏阈值（MB）
   */
  memoryLeakThreshold: number;
}

// ==================== 性能分析器 ====================

/**
 * 性能分析器
 */
export class PerformanceAnalyzer {
  private thresholds: PerformanceThresholds;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      slowOperationThreshold: thresholds?.slowOperationThreshold ?? 100,
      frequentOperationThreshold: thresholds?.frequentOperationThreshold ?? 60,
      memoryLeakThreshold: thresholds?.memoryLeakThreshold ?? 100
    };
  }

  /**
   * 生成性能报告
   */
  generateReport(timeRange: number = 60000): PerformanceReport {
    const now = Date.now();
    const perfNow = performance.now();
    const rawMetrics = performanceMonitor.getMetrics();
    const cutoff = perfNow - timeRange;
    const metrics = rawMetrics.filter((m): m is CompletedMetric =>
      typeof m.duration === 'number' && m.startTime >= cutoff
    );

    // 总体统计
    const overall = this.calculateOverallStats(metrics);

    // 按类型分组
    const byType = this.groupByType(metrics);

    // 按名称分组
    const byName = this.groupByName(metrics);

    // 检测性能问题
    const issues = this.detectIssues(metrics, byName);

    return {
      timestamp: now,
      timeRange,
      overall,
      byType,
      byName,
      issues
    };
  }

  /**
   * 计算总体统计
   */
  private calculateOverallStats(metrics: CompletedMetric[]) {
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        totalDuration: 0,
        averageDuration: 0,
        slowestOperation: null,
        fastestOperation: null
      };
    }

    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalDuration / metrics.length;

    const sorted = [...metrics].sort((a, b) => b.duration - a.duration);
    const slowestOperation = sorted[0];
    const fastestOperation = sorted[sorted.length - 1];

    return {
      totalOperations: metrics.length,
      totalDuration,
      averageDuration,
      slowestOperation,
      fastestOperation
    };
  }

  /**
   * 按类型分组统计
   */
  private groupByType(metrics: CompletedMetric[]) {
    const groups: Record<string, CompletedMetric[]> = {};

    for (const metric of metrics) {
      if (!groups[metric.type]) {
        groups[metric.type] = [];
      }
      groups[metric.type].push(metric);
    }

    const result: Record<string, any> = {};

    for (const [type, typeMetrics] of Object.entries(groups)) {
      const durations = typeMetrics.map(m => m.duration).sort((a, b) => a - b);
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);

      result[type] = {
        count: typeMetrics.length,
        totalDuration,
        averageDuration: totalDuration / typeMetrics.length,
        minDuration: durations[0],
        maxDuration: durations[durations.length - 1],
        p50: this.percentile(durations, 0.5),
        p95: this.percentile(durations, 0.95),
        p99: this.percentile(durations, 0.99)
      };
    }

    return result;
  }

  /**
   * 按名称分组统计
   */
  private groupByName(metrics: CompletedMetric[]) {
    const groups: Record<string, CompletedMetric[]> = {};

    for (const metric of metrics) {
      if (!groups[metric.name]) {
        groups[metric.name] = [];
      }
      groups[metric.name].push(metric);
    }

    const result: Record<string, any> = {};

    for (const [name, nameMetrics] of Object.entries(groups)) {
      const durations = nameMetrics.map(m => m.duration);
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);

      result[name] = {
        count: nameMetrics.length,
        totalDuration,
        averageDuration: totalDuration / nameMetrics.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations)
      };
    }

    return result;
  }

  /**
   * 检测性能问题
   */
  private detectIssues(
    metrics: CompletedMetric[],
    byName: Record<string, any>
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // 检测慢操作
    for (const metric of metrics) {
      if (metric.duration > this.thresholds.slowOperationThreshold) {
        issues.push({
          type: 'slow-operation',
          severity: this.getSeverity(metric.duration, this.thresholds.slowOperationThreshold),
          message: `慢操作: ${metric.name} 耗时 ${metric.duration.toFixed(2)}ms`,
          metric
        });
      }
    }

    // 检测频繁操作
    const timeRange = 1000; // 1秒
    for (const [name, stats] of Object.entries(byName)) {
      const frequency = (stats.count / timeRange) * 1000;
      if (frequency > this.thresholds.frequentOperationThreshold) {
        issues.push({
          type: 'frequent-operation',
          severity: 'medium',
          message: `频繁操作: ${name} 执行 ${stats.count} 次 (${frequency.toFixed(1)}/s)`,
          count: stats.count
        });
      }
    }

    return issues;
  }

  /**
   * 计算百分位数
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 获取严重程度
   */
  private getSeverity(value: number, threshold: number): PerformanceIssue['severity'] {
    const ratio = value / threshold;
    if (ratio >= 5) return 'critical';
    if (ratio >= 3) return 'high';
    if (ratio >= 2) return 'medium';
    return 'low';
  }

  /**
   * 格式化报告为文本
   */
  formatReport(report: PerformanceReport): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('性能分析报告');
    lines.push('='.repeat(60));
    lines.push(`生成时间: ${new Date(report.timestamp).toLocaleString()}`);
    lines.push(`时间范围: ${report.timeRange / 1000}秒`);
    lines.push('');

    // 总体统计
    lines.push('总体统计:');
    lines.push(`  总操作数: ${report.overall.totalOperations}`);
    lines.push(`  总耗时: ${report.overall.totalDuration.toFixed(2)}ms`);
    lines.push(`  平均耗时: ${report.overall.averageDuration.toFixed(2)}ms`);
    const slowest = report.overall.slowestOperation;
    if (slowest && typeof slowest.duration === 'number') {
      lines.push(`  最慢操作: ${slowest.name} (${slowest.duration.toFixed(2)}ms)`);
    }
    const fastest = report.overall.fastestOperation;
    if (fastest && typeof fastest.duration === 'number') {
      lines.push(`  最快操作: ${fastest.name} (${fastest.duration.toFixed(2)}ms)`);
    }
    lines.push('');

    // 按类型统计
    lines.push('按类型统计:');
    for (const [type, stats] of Object.entries(report.byType)) {
      lines.push(`  ${type}:`);
      lines.push(`    次数: ${stats.count}`);
      lines.push(`    平均: ${stats.averageDuration.toFixed(2)}ms`);
      lines.push(`    P50: ${stats.p50.toFixed(2)}ms`);
      lines.push(`    P95: ${stats.p95.toFixed(2)}ms`);
      lines.push(`    P99: ${stats.p99.toFixed(2)}ms`);
    }
    lines.push('');

    // 性能问题
    if (report.issues.length > 0) {
      lines.push('性能问题:');
      for (const issue of report.issues) {
        lines.push(`  [${issue.severity.toUpperCase()}] ${issue.message}`);
      }
    } else {
      lines.push('未发现性能问题');
    }
    lines.push('');

    lines.push('='.repeat(60));

    return lines.join('\n');
  }
}

// ==================== 全局实例 ====================

export const performanceAnalyzer = new PerformanceAnalyzer();

