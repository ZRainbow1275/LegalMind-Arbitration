// dev/src/lib/cache-manager.ts

import { logger } from './logger';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheOptions {
  ttl?: number; // 生存时间（毫秒）
  maxSize?: number; // 最大缓存项数
  strategy?: 'LRU' | 'LFU' | 'FIFO'; // 缓存策略
}

class CacheManager {
  private cache = new Map<string, CacheItem<unknown>>();
  private defaultTTL = 5 * 60 * 1000; // 5分钟
  private maxSize = 100;
  private strategy: 'LRU' | 'LFU' | 'FIFO' = 'LRU';
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || this.defaultTTL;
    this.maxSize = options.maxSize || this.maxSize;
    this.strategy = options.strategy || this.strategy;
  }

  // 设置缓存
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const item: CacheItem<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.defaultTTL,
      accessCount: 0,
      lastAccessed: now
    };

    // 如果缓存已满，根据策略清理
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    this.cache.set(key, item);
  }

  // 获取缓存
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      this.misses++;
      return null;
    }

    const now = Date.now();

    // 检查是否过期
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // 更新访问信息
    item.accessCount++;
    item.lastAccessed = now;
    this.hits++;

      return item.data as T;
    }

  // 删除缓存
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
  }

  // 检查是否存在
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // 获取缓存大小
  size(): number {
    return this.cache.size;
  }

  // 获取缓存统计
  getStats() {
    const items = Array.from(this.cache.values());
    const now = Date.now();
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      avgAccessCount: items.reduce((sum, item) => sum + item.accessCount, 0) / items.length || 0,
      expiredItems: items.filter(item => now - item.timestamp > item.ttl).length,
      oldestItem: Math.min(...items.map(item => item.timestamp)),
      newestItem: Math.max(...items.map(item => item.timestamp))
    };
  }

  // 缓存清理策略
  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string;

    switch (this.strategy) {
      case 'LRU': // 最近最少使用
        keyToEvict = this.findLRUKey();
        break;
      case 'LFU': // 最少使用频率
        keyToEvict = this.findLFUKey();
        break;
      case 'FIFO': // 先进先出
        keyToEvict = this.findFIFOKey();
        break;
      default:
        keyToEvict = this.findLRUKey();
    }

    this.cache.delete(keyToEvict);
  }

  private findLRUKey(): string {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private findLFUKey(): string {
    let leastUsedKey = '';
    let leastCount = Infinity;

    for (const [key, item] of this.cache) {
      if (item.accessCount < leastCount) {
        leastCount = item.accessCount;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  private findFIFOKey(): string {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private calculateHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return Math.round((this.hits / total) * 10000) / 10000;
  }

  // 清理过期项
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // 预热缓存
  async warmup<T>(keys: string[], dataLoader: (key: string) => Promise<T>): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        const data = await dataLoader(key);
        this.set(key, data);
      } catch (error) {
        logger.warn({ key, err: error }, '缓存预热失败');
      }
    });

    await Promise.allSettled(promises);
  }

  // 批量获取
  getMultiple<T>(keys: string[]): Map<string, T | null> {
    const result = new Map<string, T | null>();
    
    for (const key of keys) {
      result.set(key, this.get<T>(key));
    }

    return result;
  }

  // 批量设置
  setMultiple<T>(items: Map<string, T>, ttl?: number): void {
    for (const [key, data] of items) {
      this.set(key, data, ttl);
    }
  }
}

// 创建全局缓存实例
export const globalCache = new CacheManager({
  ttl: 10 * 60 * 1000, // 10分钟
  maxSize: 200,
  strategy: 'LRU'
});

// 页面级缓存
export const pageCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5分钟
  maxSize: 50,
  strategy: 'LRU'
});

// API响应缓存
export const apiCache = new CacheManager({
  ttl: 2 * 60 * 1000, // 2分钟
  maxSize: 100,
  strategy: 'LFU'
});

// 图片缓存
export const imageCache = new CacheManager({
  ttl: 30 * 60 * 1000, // 30分钟
  maxSize: 50,
  strategy: 'LRU'
});

// 缓存装饰器
  export function cached(ttl?: number) {
    return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const cacheKey =
        typeof target === 'function'
        ? `${target.name}.${propertyKey}`
        : `${(target as { constructor?: { name?: string } }).constructor?.name ?? 'Unknown'}.${propertyKey}`;

    descriptor.value = function (...args: unknown[]) {
      const key = `${cacheKey}:${JSON.stringify(args)}`;
      
      // 尝试从缓存获取
      const cached = globalCache.get(key);
      if (cached !== null) {
        return cached;
      }

      // 执行原方法
      const result = originalMethod.apply(this, args);

      // 如果是Promise，等待结果后缓存
      if (result instanceof Promise) {
        return result.then((data) => {
          globalCache.set(key, data, ttl);
          return data;
        });
      }

      // 直接缓存结果
      globalCache.set(key, result, ttl);
      return result;
    };

      return descriptor;
    };
  }

  // 自动清理定时器
  let cleanupInterval: NodeJS.Timeout;

export function startCacheCleanup(intervalMs = 5 * 60 * 1000) {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  cleanupInterval = setInterval(() => {
    const cleaned = globalCache.cleanup() + 
                   pageCache.cleanup() + 
                   apiCache.cleanup() + 
                   imageCache.cleanup();
    
    if (cleaned > 0) {
      logger.info({ cleaned }, '缓存清理完成');
    }
  }, intervalMs);
}

export function stopCacheCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
}

// 在浏览器环境中自动启动清理
if (typeof window !== 'undefined') {
  startCacheCleanup();
}
