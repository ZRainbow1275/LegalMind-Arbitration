// dev/src/lib/middleware.ts
// 中间件系统 - 请求日志、API限流、缓存、监控

import { NextRequest, NextResponse } from 'next/server';
import { getRedisManager, CacheUtils } from './redis';
import { verifyToken } from './auth';
import { logger } from './logger';

// 中间件配置接口
interface MiddlewareConfig {
  enableLogging: boolean;
  enableRateLimit: boolean;
  enableCache: boolean;
  enableMonitoring: boolean;
  rateLimitRules: RateLimitRule[];
  cacheRules: CacheRule[];
}

interface RateLimitRule {
  path: string;
  method?: string;
  limit: number;
  window: number; // 秒
  skipAuthenticated?: boolean;
}

interface CacheRule {
  path: string;
  method: string;
  ttl: number;
  varyBy?: string[]; // 缓存变化因子
}

// 默认配置
const DEFAULT_CONFIG: MiddlewareConfig = {
  enableLogging: true,
  enableRateLimit: true,
  enableCache: true,
  enableMonitoring: true,
  rateLimitRules: [
    // 认证相关API限流
    { path: '/api/auth/login', method: 'POST', limit: 5, window: 300 }, // 5次/5分钟
    { path: '/api/auth/register', method: 'POST', limit: 3, window: 3600 }, // 3次/小时
    
    // 通用API限流
    { path: '/api/*', limit: 100, window: 60 }, // 100次/分钟
    
    // 批量操作限流
    { path: '/api/cases/batch-import', method: 'POST', limit: 5, window: 3600 }, // 5次/小时
    
    // 文书生成限流
    { path: '/api/documents/generate', method: 'POST', limit: 20, window: 60 }, // 20次/分钟
  ],
  cacheRules: [
    // 案件列表缓存
    { path: '/api/cases', method: 'GET', ttl: 300, varyBy: ['userId', 'query'] },
    
    // 庭审列表缓存
    { path: '/api/hearings', method: 'GET', ttl: 180, varyBy: ['userId', 'query'] },
    
    // 文档模板列表缓存
    { path: '/api/documents/templates', method: 'GET', ttl: 1800, varyBy: ['query'] },
    
    // 系统健康检查缓存
    { path: '/api/health', method: 'GET', ttl: 30 },
  ],
};

// 请求日志接口
interface RequestLog {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  userId?: string;
  timestamp: string;
  duration?: number;
  statusCode?: number;
  error?: string;
}

class MiddlewareManager {
  private config: MiddlewareConfig;
  private redis = getRedisManager();

  constructor(config: Partial<MiddlewareConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 主中间件处理函数
   */
  async handle(request: NextRequest): Promise<NextResponse | null> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // 创建请求日志
    const requestLog: RequestLog = {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: this.getClientIP(request),
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. 请求日志记录
      if (this.config.enableLogging) {
        await this.logRequest(requestLog);
      }

      // 2. API限流检查
      if (this.config.enableRateLimit) {
        const rateLimitResult = await this.checkRateLimit(request, requestLog);
        if (rateLimitResult) {
          return rateLimitResult;
        }
      }

      // 3. 缓存检查（仅GET请求）
      if (this.config.enableCache && request.method === 'GET') {
        const cachedResponse = await this.checkCache(request, requestLog);
        if (cachedResponse) {
          return cachedResponse;
        }
      }

      // 4. 监控数据收集
      if (this.config.enableMonitoring) {
        await this.collectMetrics(request, requestLog);
      }

      return null; // 继续处理请求

    } catch (error) {
      logger.error({ err: error }, '中间件处理失败');
      requestLog.error = error instanceof Error ? error.message : '未知错误';
      
      if (this.config.enableLogging) {
        await this.logRequest(requestLog);
      }
      
      return null; // 继续处理请求，不因中间件错误中断
    }
  }

