// dev/src/lib/redis.ts
// Redis缓存管理器 - 基于ioredis v5.4.0最佳实践和等保三级安全标准

import Redis, { RedisOptions } from 'ioredis';
import { getEnv } from './env-validator';
import { logger } from './logger';

/**
 * Redis配置 - 基于ioredis最佳实践
 * 参考: https://github.com/redis/ioredis
 */
function getRedisConfig(): RedisOptions {
  const env = getEnv();

  // 解析Redis URL
  const redisUrl = env.REDIS_URL;
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: env.REDIS_PASSWORD || url.password || undefined,
    db: typeof env.REDIS_DB === 'number' ? env.REDIS_DB : 0,
    keyPrefix: env.REDIS_PREFIX || 'legalmind:',

    // 连接配置
    connectTimeout: typeof env.REDIS_CONNECT_TIMEOUT === 'number' ? env.REDIS_CONNECT_TIMEOUT : 10000,
    maxRetriesPerRequest: typeof env.REDIS_MAX_RETRIES === 'number' ? env.REDIS_MAX_RETRIES : 3,

    // 重试策略（基于ioredis最佳实践）
    // 参考: https://github.com/redis/ioredis#auto-reconnect
    retryStrategy(times: number) {
      const baseDelay = typeof env.REDIS_RETRY_DELAY === 'number' ? env.REDIS_RETRY_DELAY : 1000;
      const delay = Math.min(times * baseDelay, 5000);

      // 最多重试10次
      if (times > 10) {
        logger.error({ times }, 'Redis连接重试次数超限，停止重试');
        return null;
      }

      if (times > 1) {
        logger.warn({ times, delayMs: delay }, 'Redis连接重试');
      }

      return delay;
    },

    // 重新连接策略
    reconnectOnError(err: Error) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // 只在特定错误时重连
        return true;
      }
      return false;
    },

    // 启用离线队列（命令会在连接断开时排队）
    enableOfflineQueue: true,

    // 启用自动流水线（提升性能）
    enableAutoPipelining: true,

    // 启用就绪检查
    enableReadyCheck: true,

    // 懒加载连接（仅在首次命令时连接）
    lazyConnect: true,
  };
}

// 缓存键前缀
export const CACHE_PREFIXES = {
  USER_SESSION: 'session:user:',
  USER_PROFILE: 'profile:user:',
  CASE_LIST: 'cases:list:',
  CASE_DETAIL: 'case:detail:',
  HEARING_LIST: 'hearings:list:',
  HEARING_DETAIL: 'hearing:detail:',
  NOTIFICATION_COUNT: 'notifications:count:',
  DOCUMENT_LIST: 'documents:list:',
  TEMPLATE_LIST: 'templates:list:',
  BATCH_OPERATION: 'batch:operation:',
  API_RATE_LIMIT: 'rate:limit:',
  SYSTEM_CONFIG: 'system:config:',
} as const;

// 缓存过期时间（秒）- 基于环境变量配置
export const CACHE_TTL = {
  SHORT: parseInt(process.env.CACHE_TTL_SHORT || '300'),      // 5分钟
  MEDIUM: parseInt(process.env.CACHE_TTL_MEDIUM || '1800'),   // 30分钟
  LONG: parseInt(process.env.CACHE_TTL_LONG || '3600'),       // 1小时
  VERY_LONG: parseInt(process.env.CACHE_TTL_VERY_LONG || '86400'), // 24小时

  // 业务特定TTL
  USER_SESSION: 30 * 60, // 30分钟
  USER_PROFILE: 60 * 60, // 1小时
  CASE_LIST: 5 * 60, // 5分钟
  CASE_DETAIL: 10 * 60, // 10分钟
  HEARING_LIST: 3 * 60, // 3分钟
  HEARING_DETAIL: 5 * 60, // 5分钟
  NOTIFICATION_COUNT: 1 * 60, // 1分钟
  DOCUMENT_LIST: 10 * 60, // 10分钟
  TEMPLATE_LIST: 30 * 60, // 30分钟
  BATCH_OPERATION: 60 * 60, // 1小时
  API_RATE_LIMIT: 60, // 1分钟
  SYSTEM_CONFIG: 60 * 60, // 1小时
} as const;

/**
 * 全局Redis客户端实例
 * 使用单例模式避免多次连接
 */
declare global {
  // eslint-disable-next-line no-var
  var __redisManager: RedisManager | undefined;
}

class RedisManager {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    const config = getRedisConfig();
    this.client = new Redis(config);
    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers() {
    this.client.on('connect', () => {
      logger.info('Redis连接成功');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      logger.info('Redis就绪，可以接受命令');
    });

    this.client.on('error', (error) => {
      logger.error({ err: error }, 'Redis连接错误');
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('Redis连接已关闭');
      this.isConnected = false;
    });

    this.client.on('reconnecting', (delay: number) => {
      logger.info({ delayMs: delay }, 'Redis重新连接中');
    });
  }

