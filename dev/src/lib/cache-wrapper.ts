// dev/src/lib/cache-wrapper.ts
// Next.js缓存包装器 - 基于React cache()和unstable_cache()最佳实践
// 参考: https://nextjs.org/docs/app/building-your-application/caching

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getRedisManager, CACHE_TTL } from './redis';
import { logger } from './logger';

/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /** 缓存标签（用于失效） */
  tags?: string[];
  /** 重新验证时间（秒） */
  revalidate?: number;
  /** 是否使用Redis缓存 */
  useRedis?: boolean;
  /** Redis缓存键前缀 */
  redisPrefix?: string;
}

/**
 * React cache() 包装器
 * 用于在单次渲染中去重数据请求
 * 参考: https://react.dev/reference/react/cache
 * 
 * @example
 * ```ts
 * const getUser = cachedFn(async (id: string) => {
 *   return await db.user.findUnique({ where: { id } });
 * });
 * ```
 */
export function cachedFn<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  return cache(fn);
}

/**
 * Next.js unstable_cache() 包装器
 * 用于缓存数据库查询和API调用
 * 参考: https://nextjs.org/docs/app/api-reference/functions/unstable_cache
 * 
 * @example
 * ```ts
 * const getCachedPosts = cachedQuery(
 *   async () => await db.post.findMany(),
 *   ['posts'],
 *   { revalidate: 3600, tags: ['posts'] }
 * );
 * ```
 */
export function cachedQuery<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  options: CacheOptions = {}
): (...args: Args) => Promise<Result> {
  const { tags = [], revalidate = CACHE_TTL.MEDIUM } = options;
  
  return unstable_cache(fn, keyParts, {
    revalidate,
    tags,
  });
}

/**
 * Redis + React cache() 双层缓存包装器
 * 第一层：React cache()（请求去重）
 * 第二层：Redis（持久化缓存）
 * 
 * @example
 * ```ts
 * const getUser = cachedWithRedis(
 *   async (id: string) => await db.user.findUnique({ where: { id } }),
 *   { redisPrefix: 'user:', revalidate: 3600 }
 * );
 * ```
 */
export function cachedWithRedis<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  options: CacheOptions = {}
): (...args: Args) => Promise<Result> {
  const { redisPrefix = 'cache:', revalidate = CACHE_TTL.MEDIUM } = options;
  const redis = getRedisManager();
  
  // 第一层：React cache()去重
  const cachedFn = cache(async (...args: Args): Promise<Result> => {
    // 生成Redis缓存键
    const cacheKey = `${redisPrefix}${JSON.stringify(args)}`;
    
    // 第二层：尝试从Redis获取
    const cached = await redis.get<Result>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // 缓存未命中，执行原函数
    const result = await fn(...args);
    
    // 存入Redis
    await redis.set(cacheKey, result, revalidate);
    
    return result;
  });
  
  return cachedFn;
}

/**
 * 预加载数据（Preload Pattern）
 * 在组件渲染前提前触发数据获取
 * 参考: https://nextjs.org/docs/app/building-your-application/data-fetching/fetching#preloading-data
 * 
 * @example
 * ```ts
 * export const preloadUser = (id: string) => {
 *   void getUser(id);
 * };
 * 
 * // 在页面中使用
 * preloadUser(id);
 * const isAvailable = await checkAvailability();
 * return isAvailable ? <UserProfile id={id} /> : null;
 * ```
 */
export function createPreloader<Args extends unknown[]>(
  fn: (...args: Args) => Promise<unknown>
): (...args: Args) => void {
  return (...args: Args) => {
    // void操作符确保不等待Promise完成
    void fn(...args);
  };
}

/**
 * 并行数据获取辅助函数
 * 使用Promise.all并行获取多个数据源
 * 参考: https://nextjs.org/docs/app/building-your-application/data-fetching/fetching#parallel-data-fetching
 * 
 * @example
 * ```ts
 * const [user, posts] = await fetchParallel([
 *   getUser(userId),
 *   getPosts(userId)
 * ]);
 * ```
 */
export async function fetchParallel<T extends readonly unknown[]>(
  promises: readonly [...{ [K in keyof T]: Promise<T[K]> }]
): Promise<T> {
  return Promise.all(promises) as Promise<T>;
}

/**
 * 缓存失效辅助函数
 */
export class CacheInvalidation {
  private static redis = getRedisManager();
  
  /**
   * 按标签失效缓存
   * 注意：Next.js的revalidateTag只在生产环境有效
   */
  static async invalidateByTag(tag: string): Promise<void> {
    // Next.js标签失效
    const { revalidateTag } = await import('next/cache');
    revalidateTag(tag);
    
    // Redis模式失效
    await this.redis.delPattern(`*${tag}*`);
  }
  
  /**
   * 按路径失效缓存
   */
  static async invalidateByPath(path: string): Promise<void> {
    const { revalidatePath } = await import('next/cache');
    revalidatePath(path);
  }
  
  /**
   * 失效用户相关缓存
   */
  static async invalidateUser(userId: string): Promise<void> {
    await this.redis.delPattern(`*user:${userId}*`);
    await this.invalidateByTag(`user-${userId}`);
  }
  
  /**
   * 失效案件相关缓存
   */
  static async invalidateCase(caseId: string): Promise<void> {
    await this.redis.delPattern(`*case:${caseId}*`);
    await this.invalidateByTag(`case-${caseId}`);
  }
  
  /**
   * 失效庭审相关缓存
   */
  static async invalidateHearing(hearingId: string): Promise<void> {
    await this.redis.delPattern(`*hearing:${hearingId}*`);
    await this.invalidateByTag(`hearing-${hearingId}`);
  }
}

/**
 * 缓存预热辅助函数
 * 在应用启动或特定时机预先加载常用数据到缓存
 */
export class CacheWarming {
  private static redis = getRedisManager();
  
  /**
   * 预热系统配置
   */
  static async warmSystemConfig(): Promise<void> {
    // 实现系统配置预热逻辑
    logger.info('预热系统配置缓存');
  }
  
  /**
   * 预热文档模板
   */
  static async warmDocumentTemplates(): Promise<void> {
    // 实现文档模板预热逻辑
    logger.info('预热文档模板缓存');
  }
  
  /**
   * 预热所有关键数据
   */
  static async warmAll(): Promise<void> {
    await Promise.all([
      this.warmSystemConfig(),
      this.warmDocumentTemplates(),
    ]);
    logger.info('缓存预热完成');
  }
}

/**
 * 缓存监控辅助函数
 */
export class CacheMonitoring {
  private static redis = getRedisManager();
  
  /**
   * 获取缓存性能指标
   */
  static async getMetrics(): Promise<{
    hitRate: string;
    totalKeys: number;
    memoryUsage: string;
  }> {
    const stats = await this.redis.getStats();
    return {
      hitRate: stats.hitRate,
      totalKeys: stats.keys,
      memoryUsage: stats.memory,
    };
  }
  
  /**
   * 记录缓存命中/未命中
   */
  static async recordCacheAccess(key: string, hit: boolean): Promise<void> {
    const metricKey = `metrics:cache:${hit ? 'hits' : 'misses'}`;
    await this.redis.getClient().incr(metricKey);
  }
}

/**
 * 导出常用缓存函数
 */
export {
  cache as reactCache,
  unstable_cache as nextCache,
};
