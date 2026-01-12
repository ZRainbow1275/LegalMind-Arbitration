/**
 * 内存泄漏检测工具
 * 
 * 提供内存泄漏检测、监控和修复功能
 * 基于2025年最佳实践实现
 */

import React, { useEffect } from 'react';

// ==================== 内存监控 ====================

/**
 * 内存使用情况接口
 */
export interface MemoryUsage {
  usedJSHeapSize: number;      // 已使用的JS堆大小（字节）
  totalJSHeapSize: number;     // JS堆总大小（字节）
  jsHeapSizeLimit: number;     // JS堆大小限制（字节）
  usedPercent: number;         // 使用百分比
  timestamp: number;           // 时间戳
}

/**
 * 内存泄漏警告接口
 */
export interface MemoryLeakWarning {
  type: 'growth' | 'threshold' | 'listeners' | 'timers';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  details?: any;
}

/**
 * 获取当前内存使用情况
 */
export function getMemoryUsage(): MemoryUsage | null {
  // 检查浏览器是否支持performance.memory
  if (!('memory' in performance)) {
    console.warn('[MemoryDetector] performance.memory not supported in this browser');
    return null;
  }

  const memory = (performance as any).memory;
  const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usedPercent,
    timestamp: Date.now(),
  };
}

/**
 * 格式化内存大小
 */
export function formatMemorySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ==================== 内存泄漏检测器 ====================

/**
 * 内存泄漏检测器类
 */
export class MemoryLeakDetector {
  private memoryHistory: MemoryUsage[] = [];
  private warnings: MemoryLeakWarning[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(warning: MemoryLeakWarning) => void> = new Set();

  // 配置参数
  private config = {
    checkIntervalMs: 5000,        // 检查间隔（毫秒）
    historySize: 20,              // 历史记录大小
    growthThreshold: 10,          // 内存增长阈值（MB）
    usageThreshold: 80,           // 内存使用阈值（百分比）
    consecutiveGrowthCount: 3,    // 连续增长次数阈值
  };

  /**
   * 开始监控
   */
  start(): void {
    if (this.checkInterval) {
      console.warn('[MemoryDetector] Already started');
      return;
    }

    console.log('[MemoryDetector] Starting memory leak detection');

    // 立即检查一次
    this.checkMemory();

    // 定期检查
    this.checkInterval = setInterval(() => {
      this.checkMemory();
    }, this.config.checkIntervalMs);
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[MemoryDetector] Stopped memory leak detection');
    }
  }

  /**
   * 检查内存
   */
  private checkMemory(): void {
    const usage = getMemoryUsage();
    if (!usage) return;

    // 添加到历史记录
    this.memoryHistory.push(usage);
    if (this.memoryHistory.length > this.config.historySize) {
      this.memoryHistory.shift();
    }

    // 检查内存使用阈值
    this.checkUsageThreshold(usage);

    // 检查内存增长趋势
    if (this.memoryHistory.length >= this.config.consecutiveGrowthCount) {
      this.checkGrowthTrend();
    }
  }

  /**
   * 检查内存使用阈值
   */
  private checkUsageThreshold(usage: MemoryUsage): void {
    if (usage.usedPercent > this.config.usageThreshold) {
      this.addWarning({
        type: 'threshold',
        message: `Memory usage is ${usage.usedPercent.toFixed(1)}% (threshold: ${this.config.usageThreshold}%)`,
        severity: usage.usedPercent > 90 ? 'high' : 'medium',
        timestamp: Date.now(),
        details: {
          used: formatMemorySize(usage.usedJSHeapSize),
          total: formatMemorySize(usage.totalJSHeapSize),
          limit: formatMemorySize(usage.jsHeapSizeLimit),
        },
      });
    }
  }