  /**
   * 响应后处理
   */
  async afterResponse(request: NextRequest, response: NextResponse, startTime: number): Promise<void> {
    const duration = Date.now() - startTime;
    const requestId = response.headers.get('x-request-id') || this.generateRequestId();

    try {
      // 更新请求日志
      if (this.config.enableLogging) {
        await this.updateRequestLog(requestId, {
          duration,
          statusCode: response.status,
        });
      }

      // 缓存响应（如果适用）
      if (this.config.enableCache && request.method === 'GET' && response.status === 200) {
        await this.cacheResponse(request, response);
      }

      // 更新监控指标
      if (this.config.enableMonitoring) {
        await this.updateMetrics(request, response, duration);
      }

    } catch (error) {
      logger.error({ err: error }, '响应后处理失败');
    }
  }

  /**
   * API限流检查
   */
  private async checkRateLimit(request: NextRequest, requestLog: RequestLog): Promise<NextResponse | null> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 查找匹配的限流规则
    const rule = this.config.rateLimitRules.find(rule => {
      const pathMatch = rule.path.endsWith('*') 
        ? path.startsWith(rule.path.slice(0, -1))
        : path === rule.path;
      const methodMatch = !rule.method || rule.method === request.method;
      return pathMatch && methodMatch;
    });

    if (!rule) return null;

    // 获取限流标识符
    let identifier = requestLog.ip;
    
    // 如果规则不跳过认证用户，尝试获取用户ID
    if (!rule.skipAuthenticated) {
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      if (token) {
        try {
          const payload = verifyToken(token);
          if (payload) {
            identifier = `user:${payload.userId}`;
            requestLog.userId = payload.userId;
          }
        } catch (error) {
          // 忽略token验证错误，使用IP作为标识符
        }
      }
    }

