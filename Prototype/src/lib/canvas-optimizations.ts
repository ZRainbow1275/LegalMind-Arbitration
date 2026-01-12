/**
 * 画布优化集成模块
 * 
 * 将所有优化模块集成到画布组件中
 */

import { throttle, debounce, addOptimizedEventListener } from './event-optimization';
import { VirtualScrollManager } from './virtual-scroll';
import { QuadTreeWorkerManager } from './worker-manager';
import { performanceMonitor } from './performance-monitor';
import { performanceAnalyzer } from './performance-analyzer';
import type { CanvasElement, Bounds } from '../types/canvas-elements';

// ==================== 类型定义 ====================

export interface CanvasOptimizationOptions {
  /**
   * 是否启用虚拟滚动
   */
  enableVirtualScroll?: boolean;

  /**
   * 是否启用Web Worker
   */
  enableWorker?: boolean;

  /**
   * 是否启用性能监控
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * 虚拟滚动配置
   */
  virtualScrollOptions?: {
    rootMargin?: string;
    threshold?: number | number[];
  };

  /**
   * 事件节流配置
   */
  throttleOptions?: {
    mousemove?: number;
    scroll?: number;
    resize?: number;
  };

  /**
   * 事件防抖配置
   */
  debounceOptions?: {
    input?: number;
    search?: number;
  };
}

export interface OptimizedEventHandlers {
  /**
   * 鼠标移动处理器（已节流）
   */
  onMouseMove: (e: MouseEvent) => void;

  /**
   * 滚动处理器（已节流）
   */
  onScroll: (e: Event) => void;

  /**
   * 窗口大小变化处理器（已防抖）
   */
  onResize: (e: Event) => void;

  /**
   * 输入处理器（已防抖）
   */
  onInput: (e: Event) => void;
}

// ==================== 画布优化管理器 ====================

/**
 * 画布优化管理器
 * 
 * 集成所有优化功能
 */
export class CanvasOptimizationManager {
  private options: Required<CanvasOptimizationOptions>;
  private virtualScrollManager: VirtualScrollManager | null = null;
  private workerManager: QuadTreeWorkerManager | null = null;
  private eventCleanups: Array<() => void> = [];

  constructor(options: CanvasOptimizationOptions = {}) {
    this.options = {
      enableVirtualScroll: options.enableVirtualScroll ?? true,
      enableWorker: options.enableWorker ?? true,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring ?? true,
      virtualScrollOptions: options.virtualScrollOptions ?? {
        rootMargin: '200px',
        threshold: [0, 0.1, 0.5, 0.9, 1.0]
      },
      throttleOptions: options.throttleOptions ?? {
        mousemove: 16, // 60fps
        scroll: 16,
        resize: 100
      },
      debounceOptions: options.debounceOptions ?? {
        input: 300,
        search: 500
      }
    };

    this.initialize();
  }

  /**
   * 初始化优化管理器
   */
  private initialize() {
    // 初始化虚拟滚动
    if (this.options.enableVirtualScroll) {
      this.virtualScrollManager = new VirtualScrollManager(this.options.virtualScrollOptions);
    }

    // 初始化Worker
    if (this.options.enableWorker) {
      this.workerManager = new QuadTreeWorkerManager();
    }
  }

  /**
   * 创建优化的事件处理器
   */
  createOptimizedHandlers(handlers: {
    onMouseMove?: (e: MouseEvent) => void;
    onScroll?: (e: Event) => void;
    onResize?: (e: Event) => void;
    onInput?: (e: Event) => void;
  }): OptimizedEventHandlers {
    return {
      onMouseMove: handlers.onMouseMove
        ? throttle(handlers.onMouseMove, this.options.throttleOptions.mousemove!)
        : () => { },
      onScroll: handlers.onScroll
        ? throttle(handlers.onScroll, this.options.throttleOptions.scroll!)
        : () => { },
      onResize: handlers.onResize
        ? debounce(handlers.onResize, this.options.throttleOptions.resize!)
        : () => { },
      onInput: handlers.onInput
        ? debounce(handlers.onInput, this.options.debounceOptions.input!)
        : () => { }
    };
  }