  /**
   * 获取原始Redis客户端（用于高级操作）
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * 检查Redis连接状态
   */
  async isReady(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 设置缓存（支持自动序列化）
   * @param key 缓存键
   * @param value 缓存值（自动JSON序列化）
   * @param ttl 过期时间（秒），默认使用MEDIUM TTL
   */
  async set<T>(key: string, value: T, ttl: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error({ err: error, key }, 'Redis设置缓存失败');
      return false;
    }
  }

  /**
   * 获取缓存（支持自动反序列化）
   * @param key 缓存键
   * @returns 缓存值（自动JSON反序列化）
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ err: error, key }, 'Redis获取缓存失败');
      return null;
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键或键数组
   * @returns 删除的键数量
   */
  async del(key: string | string[]): Promise<number> {
    try {
      const keys = Array.isArray(key) ? key : [key];
      return await this.client.del(...keys);
    } catch (error) {
      logger.error({ err: error }, 'Redis删除缓存失败');
      return 0;
    }
  }

  /**
   * 批量删除缓存（支持通配符）
   * 注意：在生产环境中谨慎使用KEYS命令，可能影响性能
   * @param pattern 键模式（支持通配符）
   * @returns 删除的键数量
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      // 使用pipeline批量删除，提升性能
      const pipeline = this.client.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();

      return keys.length;
    } catch (error) {
      logger.error({ err: error, pattern }, 'Redis批量删除缓存失败');
      return 0;
    }
  }

  /**
   * 清空当前逻辑命名空间下的所有缓存键
   * 注意：由于启用了 keyPrefix，这里使用通配符匹配并批量删除，避免直接对 Redis 执行全库 flushall。
   * @returns 删除的键数量
   */
  async flushAll(): Promise<number> {
    return await this.delPattern('*');
  }

  /**
   * 批量获取缓存
   * @param keys 缓存键数组
   * @returns 缓存值数组
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.client.mget(...keys);
      return values.map(v => v ? JSON.parse(v) as T : null);
    } catch (error) {
      logger.error({ err: error, keyCount: keys.length }, 'Redis批量获取缓存失败');
      return keys.map(() => null);
    }
  }

  /**
   * 批量设置缓存
   * @param items 键值对数组
   * @param ttl 过期时间（秒）
   */
  async mset<T>(items: Array<{ key: string; value: T }>, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    try {
      const pipeline = this.client.pipeline();

      for (const item of items) {
        const serialized = JSON.stringify(item.value);
        pipeline.setex(item.key, ttl, serialized);
      }

      await pipeline.exec();
    } catch (error) {
      logger.error({ err: error, itemCount: items.length }, 'Redis批量设置缓存失败');
      throw error;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({ err: error, key }, 'Redis检查键存在失败');
      return false;
    }
  }

  /**
   * 设置键的过期时间
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error({ err: error, key, ttl }, 'Redis设置过期时间失败');
      return false;
    }
  }

  /**
   * 获取键的剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error({ err: error, key }, 'Redis获取过期时间失败');
      return -1;
    }
  }

  /**
   * 原子性递增
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error({ err: error, key }, 'Redis递增失败');
      return 0;
    }
  }

  /**
   * 原子性递增指定值
   */
  async incrby(key: string, increment: number): Promise<number> {
    try {
      return await this.client.incrby(key, increment);
    } catch (error) {
      logger.error({ err: error, key, increment }, 'Redis递增指定值失败');
      return 0;
    }
  }

