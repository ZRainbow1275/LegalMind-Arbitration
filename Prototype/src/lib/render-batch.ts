/**
 * 智能渲染批处理
 * 
 * 优化大量节点更新时的性能，使用requestAnimationFrame批处理
 * 
 * 功能：
 * - 批量更新队列管理
 * - requestAnimationFrame调度
 * - 优先级队列
 * - 性能监控
 * 
 * @author AI Agent
 * @date 2025-10-31
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * 批处理更新类型
 */
export enum BatchUpdateType {
  /** 高优先级（立即执行） */
  HIGH = 'high',
  /** 中优先级（下一帧执行） */
  MEDIUM = 'medium',
  /** 低优先级（空闲时执行） */
  LOW = 'low',
}

/**
 * 批处理更新项
 */
export interface BatchUpdate {
  /** 更新ID */
  id: string;
  /** 更新函数 */
  update: () => void;
  /** 优先级 */
  priority: BatchUpdateType;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 批处理配置
 */
export interface BatchConfig {
  /** 最大批处理大小（默认100） */
  maxBatchSize?: number;
  /** 批处理延迟（毫秒，默认16ms） */
  batchDelay?: number;
  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 性能监控回调 */
  onPerformance?: (metrics: PerformanceMetrics) => void;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 批处理大小 */
  batchSize: number;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 帧率 */
  fps: number;
  /** 队列长度 */
  queueLength: number;
}

/**
 * 渲染批处理管理器
 */
export class RenderBatchManager {
  private queue: BatchUpdate[] = [];
  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private fps: number = 60;
  private config: Required<BatchConfig>;
  private isProcessing: boolean = false;

  constructor(config: BatchConfig = {}) {
    this.config = {
      maxBatchSize: config.maxBatchSize || 100,
      batchDelay: config.batchDelay || 16,
      enabled: config.enabled !== false,
      onPerformance: config.onPerformance || (() => { }),
    };
  }

  /**
   * 添加更新到队列
   */
  schedule(id: string, update: () => void, priority: BatchUpdateType = BatchUpdateType.MEDIUM): void {
    if (!this.config.enabled) {
      update();
      return;
    }

    // 检查是否已存在相同ID的更新
    const existingIndex = this.queue.findIndex(item => item.id === id);
    if (existingIndex !== -1) {
      // 更新现有项
      this.queue[existingIndex] = {
        id,
        update,
        priority,
        timestamp: Date.now(),
      };
    } else {
      // 添加新项
      this.queue.push({
        id,
        update,
        priority,
        timestamp: Date.now(),
      });
    }

    // 按优先级排序
    this.sortQueue();

    // 调度执行
    this.scheduleExecution();
  }

  /**
   * 取消更新
   */
  cancel(id: string): void {
    this.queue = this.queue.filter(item => item.id !== id);
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 获取当前FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * 启用/禁用批处理
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * 按优先级排序队列
   */
  private sortQueue(): void {
    const priorityOrder = {
      [BatchUpdateType.HIGH]: 0,
      [BatchUpdateType.MEDIUM]: 1,
      [BatchUpdateType.LOW]: 2,
    };

    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * 调度执行
   */
  private scheduleExecution(): void {
    if (this.rafId !== null || this.isProcessing) return;

    this.rafId = requestAnimationFrame((timestamp) => {
      this.rafId = null;
      this.processBatch(timestamp);
    });
  }

  /**
   * 处理批次
   */
  private processBatch(timestamp: number): void {
    if (this.queue.length === 0) return;

    this.isProcessing = true;
    const startTime = performance.now();

    // 计算FPS
    if (this.lastFrameTime > 0) {
      const delta = timestamp - this.lastFrameTime;
      this.fps = Math.round(1000 / delta);
    }
    this.lastFrameTime = timestamp;

    // 获取当前批次
    const batchSize = Math.min(this.queue.length, this.config.maxBatchSize);
    const batch = this.queue.splice(0, batchSize);

    // 执行更新
    batch.forEach(item => {
      try {
        item.update();
      } catch (error) {
        console.error(`[RenderBatch] Error executing update ${item.id}:`, error);
      }
    });

    const executionTime = performance.now() - startTime;

    // 性能监控
    this.config.onPerformance({
      batchSize,
      executionTime,
      fps: this.fps,
      queueLength: this.queue.length,
    });

    this.isProcessing = false;

    // 如果还有更新，继续调度
    if (this.queue.length > 0) {
      this.scheduleExecution();
    }
  }
}

/**
 * 渲染批处理 React Hook
 */
export function useRenderBatch(config: BatchConfig = {}): {
  schedule: (id: string, update: () => void, priority?: BatchUpdateType) => void;
  cancel: (id: string) => void;
  clear: () => void;
  queueLength: number;
  fps: number;
} {
  const managerRef = useRef<RenderBatchManager>(new RenderBatchManager(config));
  const queueLengthRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);

  // 更新性能指标
  useEffect(() => {
    const manager = managerRef.current;
    const originalOnPerformance = config.onPerformance;

    manager['config'].onPerformance = (metrics) => {
      queueLengthRef.current = metrics.queueLength;
      fpsRef.current = metrics.fps;
      if (originalOnPerformance) {
        originalOnPerformance(metrics);
      }
    };
  }, [config.onPerformance]);

  // 清理
  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.clear();
    };
  }, []);

  const schedule = useCallback((id: string, update: () => void, priority: BatchUpdateType = BatchUpdateType.MEDIUM) => {
    managerRef.current.schedule(id, update, priority);
  }, []);

  const cancel = useCallback((id: string) => {
    managerRef.current.cancel(id);
  }, []);

  const clear = useCallback(() => {
    managerRef.current.clear();
  }, []);

  return {
    schedule,
    cancel,
    clear,
    queueLength: queueLengthRef.current,
    fps: fpsRef.current,
  };
}

/**
 * 批量更新Hook（简化版）
 */
export function useBatchUpdate<T>(
  callback: (items: T[]) => void,
  delay: number = 16
): (item: T) => void {
  const itemsRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addItem = useCallback((item: T) => {
    itemsRef.current.push(item);

    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (itemsRef.current.length > 0) {
        callback(itemsRef.current);
        itemsRef.current = [];
      }
      timeoutRef.current = null;
    }, delay);
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return addItem;
}

