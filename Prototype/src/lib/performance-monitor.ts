/**
 * 性能监控工具
 * 
 * 功能：
 * 1. 渲染性能监控
 * 2. 内存使用监控
 * 3. 操作耗时统计
 * 4. 性能报告生成
 */

import { create } from 'zustand';

// ==================== 数据结构定义 ====================

export interface PerformanceMetric {
  id: string;
  name: string;
  type: 'render' | 'operation' | 'memory' | 'network' | 'resource' | 'interaction';
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  timestamp: string;
  metrics: PerformanceMetric[];
  summary: {
    totalOperations: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
    fastestOperation: PerformanceMetric | null;
    memoryUsage?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

// ==================== 性能监控类 ====================

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000; // 最多保留1000条记录

  /**
   * 开始监控
   */
  start(name: string, type: PerformanceMetric['type'], metadata?: Record<string, any>): string {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metric: PerformanceMetric = {
      id,
      name,
      type,
      startTime: performance.now(),
      metadata
    };

    this.metrics.set(id, metric);
    return id;
  }

  /**
   * 结束监控
   */
  end(id: string): void {
    const metric = this.metrics.get(id);
    if (!metric) return;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    this.completedMetrics.push(metric);
    this.metrics.delete(id);

    // 限制记录数量
    if (this.completedMetrics.length > this.maxMetrics) {
      this.completedMetrics = this.completedMetrics.slice(-this.maxMetrics);
    }
  }

  /**
   * 测量函数执行时间
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const id = this.start(name, 'operation', metadata);
    try {
      const result = await fn();
      this.end(id);
      return result;
    } catch (error) {
      this.end(id);
      throw error;
    }
  }

  /**
   * 获取所有完成的指标
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.completedMetrics];
  }

  /**
   * 按类型获取指标
   */
  getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return this.completedMetrics.filter(m => m.type === type);
  }

  /**
   * 获取最近的指标
   */
  getRecentMetrics(count: number = 10): PerformanceMetric[] {
    return this.completedMetrics.slice(-count);
  }

  /**
   * 清除所有指标
   */
  clear(): void {
    this.metrics.clear();
    this.completedMetrics = [];
  }

  /**
   * 生成性能报告
   */
  generateReport(): PerformanceReport {
    const metrics = this.getMetrics();

    if (metrics.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        metrics: [],
        summary: {
          totalOperations: 0,
          averageDuration: 0,
          slowestOperation: null,
          fastestOperation: null
        }
      };
    }

    const durations = metrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!);

    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    const slowestOperation = metrics.reduce((slowest, current) => {
      if (!current.duration) return slowest;
      if (!slowest || !slowest.duration) return current;
      return current.duration > slowest.duration ? current : slowest;
    }, metrics[0]);

    const fastestOperation = metrics.reduce((fastest, current) => {
      if (!current.duration) return fastest;
      if (!fastest || !fastest.duration) return current;
      return current.duration < fastest.duration ? current : fastest;
    }, metrics[0]);

    // 获取内存使用情况（如果可用）
    let memoryUsage;
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }

    return {
      timestamp: new Date().toISOString(),
      metrics,
      summary: {
        totalOperations: metrics.length,
        averageDuration,
        slowestOperation,
        fastestOperation,
        memoryUsage
      }
    };
  }
}

// 全局实例
export const performanceMonitor = new PerformanceMonitor();

// ==================== React Hook ====================

/**
 * 性能监控 Hook
 */
export function usePerformanceMonitor() {
  const start = (name: string, type: PerformanceMetric['type'], metadata?: Record<string, any>) => {
    return performanceMonitor.start(name, type, metadata);
  };

  const end = (id: string) => {
    performanceMonitor.end(id);
  };

  const measure = async <T,>(
    name: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    return performanceMonitor.measure(name, fn, metadata);
  };

  return { start, end, measure };
}

// ==================== 性能优化工具 ====================

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 批处理函数
 */
