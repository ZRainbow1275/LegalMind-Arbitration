// dev/src/lib/performance-monitor.ts
// 性能监控工具 - 用于追踪API响应时间、数据库查询性能等

import { getRedisManager } from './redis';
import { logger } from './logger';

/**
 * 性能指标类型
 */
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceStats {
  count: number;
  avg: number;
  min: number;
  max: number;
}

export interface SlowQueryRecord {
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type PerformanceOverview = Record<string, PerformanceStats>;

/**
 * 性能监控类
 */
export class PerformanceMonitor {
  private static redis = getRedisManager();
  private static readonly METRICS_PREFIX = 'metrics:performance:';
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1秒
  
  /**
   * 测量函数执行时间
   * @param name 指标名称
   * @param fn 要测量的函数
   * @param metadata 附加元数据
   */
  static async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      // 记录性能指标
      await this.recordMetric({
        name,
        duration,
        timestamp: startTime,
        metadata,
      });
      
      // 如果执行时间超过阈值，记录慢查询
      if (duration > this.SLOW_QUERY_THRESHOLD) {
        await this.recordSlowQuery(name, duration, metadata);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // 记录失败的性能指标
      await this.recordMetric({
        name: `${name}:error`,
        duration,
        timestamp: startTime,
        metadata: { ...metadata, error: String(error) },
      });
      
      throw error;
    }
  }
  