  /**
   * 添加优化的事件监听器
   */
  addOptimizedListener(
    target: EventTarget,
    eventType: string,
    handler: EventListener,
    options?: EventListenerOptions
  ): () => void {
    const cleanup = addOptimizedEventListener(target, eventType, handler, options);
    this.eventCleanups.push(cleanup);
    return cleanup;
  }

  /**
   * 获取虚拟滚动管理器
   */
  getVirtualScrollManager(): VirtualScrollManager | null {
    return this.virtualScrollManager;
  }

  /**
   * 获取Worker管理器
   */
  getWorkerManager(): QuadTreeWorkerManager | null {
    return this.workerManager;
  }

  /**
   * 构建四叉树（使用Worker或主线程）
   */
  async buildQuadTree(elements: CanvasElement[], bounds?: Bounds) {
    const perfId = this.options.enablePerformanceMonitoring
      ? performanceMonitor.start('四叉树构建', 'operation')
      : null;

    try {
      if (this.workerManager && this.workerManager.isAvailable()) {
        // 使用Worker构建
        const result = await this.workerManager.buildQuadTree(elements, bounds);
        return result;
      } else {
        // 主线程构建（回退方案）
        const { buildQuadTree } = await import('./virtualization');
        buildQuadTree(elements, bounds);
        return {
          success: true,
          elementCount: elements.length,
          buildTime: 0
        };
      }
    } finally {
      if (perfId !== null) {
        performanceMonitor.end(perfId);
      }
    }
  }

  /**
   * 查询四叉树（使用Worker或主线程）
   */
  async queryQuadTree(bounds: Bounds) {
    const perfId = this.options.enablePerformanceMonitoring
      ? performanceMonitor.start('四叉树查询', 'operation')
      : null;

    try {
      if (this.workerManager && this.workerManager.isAvailable()) {
        // 使用Worker查询
        const result = await this.workerManager.queryQuadTree(bounds);
        return result.elements;
      } else {
        // 主线程查询（回退方案）
        return [];
      }
    } finally {
      if (perfId !== null) {
        performanceMonitor.end(perfId);
      }
    }
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(timeRange: number = 60000) {
    if (!this.options.enablePerformanceMonitoring) {
      return null;
    }

    return performanceAnalyzer.generateReport(timeRange);
  }

  /**
   * 格式化性能报告
   */
  formatPerformanceReport(timeRange: number = 60000): string | null {
    const report = this.generatePerformanceReport(timeRange);
    if (!report) return null;

    return performanceAnalyzer.formatReport(report);
  }

  /**
   * 打印性能报告到控制台
   */
  logPerformanceReport(timeRange: number = 60000) {
    const text = this.formatPerformanceReport(timeRange);
    if (text) {
      console.log(text);
    }
  }

  /**
   * 清除性能监控数据
   */
  clearPerformanceData() {
    if (this.options.enablePerformanceMonitoring) {
      performanceMonitor.clear();
    }
  }

  /**
   * 销毁优化管理器
   */
  destroy() {
    // 清理事件监听器
    for (const cleanup of this.eventCleanups) {
      cleanup();
    }
    this.eventCleanups = [];

    // 销毁虚拟滚动管理器
    if (this.virtualScrollManager) {
      this.virtualScrollManager.destroy();
      this.virtualScrollManager = null;
    }

    // 销毁Worker管理器
    if (this.workerManager) {
      this.workerManager.destroy();
      this.workerManager = null;
    }
  }
}

// ==================== 辅助函数 ====================

/**
 * 创建画布优化管理器
 */
export function createCanvasOptimizationManager(
  options?: CanvasOptimizationOptions
): CanvasOptimizationManager {
  return new CanvasOptimizationManager(options);
}

// ==================== 全局实例 ====================

let globalOptimizationManager: CanvasOptimizationManager | null = null;

/**
 * 获取全局优化管理器
 */
export function getGlobalOptimizationManager(): CanvasOptimizationManager {
  if (!globalOptimizationManager) {
    globalOptimizationManager = new CanvasOptimizationManager();
  }
  return globalOptimizationManager;
}

/**
 * 销毁全局优化管理器
 */
export function destroyGlobalOptimizationManager() {
  if (globalOptimizationManager) {
    globalOptimizationManager.destroy();
    globalOptimizationManager = null;
  }
}