export function batchProcess<T>(
  items: T[],
  processor: (item: T) => void,
  batchSize: number = 10,
  delay: number = 0
): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;

    const processBatch = () => {
      const batch = items.slice(index, index + batchSize);
      batch.forEach(processor);

      index += batchSize;

      if (index < items.length) {
        if (delay > 0) {
          setTimeout(processBatch, delay);
        } else {
          requestAnimationFrame(processBatch);
        }
      } else {
        resolve();
      }
    };

    processBatch();
  });
}

/**
 * 虚拟滚动辅助函数
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems, start + visibleCount + overscan * 2);

  return { start, end };
}

// ==================== Zustand Store ====================

interface PerformanceStore {
  enabled: boolean;
  reports: PerformanceReport[];

  // 操作方法
  setEnabled: (enabled: boolean) => void;
  addReport: (report: PerformanceReport) => void;
  clearReports: () => void;
  getLatestReport: () => PerformanceReport | null;
}

export const usePerformanceStore = create<PerformanceStore>((set, get) => ({
  enabled: true,
  reports: [],

  setEnabled: (enabled) => {
    set({ enabled });
  },

  addReport: (report) => {
    set(state => ({
      reports: [...state.reports, report].slice(-10) // 只保留最近10个报告
    }));
  },

  clearReports: () => {
    set({ reports: [] });
    performanceMonitor.clear();
  },

  getLatestReport: () => {
    const { reports } = get();
    return reports.length > 0 ? reports[reports.length - 1] : null;
  }
}));

// ==================== 性能警告 ====================

/**
 * 检查性能问题
 */
export function checkPerformanceIssues(report: PerformanceReport): string[] {
  const warnings: string[] = [];

  // 检查平均耗时
  if (report.summary.averageDuration > 100) {
    warnings.push(`平均操作耗时过长: ${report.summary.averageDuration.toFixed(2)}ms`);
  }

  // 检查最慢操作
  if (report.summary.slowestOperation && report.summary.slowestOperation.duration! > 500) {
    warnings.push(
      `发现慢操作: ${report.summary.slowestOperation.name} (${report.summary.slowestOperation.duration!.toFixed(2)}ms)`
    );
  }

  // 检查内存使用
  if (report.summary.memoryUsage && report.summary.memoryUsage.percentage > 80) {
    warnings.push(
      `内存使用率过高: ${report.summary.memoryUsage.percentage.toFixed(2)}%`
    );
  }

  // 检查操作数量
  if (report.summary.totalOperations > 1000) {
    warnings.push(`操作数量过多: ${report.summary.totalOperations}`);
  }

  return warnings;
}

/**
 * 格式化性能报告
 */
export function formatPerformanceReport(report: PerformanceReport): string {
  const lines: string[] = [];

  lines.push('=== 性能报告 ===');
  lines.push(`时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}`);
  lines.push('');
  lines.push('总览:');
  lines.push(`  总操作数: ${report.summary.totalOperations}`);
  lines.push(`  平均耗时: ${report.summary.averageDuration.toFixed(2)}ms`);

  if (report.summary.slowestOperation) {
    lines.push(`  最慢操作: ${report.summary.slowestOperation!.name} (${report.summary.slowestOperation!.duration!.toFixed(2)}ms)`);
  }

  if (report.summary.fastestOperation) {
    lines.push(`  最快操作: ${report.summary.fastestOperation!.name} (${report.summary.fastestOperation!.duration!.toFixed(2)}ms)`);
  }

  if (report.summary.memoryUsage) {
    lines.push('');
    lines.push('内存使用:');
    lines.push(`  已用: ${(report.summary.memoryUsage.used / 1024 / 1024).toFixed(2)}MB`);
    lines.push(`  总计: ${(report.summary.memoryUsage.total / 1024 / 1024).toFixed(2)}MB`);
    lines.push(`  使用率: ${report.summary.memoryUsage.percentage.toFixed(2)}%`);
  }

  const warnings = checkPerformanceIssues(report);
  if (warnings.length > 0) {
    lines.push('');
    lines.push('⚠️ 性能警告:');
    warnings.forEach(warning => lines.push(`  - ${warning}`));
  }

  return lines.join('\n');
}
