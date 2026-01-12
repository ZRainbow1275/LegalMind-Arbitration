/**
 * 内存优化工具
 * 
 * 提供内存管理和优化的工具函数
 */

/**
 * 内存监控器
 */
export class MemoryMonitor {
  private snapshots: Array<{
    timestamp: number;
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  }> = [];

  private maxSnapshots = 100;

  /**
   * 获取当前内存使用情况
   */
  public getCurrentMemory(): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usagePercentage: number;
  } | null {
    if (!(performance as any).memory) {
      console.warn('[MemoryMonitor] Performance.memory API not available');
      return null;
    }

    const memory = (performance as any).memory;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }

  /**
   * 记录内存快照
   */
  public takeSnapshot(): void {
    const memory = this.getCurrentMemory();
    if (!memory) return;

    this.snapshots.push({
      timestamp: Date.now(),
      ...memory,
    });

    // 限制快照数量
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  /**
   * 获取内存趋势
   */
  public getMemoryTrend(): {
    increasing: boolean;
    averageUsage: number;
    peakUsage: number;
    currentUsage: number;
  } | null {
    if (this.snapshots.length < 2) {
      return null;
    }

    const usages = this.snapshots.map(s => s.usedJSHeapSize);
    const averageUsage = usages.reduce((a, b) => a + b, 0) / usages.length;
    const peakUsage = Math.max(...usages);
    const currentUsage = usages[usages.length - 1];

    // 判断是否增长
    const recentUsages = usages.slice(-10);
    const increasing = recentUsages[recentUsages.length - 1] > recentUsages[0];

    return {
      increasing,
      averageUsage,
      peakUsage,
      currentUsage,
    };
  }

  /**
   * 检测内存泄漏
   */
  public detectMemoryLeak(): boolean {
    const trend = this.getMemoryTrend();
    if (!trend) return false;

    // 如果内存持续增长且超过平均值的150%，可能存在内存泄漏
    return trend.increasing && trend.currentUsage > trend.averageUsage * 1.5;
  }

  /**
   * 打印内存报告
   */
  public printReport(): void {
    const current = this.getCurrentMemory();
    const trend = this.getMemoryTrend();

    console.log('\n=== 内存使用报告 ===');

    if (current) {
      console.log(`当前使用: ${(current.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`总堆大小: ${(current.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`堆限制: ${(current.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
      console.log(`使用率: ${current.usagePercentage.toFixed(2)}%`);
    }

    if (trend) {
      console.log(`\n平均使用: ${(trend.averageUsage / 1024 / 1024).toFixed(2)} MB`);
      console.log(`峰值使用: ${(trend.peakUsage / 1024 / 1024).toFixed(2)} MB`);
      console.log(`趋势: ${trend.increasing ? '增长' : '稳定'}`);

      if (this.detectMemoryLeak()) {
        console.warn('⚠️ 检测到可能的内存泄漏！');
      }
    }
  }

  /**
   * 清空快照
   */
  public clearSnapshots(): void {
    this.snapshots = [];
  }
}

/**
 * 全局内存监控器实例
 */
export const memoryMonitor = new MemoryMonitor();

/**
 * 对象池
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    maxSize: number = 100
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  /**
   * 获取对象
   */
  public acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }

    return this.factory();
  }

  /**
   * 释放对象
   */
  public release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  /**
   * 清空池
   */
  public clear(): void {
    this.pool = [];
  }

  /**
   * 获取池大小
   */
  public size(): number {
    return this.pool.length;
  }
}

/**
 * WeakMap缓存
 */
export class WeakMapCache<K extends object, V> {
  private cache = new WeakMap<K, V>();

  /**
   * 获取缓存
   */
  public get(key: K): V | undefined {
    return this.cache.get(key);
  }

  /**
   * 设置缓存
   */
  public set(key: K, value: V): void {
    this.cache.set(key, value);
  }

  /**
   * 检查是否存在
   */
  public has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除缓存
   */
  public delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 获取或设置
   */
  public getOrSet(key: K, factory: () => V): V {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const value = factory();
    this.cache.set(key, value);
    return value;
  }
}

/**
 * 事件监听器管理器
 */
export class EventListenerManager {
  private listeners: Array<{
    target: EventTarget;
    type: string;
    listener: EventListener;
    options?: AddEventListenerOptions;
  }> = [];

  /**
   * 添加事件监听器
   */
  public addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    this.listeners.push({ target, type, listener, options });
  }

  /**
   * 移除事件监听器
   */
  public removeEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener
  ): void {
    target.removeEventListener(type, listener);

    const index = this.listeners.findIndex(
      l => l.target === target && l.type === type && l.listener === listener
    );

    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 移除所有事件监听器
   */
  public removeAllListeners(): void {
    this.listeners.forEach(({ target, type, listener }) => {
      target.removeEventListener(type, listener);
    });

    this.listeners = [];
  }

  /**
   * 获取监听器数量
   */
  public getListenerCount(): number {
    return this.listeners.length;
  }
}

/**
 * 垃圾回收建议
 */
export function suggestGarbageCollection(): void {
  if ((window as any).gc) {
    console.log('[MemoryOptimization] Triggering garbage collection...');
    (window as any).gc();
  } else {
    console.warn('[MemoryOptimization] Garbage collection not available');
    console.warn('Run Chrome with --expose-gc flag to enable manual GC');
  }
}

/**
 * 清理大对象
 */
export function cleanupLargeObjects(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === 'object') {
      if (Array.isArray(obj[key])) {
        obj[key] = [];
      } else {
        obj[key] = null;
      }
    }
  });
}

/**
 * 内存使用装饰器
 */
export function trackMemory(_target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const before = memoryMonitor.getCurrentMemory();

    const result = originalMethod.apply(this, args);

    const after = memoryMonitor.getCurrentMemory();

    if (before && after) {
      const diff = after.usedJSHeapSize - before.usedJSHeapSize;
      console.log(
        `[MemoryTrack] ${propertyKey} used ${(diff / 1024 / 1024).toFixed(2)} MB`
      );
    }

    return result;
  };

  return descriptor;
}

/**
 * 启动内存监控
 */
export function startMemoryMonitoring(interval: number = 5000): () => void {
  const timer = setInterval(() => {
    memoryMonitor.takeSnapshot();

    if (memoryMonitor.detectMemoryLeak()) {
      console.warn('⚠️ 检测到可能的内存泄漏！');
      memoryMonitor.printReport();
    }
  }, interval);

  return () => clearInterval(timer);
}