  /**
   * 设置哈希字段
   */
  async hset<T>(key: string, field: string, value: T): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.hset(key, field, serializedValue);
      return true;
    } catch (error) {
      logger.error({ err: error, key, field }, 'Redis设置哈希字段失败');
      return false;
    }
  }

  /**
   * 获取哈希字段
   */
  async hget<T = unknown>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ err: error, key, field }, 'Redis获取哈希字段失败');
      return null;
    }
  }

  /**
   * 获取所有哈希字段
   */
  async hgetall<T = unknown>(key: string): Promise<Record<string, T> | null> {
    try {
      const hash = await this.client.hgetall(key);
      if (Object.keys(hash).length === 0) return null;
      
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value) as T;
      }
      return result;
    } catch (error) {
      logger.error({ err: error, key }, 'Redis获取所有哈希字段失败');
      return null;
    }
  }

  /**
   * 删除哈希字段
   */
  async hdel(key: string, field: string): Promise<boolean> {
    try {
      await this.client.hdel(key, field);
      return true;
    } catch (error) {
      logger.error({ err: error, key, field }, 'Redis删除哈希字段失败');
      return false;
    }
  }

  /**
   * 列表左推入
   */
  async lpush<T>(key: string, value: T): Promise<number> {
    try {
      const serializedValue = JSON.stringify(value);
      return await this.client.lpush(key, serializedValue);
    } catch (error) {
      logger.error({ err: error, key }, 'Redis列表左推入失败');
      return 0;
    }
  }

  /**
   * 列表右弹出
   */
  async rpop<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await this.client.rpop(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ err: error, key }, 'Redis列表右弹出失败');
      return null;
    }
  }

  /**
   * 获取列表长度
   */
  async llen(key: string): Promise<number> {
    try {
      return await this.client.llen(key);
    } catch (error) {
      logger.error({ err: error, key }, 'Redis获取列表长度失败');
      return 0;
    }
  }

  /**
   * 获取Redis统计信息
   * 包含连接状态、内存使用、命中率等关键指标
   */
  async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
    hits: number;
    misses: number;
    hitRate: string;
  }> {
    try {
      const info = await this.client.info('stats');
      const dbsize = await this.client.dbsize();
      const memory = await this.client.info('memory');

      // 解析统计信息
      const hits = parseInt(this.parseInfoValue(info, 'keyspace_hits')) || 0;
      const misses = parseInt(this.parseInfoValue(info, 'keyspace_misses')) || 0;
      const total = hits + misses;
      const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';

      return {
        connected: this.isConnected,
        keys: dbsize,
        memory: this.parseInfoValue(memory, 'used_memory_human'),
        hits,
        misses,
        hitRate: `${hitRate}%`,
      };
    } catch (error) {
      logger.error({ err: error }, 'Redis获取统计信息失败');
      return {
        connected: false,
        keys: 0,
        memory: '0B',
        hits: 0,
        misses: 0,
        hitRate: '0.00%'
      };
    }
  }

  /**
   * 解析Redis INFO命令返回值
   */
  private parseInfoValue(info: string, key: string): string {
    const match = info.match(new RegExp(`${key}:(.+)`));
    return match ? match[1].trim() : '0';
  }

  /**
   * 优雅关闭Redis连接
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis连接已优雅关闭');
    } catch (error) {
      logger.error({ err: error }, 'Redis断开连接失败');
      // 强制关闭
      this.client.disconnect();
    }
  }
}

/**
 * 创建全局Redis实例（单例模式）
 * 在开发环境中使用全局变量避免热重载时重复创建
 */
export function getRedisManager(): RedisManager {
  if (!globalThis.__redisManager) {
    globalThis.__redisManager = new RedisManager();
  }
  return globalThis.__redisManager;
}

// 默认Redis管理器实例（懒加载：避免在 next build/预渲染阶段建立外部连接）
export const redis: RedisManager = new Proxy({} as RedisManager, {
  get(_target, prop) {
    return (getRedisManager() as unknown as Record<PropertyKey, unknown>)[prop];
  },
});

// 缓存工具函数
export class CacheUtils {
  private static redis = redis;

  /**
   * 生成缓存键
   */
  static generateKey(prefix: string, ...parts: string[]): string {
    return `${prefix}${parts.join(':')}`;
  }

  /**
   * 缓存用户会话
   */
  static async cacheUserSession<T>(userId: string, sessionData: T): Promise<boolean> {
    const key = this.generateKey(CACHE_PREFIXES.USER_SESSION, userId);
    return await this.redis.set(key, sessionData, CACHE_TTL.USER_SESSION);
  }

  /**
   * 获取用户会话
   */
  static async getUserSession<T = unknown>(userId: string): Promise<T | null> {
    const key = this.generateKey(CACHE_PREFIXES.USER_SESSION, userId);
    return await this.redis.get<T>(key);
  }

  /**
   * 清除用户会话
   */
  static async clearUserSession(userId: string): Promise<boolean> {
    const key = this.generateKey(CACHE_PREFIXES.USER_SESSION, userId);
    return (await this.redis.del(key)) > 0;
  }

  /**
   * 缓存案件列表
   */
  static async cacheCaseList<T>(userId: string, filters: string, data: T): Promise<boolean> {
    const key = this.generateKey(CACHE_PREFIXES.CASE_LIST, userId, filters);
    return await this.redis.set(key, data, CACHE_TTL.CASE_LIST);
  }

  /**
   * 获取案件列表缓存
   */
  static async getCaseList<T = unknown>(userId: string, filters: string): Promise<T | null> {
    const key = this.generateKey(CACHE_PREFIXES.CASE_LIST, userId, filters);
    return await this.redis.get<T>(key);
  }

  /**
   * 清除用户相关缓存
   */
  static async clearUserCache(userId: string): Promise<number> {
    const patterns = [
      `${CACHE_PREFIXES.USER_SESSION}${userId}*`,
      `${CACHE_PREFIXES.USER_PROFILE}${userId}*`,
      `${CACHE_PREFIXES.CASE_LIST}${userId}*`,
      `${CACHE_PREFIXES.NOTIFICATION_COUNT}${userId}*`,
    ];

    let totalCleared = 0;
    for (const pattern of patterns) {
      totalCleared += await this.redis.delPattern(pattern);
    }
    
    return totalCleared;
  }

  /**
   * API限流检查
   */
  static async checkRateLimit(identifier: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.generateKey(CACHE_PREFIXES.API_RATE_LIMIT, identifier);
    
    try {
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        await this.redis.expire(key, window);
      }
      
      const ttl = await this.redis.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime,
      };
    } catch (error) {
      logger.error({ err: error }, 'API限流检查失败');
      return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 };
    }
  }
}

export default redis;
