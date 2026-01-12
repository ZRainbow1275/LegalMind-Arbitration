/**
 * 缓存管理服务
 * 
 * 提供高性能的缓存机制
 */

/**
 * 缓存项
 */
interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
  hits: number; // 命中次数
}

/**
 * 缓存统计
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalItems: number;
}

/**
 * 缓存管理器
 */
export class CacheManager {
  private cache: Map<string, CacheItem<any>> = new Map();
  private maxSize = 100; // 最大缓存项数
  private defaultTTL = 5 * 60 * 1000; // 默认5分钟
  private hits = 0;
  private misses = 0;

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // 检查缓存大小
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    });

    console.log(`[CacheManager] 缓存已设置: ${key}`);
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      this.misses++;
      console.log(`[CacheManager] 缓存未命中: ${key}`);
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.misses++;
      console.log(`[CacheManager] 缓存已过期: ${key}`);
      return null;
    }

    // 更新命中次数
    item.hits++;
    this.hits++;
    console.log(`[CacheManager] 缓存命中: ${key} (命中次数: ${item.hits})`);

    return item.value as T;
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    // 检查是否过期
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      console.log(`[CacheManager] 缓存已删除: ${key}`);
    }
    return result;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    console.log('[CacheManager] 缓存已清空');
  }

  /**
   * 获取或设置缓存（如果不存在则计算）
   */
  async getOrSet<T>(
    key: string,
    factory: () => T | Promise<T>,
    ttl?: number
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 计算新值
    const value = await factory();

    // 设置缓存
    this.set(key, value, ttl);

    return value;
  }

  /**
   * 淘汰策略（LRU - 最少使用）
   */
  private evict(): void {
    let minHits = Infinity;
    let keyToEvict: string | null = null;

    // 查找命中次数最少的项
    this.cache.forEach((item, key) => {
      if (item.hits < minHits) {
        minHits = item.hits;
        keyToEvict = key;
      }
    });

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      console.log(`[CacheManager] 淘汰缓存: ${keyToEvict} (命中次数: ${minHits})`);
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      totalItems: this.cache.size,
    };
  }

  /**
   * 打印缓存统计
   */
  printStats(): void {
    const stats = this.getStats();

    console.log('\n=== 缓存统计 ===');
    console.log(`缓存大小: ${stats.size}/${this.maxSize}`);
    console.log(`命中次数: ${stats.hits}`);
    console.log(`未命中次数: ${stats.misses}`);
    console.log(`命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log('================\n');
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`[CacheManager] 清理了 ${cleanedCount} 个过期缓存`);
    }
  }

  /**
   * 设置最大缓存大小
   */
  setMaxSize(size: number): void {
    this.maxSize = size;
    console.log(`[CacheManager] 最大缓存大小设置为: ${size}`);
  }

  /**
   * 设置默认TTL
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
    console.log(`[CacheManager] 默认TTL设置为: ${ttl}ms`);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.clear();
  }
}

/**
 * 全局缓存管理器实例
 */
export const cacheManager = new CacheManager();

/**
 * 缓存装饰器
 */
export function cached(ttl?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cacheKeyPrefix = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      // 生成缓存键
      const cacheKey = `${cacheKeyPrefix}:${JSON.stringify(args)}`;

      // 尝试从缓存获取
      return cacheManager.getOrSet(
        cacheKey,
        () => originalMethod.apply(this, args),
        ttl
      );
    };

    return descriptor;
  };
}

