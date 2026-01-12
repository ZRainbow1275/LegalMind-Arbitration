/**
 * 懒加载和缓存系统
 * 
 * 提供资源的懒加载和智能缓存
 */

import { performanceMonitor } from './performance-monitor';

// ==================== 类型定义 ====================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number; // 字节
  accessCount: number;
  lastAccess: number;
}

export interface CacheOptions {
  maxSize?: number; // 最大缓存大小（字节）
  maxAge?: number; // 最大缓存时间（毫秒）
  maxEntries?: number; // 最大缓存条目数
}

export interface LoadOptions {
  cache?: boolean;
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
}

// ==================== LRU缓存 ====================

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private maxAge: number;
  private maxEntries: number;
  private currentSize: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB
    this.maxAge = options.maxAge || 30 * 60 * 1000; // 30分钟
    this.maxEntries = options.maxEntries || 1000;
    this.currentSize = 0;
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.delete(key);
      return null;
    }

    // 更新访问信息
    entry.accessCount++;
    entry.lastAccess = Date.now();

    return entry.data;
  }

  /**
   * 设置缓存
   */
  set(key: string, data: T, size: number = 0): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // 检查是否需要清理空间
    while (
      this.currentSize + size > this.maxSize ||
      this.cache.size >= this.maxEntries
    ) {
      this.evictLRU();
    }

    // 添加新条目
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      size,
      accessCount: 0,
      lastAccess: Date.now(),
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.currentSize -= entry.size;
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * 驱逐最少使用的条目
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // LRU分数 = 最后访问时间 / 访问次数
      const score = entry.lastAccess / (entry.accessCount + 1);

      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      size: this.currentSize,
      maxSize: this.maxSize,
      entries: this.cache.size,
      maxEntries: this.maxEntries,
      utilization: (this.currentSize / this.maxSize) * 100,
    };
  }
}

// ==================== 资源加载器 ====================

export class ResourceLoader {
  private imageCache: LRUCache<HTMLImageElement>;
  private dataCache: LRUCache<any>;
  private loadingPromises: Map<string, Promise<any>>;

  constructor() {
    this.imageCache = new LRUCache<HTMLImageElement>({
      maxSize: 50 * 1024 * 1024, // 50MB
      maxAge: 60 * 60 * 1000, // 1小时
    });

    this.dataCache = new LRUCache<any>({
      maxSize: 50 * 1024 * 1024, // 50MB
      maxAge: 30 * 60 * 1000, // 30分钟
    });

    this.loadingPromises = new Map();
  }

  /**
   * 加载图片
   */
  async loadImage(url: string, options: LoadOptions = {}): Promise<HTMLImageElement> {
    const perfId = performanceMonitor.start('加载图片', 'resource', { url });

    try {
      // 检查缓存
      if (options.cache !== false) {
        const cached = this.imageCache.get(url);
        if (cached) {
          performanceMonitor.end(perfId);
          return cached;
        }
      }

      // 检查是否正在加载
      if (this.loadingPromises.has(url)) {
        return await this.loadingPromises.get(url)!;
      }

      // 创建加载Promise
      const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();

        // 设置超时
        const timeout = options.timeout || 30000;
        const timeoutId = setTimeout(() => {
          reject(new Error(`图片加载超时: ${url}`));
        }, timeout);

        img.onload = () => {
          clearTimeout(timeoutId);

          // 估算图片大小
          const size = img.width * img.height * 4; // RGBA

          // 缓存图片
          if (options.cache !== false) {
            this.imageCache.set(url, img, size);
          }

          resolve(img);
        };

        img.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error(`图片加载失败: ${url}`));
        };

        img.src = url;
      });

      this.loadingPromises.set(url, loadPromise);

      const result = await loadPromise;
      this.loadingPromises.delete(url);

      performanceMonitor.end(perfId);
      return result;
    } catch (error) {
      this.loadingPromises.delete(url);
      performanceMonitor.end(perfId);
      throw error;
    }
  }

  /**
   * 加载数据
   */
  async loadData<T>(
    key: string,
    loader: () => Promise<T>,
    options: LoadOptions = {}
  ): Promise<T> {
    const perfId = performanceMonitor.start('加载数据', 'resource', { key });

    try {
      // 检查缓存
      if (options.cache !== false) {
        const cached = this.dataCache.get(key);
        if (cached) {
          performanceMonitor.end(perfId);
          return cached;
        }
      }

      // 检查是否正在加载
      if (this.loadingPromises.has(key)) {
        return await this.loadingPromises.get(key)!;
      }

      // 加载数据
      const loadPromise = loader();
      this.loadingPromises.set(key, loadPromise);

      const data = await loadPromise;
      this.loadingPromises.delete(key);

      // 缓存数据
      if (options.cache !== false) {
        const size = this.estimateSize(data);
        this.dataCache.set(key, data, size);
      }

      performanceMonitor.end(perfId);
      return data;
    } catch (error) {
      this.loadingPromises.delete(key);
      performanceMonitor.end(perfId);
      throw error;
    }
  }

  /**
   * 预加载资源
   */
  async preload(urls: string[]): Promise<void> {
    const perfId = performanceMonitor.start('预加载资源', 'operation', { count: urls.length });

    try {
      await Promise.all(
        urls.map(url => this.loadImage(url, { cache: true, priority: 'low' }))
      );
      performanceMonitor.end(perfId);
    } catch (error) {
      console.error('[ResourceLoader] 预加载失败:', error);
      performanceMonitor.end(perfId);
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.imageCache.clear();
    this.dataCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      images: this.imageCache.getStats(),
      data: this.dataCache.getStats(),
      loading: this.loadingPromises.size,
    };
  }

  /**
   * 估算数据大小
   */
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // UTF-16
    } catch {
      return 1024; // 默认1KB
    }
  }
}

// ==================== 全局实例 ====================

export const resourceLoader = new ResourceLoader();

// ==================== 防抖和节流 ====================

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastTime >= wait) {
      lastTime = now;
      func.apply(this, args);
    } else {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        lastTime = Date.now();
        func.apply(this, args);
      }, wait - (now - lastTime));
    }
  };
}