  /**
   * 检查内存增长趋势
   */
  private checkGrowthTrend(): void {
    const recent = this.memoryHistory.slice(-this.config.consecutiveGrowthCount);
    let consecutiveGrowth = 0;

    for (let i = 1; i < recent.length; i++) {
      const growth = recent[i].usedJSHeapSize - recent[i - 1].usedJSHeapSize;
      const growthMB = growth / (1024 * 1024);

      if (growthMB > this.config.growthThreshold) {
        consecutiveGrowth++;
      } else {
        consecutiveGrowth = 0;
      }
    }

    if (consecutiveGrowth >= this.config.consecutiveGrowthCount - 1) {
      const totalGrowth = recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize;
      const totalGrowthMB = totalGrowth / (1024 * 1024);

      this.addWarning({
        type: 'growth',
        message: `Detected ${consecutiveGrowth} consecutive memory growths (total: ${totalGrowthMB.toFixed(2)} MB)`,
        severity: totalGrowthMB > 50 ? 'high' : 'medium',
        timestamp: Date.now(),
        details: {
          consecutiveGrowth,
          totalGrowthMB: totalGrowthMB.toFixed(2),
          duration: recent[recent.length - 1].timestamp - recent[0].timestamp,
        },
      });
    }
  }

  /**
   * 添加警告
   */
  private addWarning(warning: MemoryLeakWarning): void {
    this.warnings.push(warning);

    // 通知监听器
    this.listeners.forEach(listener => listener(warning));

    // 控制台输出
    const emoji = warning.severity === 'high' ? '🔴' : warning.severity === 'medium' ? '🟡' : '🟢';
    console.warn(`${emoji} [MemoryDetector] ${warning.message}`, warning.details);
  }

  /**
   * 添加警告监听器
   */
  onWarning(listener: (warning: MemoryLeakWarning) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 获取所有警告
   */
  getWarnings(): MemoryLeakWarning[] {
    return [...this.warnings];
  }

  /**
   * 清除警告
   */
  clearWarnings(): void {
    this.warnings = [];
  }

  /**
   * 获取内存历史
   */
  getMemoryHistory(): MemoryUsage[] {
    return [...this.memoryHistory];
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    isRunning: boolean;
    warningCount: number;
    currentUsage: MemoryUsage | null;
    averageUsage: number;
  } {
    const currentUsage = getMemoryUsage();
    const averageUsage = this.memoryHistory.length > 0
      ? this.memoryHistory.reduce((sum, u) => sum + u.usedPercent, 0) / this.memoryHistory.length
      : 0;

    return {
      isRunning: this.checkInterval !== null,
      warningCount: this.warnings.length,
      currentUsage,
      averageUsage,
    };
  }

  /**
   * 强制垃圾回收（仅在开发环境有效）
   */
  forceGC(): void {
    if ('gc' in global && typeof (global as any).gc === 'function') {
      console.log('[MemoryDetector] Forcing garbage collection');
      (global as any).gc();
    } else {
      console.warn('[MemoryDetector] Garbage collection not available. Run with --expose-gc flag.');
    }
  }
}

// 全局单例
export const memoryLeakDetector = new MemoryLeakDetector();

// ==================== React Hooks ====================

/**
 * 使用内存监控Hook
 */
export function useMemoryMonitor(enabled: boolean = true): {
  currentUsage: MemoryUsage | null;
  warnings: MemoryLeakWarning[];
  status: ReturnType<typeof memoryLeakDetector.getStatus>;
} {
  const [currentUsage, setCurrentUsage] = React.useState<MemoryUsage | null>(null);
  const [warnings, setWarnings] = React.useState<MemoryLeakWarning[]>([]);

  useEffect(() => {
    if (!enabled) return;

    // 开始监控
    memoryLeakDetector.start();

    // 监听警告
    const unsubscribe = memoryLeakDetector.onWarning((warning) => {
      setWarnings(prev => [...prev, warning]);
    });

    // 定期更新当前使用情况
    const interval = setInterval(() => {
      setCurrentUsage(getMemoryUsage());
    }, 1000);

    return () => {
      memoryLeakDetector.stop();
      unsubscribe();
      clearInterval(interval);
    };
  }, [enabled]);

  return {
    currentUsage,
    warnings,
    status: memoryLeakDetector.getStatus(),
  };
}