  /**
   * 记录性能指标
   */
  private static async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}${metric.name}`;
      
      // 使用Redis列表存储最近的100条记录
      await this.redis.getClient().lpush(key, JSON.stringify(metric));
      await this.redis.getClient().ltrim(key, 0, 99);
      
      // 设置过期时间（24小时）
      await this.redis.expire(key, 86400);
      
      // 更新统计信息
      await this.updateStats(metric.name, metric.duration);
    } catch (error) {
      logger.error({ err: error }, '记录性能指标失败');
    }
  }
  
  /**
   * 更新统计信息
   */
  private static async updateStats(name: string, duration: number): Promise<void> {
    const statsKey = `${this.METRICS_PREFIX}stats:${name}`;
    
    try {
      const pipeline = this.redis.getClient().pipeline();
      
      // 增加调用次数
      pipeline.hincrby(statsKey, 'count', 1);
      
      // 累加总时间
      pipeline.hincrbyfloat(statsKey, 'total', duration);
      
      // 更新最小值
      const currentMin = await this.redis.hget<number>(statsKey, 'min');
      if (currentMin === null || duration < currentMin) {
        pipeline.hset(statsKey, 'min', duration);
      }
      
      // 更新最大值
      const currentMax = await this.redis.hget<number>(statsKey, 'max');
      if (currentMax === null || duration > currentMax) {
        pipeline.hset(statsKey, 'max', duration);
      }
      
      // 设置过期时间（24小时）
      pipeline.expire(statsKey, 86400);
      
      await pipeline.exec();
    } catch (error) {
      logger.error({ err: error }, '更新统计信息失败');
    }
  }
  
  /**
   * 记录慢查询
   */
  private static async recordSlowQuery(
    name: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const slowQueryKey = `${this.METRICS_PREFIX}slow:${name}`;
      const record = {
        duration,
        timestamp: Date.now(),
        metadata,
      };
      
      await this.redis.getClient().lpush(slowQueryKey, JSON.stringify(record));
      await this.redis.getClient().ltrim(slowQueryKey, 0, 49); // 保留最近50条
      await this.redis.expire(slowQueryKey, 86400);
      
      logger.warn({ name, durationMs: duration, metadata }, '慢查询检测');
    } catch (error) {
      logger.error({ err: error }, '记录慢查询失败');
    }
  }
  
  /**
   * 获取性能统计
   */
  static async getStats(name: string): Promise<{
    count: number;
    avg: number;
    min: number;
    max: number;
  } | null> {
    try {
      const statsKey = `${this.METRICS_PREFIX}stats:${name}`;
      const stats = await this.redis.hgetall<number>(statsKey);
      
      if (!stats) return null;
      
      const count = stats.count || 0;
      const total = stats.total || 0;
      const avg = count > 0 ? total / count : 0;
      
      return {
        count,
        avg: Math.round(avg * 100) / 100,
        min: stats.min || 0,
        max: stats.max || 0,
      };
    } catch (error) {
      logger.error({ err: error }, '获取性能统计失败');
      return null;
    }
  }
  
  /**
   * 获取慢查询列表
   */
  static async getSlowQueries(name: string, limit: number = 10): Promise<SlowQueryRecord[]> {
    try {
      const slowQueryKey = `${this.METRICS_PREFIX}slow:${name}`;
      const records = await this.redis.getClient().lrange(slowQueryKey, 0, limit - 1);

      return records.map((r) => JSON.parse(r) as SlowQueryRecord);
    } catch (error) {
      logger.error({ err: error }, '获取慢查询列表失败');
      return [];
    }
  }
  
  /**
   * 获取所有性能指标概览
   */
  static async getOverview(): Promise<PerformanceOverview> {
    try {
      const pattern = `${this.METRICS_PREFIX}stats:*`;
      const keys = await this.redis.getClient().keys(pattern);

      const overview: PerformanceOverview = {};
      
      for (const key of keys) {
        const name = key.replace(`${this.METRICS_PREFIX}stats:`, '');
        const stats = await this.getStats(name);
        if (stats) {
          overview[name] = stats;
        }
      }
      
      return overview;
    } catch (error) {
      logger.error({ err: error }, '获取性能概览失败');
      return {};
    }
  }
  
  /**
   * 清除性能指标
   */
  static async clearMetrics(name?: string): Promise<void> {
    try {
      if (name) {
        // 清除特定指标
        await this.redis.delPattern(`${this.METRICS_PREFIX}*${name}*`);
      } else {
        // 清除所有指标
        await this.redis.delPattern(`${this.METRICS_PREFIX}*`);
      }
      logger.info({ name: name ?? null }, '性能指标已清除');
    } catch (error) {
      logger.error({ err: error }, '清除性能指标失败');
    }
  }
}

/**
 * 性能监控装饰器
 * 用于自动测量类方法的执行时间
 * 
 * @example
 * ```ts
 * class UserService {
 *   @measurePerformance('UserService.getUser')
 *   async getUser(id: string) {
 *     return await db.user.findUnique({ where: { id } });
 *   }
 * }
 * ```
 */
export function measurePerformance(name: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return await PerformanceMonitor.measure(
        name,
        () => originalMethod.apply(this, args),
        { method: propertyKey, args: args.length }
      );
    };
    
    return descriptor;
  };
}

/**
 * API响应时间中间件辅助函数
 */
export class APIPerformanceTracker {
  /**
   * 记录API请求性能
   */
  static async trackRequest(
    method: string,
    path: string,
    duration: number,
    statusCode: number
  ): Promise<void> {
    const name = `api:${method}:${path}`;
    
    await PerformanceMonitor.measure(
      name,
      async () => {
        // 空函数，只是为了记录指标
      },
      { method, path, statusCode, duration }
    );
  }
  
  /**
   * 获取API性能报告
   */
  static async getReport(): Promise<PerformanceOverview> {
    const overview = await PerformanceMonitor.getOverview();

    // 过滤出API相关的指标
    const apiMetrics: PerformanceOverview = {};
    for (const [key, value] of Object.entries(overview)) {
      if (key.startsWith('api:')) {
        apiMetrics[key] = value;
      }
    }
    
    return apiMetrics;
  }
}

/**
 * 数据库查询性能追踪
 */
export class DatabasePerformanceTracker {
  /**
   * 追踪Prisma查询性能
   */
  static async trackQuery<T>(
    model: string,
    operation: string,
    query: () => Promise<T>
  ): Promise<T> {
    const name = `db:${model}:${operation}`;
    return await PerformanceMonitor.measure(name, query, { model, operation });
  }
  
  /**
   * 获取数据库性能报告
   */
  static async getReport(): Promise<PerformanceOverview> {
    const overview = await PerformanceMonitor.getOverview();

    // 过滤出数据库相关的指标
    const dbMetrics: PerformanceOverview = {};
    for (const [key, value] of Object.entries(overview)) {
      if (key.startsWith('db:')) {
        dbMetrics[key] = value;
      }
    }
    
    return dbMetrics;
  }
}