    // 检查限流
    const rateLimitResult = await CacheUtils.checkRateLimit(
      `${path}:${request.method}:${identifier}`,
      rule.limit,
      rule.window
    );

    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: '请求过于频繁，请稍后再试',
            details: {
              limit: rule.limit,
              window: rule.window,
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime,
            },
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: requestLog.requestId,
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rule.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    return null;
  }

  /**
   * 缓存检查
   */
  private async checkCache(request: NextRequest, requestLog: RequestLog): Promise<NextResponse | null> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 查找匹配的缓存规则
    const rule = this.config.cacheRules.find(rule => 
      rule.path === path && rule.method === request.method
    );

    if (!rule) return null;

    // 生成缓存键
    const cacheKey = await this.generateCacheKey(request, rule);
    
    // 检查缓存
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      return new NextResponse(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Request-Id': requestLog.requestId,
        },
      });
    }

    return null;
  }

  /**
   * 缓存响应
   */
  private async cacheResponse(request: NextRequest, response: NextResponse): Promise<void> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 查找匹配的缓存规则
    const rule = this.config.cacheRules.find(rule => 
      rule.path === path && rule.method === request.method
    );

    if (!rule) return;

    try {
      // 读取响应数据
      const responseData = await response.json();
      
      // 生成缓存键
      const cacheKey = await this.generateCacheKey(request, rule);
      
      // 缓存响应
      await this.redis.set(cacheKey, responseData, rule.ttl);
      
    } catch (error) {
      logger.error({ err: error }, '缓存响应失败');
    }
  }

  /**
   * 生成缓存键
   */
  private async generateCacheKey(request: NextRequest, rule: CacheRule): Promise<string> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    const keyParts = [path, rule.method];
    
    if (rule.varyBy) {
      for (const factor of rule.varyBy) {
        if (factor === 'userId') {
          // 获取用户ID
          const token = request.headers.get('authorization')?.replace('Bearer ', '');
          if (token) {
            try {
              const payload = verifyToken(token);
              if (payload) {
                keyParts.push(`user:${payload.userId}`);
              }
            } catch (error) {
              // 忽略错误
            }
          }
        } else if (factor === 'query') {
          // 添加查询参数
          const queryString = url.search;
          if (queryString) {
            keyParts.push(queryString);
          }
        }
      }
    }
    
    return `cache:api:${keyParts.join(':')}`;
  }

  /**
   * 记录请求日志
   */
  private async logRequest(requestLog: RequestLog): Promise<void> {
    try {
      // 存储到Redis列表中（可以后续批量处理）
      await this.redis.lpush('logs:requests', requestLog);

      // 限制日志数量（保留最近1000条）
      await this.redis.getClient().ltrim('logs:requests', 0, 999);
    } catch (error) {
      logger.error({ err: error }, '记录请求日志失败');
    }
  }

  /**
   * 更新请求日志
   */
  private async updateRequestLog(requestId: string, updates: Partial<RequestLog>): Promise<void> {
    try {
      // 这里可以实现更复杂的日志更新逻辑
      // 简化实现：记录完成日志
      await this.redis.lpush('logs:completed', {
        requestId,
        ...updates,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      logger.error({ err: error }, '更新请求日志失败');
    }
  }

  /**
   * 收集监控指标
   */
  private async collectMetrics(request: NextRequest, requestLog: RequestLog): Promise<void> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;
      
      // 增加请求计数
      await this.redis.incr(`metrics:requests:total`);
      await this.redis.incr(`metrics:requests:${method}`);
      await this.redis.incr(`metrics:requests:path:${path}`);
      
      // 设置过期时间（24小时）
      await this.redis.expire(`metrics:requests:total`, 86400);
      await this.redis.expire(`metrics:requests:${method}`, 86400);
      await this.redis.expire(`metrics:requests:path:${path}`, 86400);
      
    } catch (error) {
      logger.error({ err: error }, '收集监控指标失败');
    }
  }

  /**
   * 更新监控指标
   */
  private async updateMetrics(request: NextRequest, response: NextResponse, duration: number): Promise<void> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const status = response.status;
      
      // 记录响应状态
      await this.redis.incr(`metrics:responses:${status}`);
      await this.redis.incr(`metrics:responses:path:${path}:${status}`);
      
      // 记录响应时间
      await this.redis.lpush(`metrics:response_times:${path}`, duration);
      
      // 限制响应时间记录数量
      const rtCount = await this.redis.llen(`metrics:response_times:${path}`);
      if (rtCount > 100) {
        await this.redis.rpop(`metrics:response_times:${path}`);
      }
      
    } catch (error) {
      logger.error({ err: error }, '更新监控指标失败');
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取客户端IP
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }

  /**
   * 获取监控统计
   */
  async getStats(): Promise<{
    requests: {
      total: number;
      GET: number;
      POST: number;
      PUT: number;
      DELETE: number;
    };
    responses: {
      '200': number;
      '400': number;
      '401': number;
      '403': number;
      '404': number;
      '429': number;
      '500': number;
    };
    cache: {
      connected: boolean;
      keys: number;
      memory: string;
      hits: number;
      misses: number;
      hitRate: string;
    };
  }> {
    try {
      const readNumber = async (key: string) => (await this.redis.get<number>(key)) ?? 0;

      const stats = {
        requests: {
          total: await readNumber('metrics:requests:total'),
          GET: await readNumber('metrics:requests:GET'),
          POST: await readNumber('metrics:requests:POST'),
          PUT: await readNumber('metrics:requests:PUT'),
          DELETE: await readNumber('metrics:requests:DELETE'),
        },
        responses: {
          '200': await readNumber('metrics:responses:200'),
          '400': await readNumber('metrics:responses:400'),
          '401': await readNumber('metrics:responses:401'),
          '403': await readNumber('metrics:responses:403'),
          '404': await readNumber('metrics:responses:404'),
          '429': await readNumber('metrics:responses:429'),
          '500': await readNumber('metrics:responses:500'),
        },
        cache: await this.redis.getStats(),
      };

      return stats;
    } catch (error) {
      logger.error({ err: error }, '获取监控统计失败');
      return {
        requests: { total: 0, GET: 0, POST: 0, PUT: 0, DELETE: 0 },
        responses: { '200': 0, '400': 0, '401': 0, '403': 0, '404': 0, '429': 0, '500': 0 },
        cache: { connected: false, keys: 0, memory: 'unknown', hits: 0, misses: 0, hitRate: '0%' },
      };
    }
  }
}

// 创建全局中间件实例
let middlewareManager: MiddlewareManager | null = null;

export function getMiddlewareManager(): MiddlewareManager {
  if (!middlewareManager) {
    middlewareManager = new MiddlewareManager();
  }
  return middlewareManager;
}

export { MiddlewareManager };
export type { MiddlewareConfig, RateLimitRule, CacheRule, RequestLog };
