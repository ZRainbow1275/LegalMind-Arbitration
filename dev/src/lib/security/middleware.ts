// dev/src/lib/security/middleware.ts
// 安全防护中间件 - 等保三级标准

import { NextRequest, NextResponse } from 'next/server';
import { getRedisManager } from '../redis';
import { HashUtil } from './encryption';
import { getEnv } from '../env-validator';
import { logger } from '../logger';

/**
 * CSRF防护中间件
 * 防止跨站请求伪造攻击
 */
export class CSRFProtection {
  private static readonly CSRF_TOKEN_HEADER = 'x-csrf-token';
  private static readonly CSRF_COOKIE_NAME = 'csrf-token';
  
  /**
   * 生成CSRF令牌
   * @param sessionId 会话ID
   * @returns CSRF令牌
   */
  static generateToken(sessionId: string): string {
    const env = getEnv();
    const secret = env.CSRF_SECRET;
    const timestamp = Date.now().toString();
    
    // 使用HMAC生成令牌
    const token = HashUtil.hmac(`${sessionId}:${timestamp}`, secret);
    
    return `${token}:${timestamp}`;
  }
  
  /**
   * 验证CSRF令牌
   * @param token CSRF令牌
   * @param sessionId 会话ID
   * @returns 是否有效
   */
  static verifyToken(token: string, sessionId: string): boolean {
    try {
      const env = getEnv();
      const secret = env.CSRF_SECRET;
      const [receivedToken, timestamp] = token.split(':');
      
      // 检查令牌是否过期（1小时）
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 3600000) {
        logger.warn({ sessionId, tokenAgeMs: tokenAge }, 'CSRF令牌已过期');
        return false;
      }
      
      // 验证令牌
      const expectedToken = HashUtil.hmac(`${sessionId}:${timestamp}`, secret);
      
      return receivedToken === expectedToken;
    } catch (error) {
      logger.error({ err: error, sessionId }, 'CSRF令牌验证失败');
      return false;
    }
  }
  
  /**
   * CSRF保护中间件
   * @param request 请求对象
   * @param sessionId 会话ID
   * @returns 是否通过验证
   */
  static protect(request: NextRequest, sessionId: string): boolean {
    // GET、HEAD、OPTIONS请求不需要CSRF保护
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // 如果使用 Bearer Token（Authorization Header）进行鉴权，则不需要 CSRF（浏览器不会自动携带自定义授权头）
    const authorization = request.headers.get('authorization');
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
      return true;
    }

    // 获取CSRF令牌
    const token = request.headers.get(this.CSRF_TOKEN_HEADER);

    if (!token) {
      logger.warn({ method: request.method, sessionId }, '缺少CSRF令牌');
      return false;
    }
    
    return this.verifyToken(token, sessionId);
  }
}

/**
 * XSS防护工具
 * 防止跨站脚本攻击
 */
export class XSSProtection {
  /**
   * 清理HTML内容，移除潜在的XSS攻击代码
   * @param html HTML内容
   * @returns 清理后的内容
   */
  static sanitizeHTML(html: string): string {
    // 移除script标签
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // 移除事件处理器属性
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
    
    // 移除javascript:协议
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // 移除data:协议（可能包含恶意代码）
    sanitized = sanitized.replace(/data:text\/html/gi, '');
    
    return sanitized;
  }
  
  /**
   * 转义HTML特殊字符
   * @param text 文本
   * @returns 转义后的文本
   */
  static escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    
    return text.replace(/[&<>"'/]/g, (char) => map[char]);
  }
  
  /**
   * 设置XSS防护响应头
   * @param response 响应对象
   * @returns 添加了安全头的响应对象
   */
  static setSecurityHeaders(response: NextResponse): NextResponse {
    // X-XSS-Protection
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    // X-Content-Type-Options
    response.headers.set('X-Content-Type-Options', 'nosniff');
    
    // X-Frame-Options
    response.headers.set('X-Frame-Options', 'DENY');
    
    // Content-Security-Policy
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
    );
    
    // Strict-Transport-Security
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
    
    return response;
  }
}

/**
 * API限流中间件
 * 防止API滥用和DDoS攻击
 */
export class RateLimiter {
  private static redis = getRedisManager();
  private static readonly RATE_LIMIT_PREFIX = 'rate_limit:';
  
  /**
   * 限流配置
   */
  static readonly LIMITS = {
    // 全局限流：每分钟100次请求
    GLOBAL: { window: 60, max: 100 },
    
    // 登录限流：每分钟5次请求
    LOGIN: { window: 60, max: 5 },
    
    // API限流：每分钟30次请求
    API: { window: 60, max: 30 },
    
    // 文件上传限流：每分钟10次请求
    UPLOAD: { window: 60, max: 10 },
    
    // 敏感操作限流：每分钟3次请求
    SENSITIVE: { window: 60, max: 3 },
  };
  
  /**
   * 检查限流
   * @param identifier 标识符（用户ID或IP地址）
   * @param limitType 限流类型
   * @returns 限流结果
   */
  static async checkLimit(
    identifier: string,
    limitType: keyof typeof RateLimiter.LIMITS = 'GLOBAL'
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const limit = this.LIMITS[limitType];
    const key = `${this.RATE_LIMIT_PREFIX}${limitType}:${identifier}`;
    
    try {
      // 获取当前计数
      const current = await this.redis.getClient().incr(key);
      
      // 如果是第一次请求，设置过期时间
      if (current === 1) {
        await this.redis.expire(key, limit.window);
      }
      
      // 获取剩余过期时间
      const ttl = await this.redis.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);
      
      // 检查是否超过限制
      if (current > limit.max) {
        logger.warn(
          { limitType, identifier, current, max: limit.max },
          '限流触发'
        );
        
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: ttl,
        };
      }
      
      return {
        allowed: true,
        remaining: Math.max(0, limit.max - current),
        resetTime,
      };
    } catch (error) {
      logger.error({ err: error }, '限流检查失败');
      // 出错时允许请求通过，但记录日志
      return {
        allowed: true,
        remaining: limit.max,
        resetTime: Date.now() + limit.window * 1000,
      };
    }
  }
  
  /**
   * 设置限流响应头
   * @param response 响应对象
   * @param limitResult 限流结果
   * @returns 添加了限流头的响应对象
   */
  static setRateLimitHeaders(
    response: NextResponse,
    limitResult: Awaited<ReturnType<typeof RateLimiter.checkLimit>>
  ): NextResponse {
    response.headers.set('X-RateLimit-Remaining', limitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', limitResult.resetTime.toString());
    
    if (!limitResult.allowed && limitResult.retryAfter) {
      response.headers.set('Retry-After', limitResult.retryAfter.toString());
    }
    
    return response;
  }
}

/**
 * IP白名单/黑名单管理
 */
export class IPFilter {
  private static redis = getRedisManager();
  private static readonly WHITELIST_PREFIX = 'ip_whitelist:';
  private static readonly BLACKLIST_PREFIX = 'ip_blacklist:';
  
  /**
   * 添加IP到白名单
   * @param ip IP地址
   * @param ttl 过期时间（秒），0表示永久
   */
  static async addToWhitelist(ip: string, ttl: number = 0): Promise<void> {
    const key = `${this.WHITELIST_PREFIX}${ip}`;
    if (ttl > 0) {
      await this.redis.set(key, true, ttl);
    } else {
      await this.redis.set(key, true, 86400 * 365); // 1年
    }
    logger.info({ ip }, 'IP已添加到白名单');
  }
  
  /**
   * 添加IP到黑名单
   * @param ip IP地址
   * @param ttl 过期时间（秒），0表示永久
   * @param reason 原因
   */
  static async addToBlacklist(ip: string, ttl: number = 0, reason?: string): Promise<void> {
    const key = `${this.BLACKLIST_PREFIX}${ip}`;
    const value = { blocked: true, reason, timestamp: Date.now() };
    
    if (ttl > 0) {
      await this.redis.set(key, value, ttl);
    } else {
      await this.redis.set(key, value, 86400 * 365); // 1年
    }
    
    logger.warn({ ip, reason }, 'IP已添加到黑名单');
  }
  
  /**
   * 检查IP是否在白名单中
   * @param ip IP地址
   * @returns 是否在白名单中
   */
  static async isWhitelisted(ip: string): Promise<boolean> {
    const key = `${this.WHITELIST_PREFIX}${ip}`;
    return await this.redis.exists(key);
  }
  
  /**
   * 检查IP是否在黑名单中
   * @param ip IP地址
   * @returns 是否在黑名单中
   */
  static async isBlacklisted(ip: string): Promise<boolean> {
    const key = `${this.BLACKLIST_PREFIX}${ip}`;
    return await this.redis.exists(key);
  }
  
  /**
   * 从白名单移除IP
   * @param ip IP地址
   */
  static async removeFromWhitelist(ip: string): Promise<void> {
    const key = `${this.WHITELIST_PREFIX}${ip}`;
    await this.redis.del(key);
    logger.info({ ip }, 'IP已从白名单移除');
  }
  
  /**
   * 从黑名单移除IP
   * @param ip IP地址
   */
  static async removeFromBlacklist(ip: string): Promise<void> {
    const key = `${this.BLACKLIST_PREFIX}${ip}`;
    await this.redis.del(key);
    logger.info({ ip }, 'IP已从黑名单移除');
  }
  
  /**
   * 检查IP是否允许访问
   * @param ip IP地址
   * @returns 是否允许访问
   */
  static async isAllowed(ip: string): Promise<boolean> {
    // 如果在黑名单中，拒绝访问
    if (await this.isBlacklisted(ip)) {
      return false;
    }
    
    // 如果启用了白名单模式，只允许白名单中的IP
    const env = getEnv();
    if (env.IP_WHITELIST_ENABLED) {
      return await this.isWhitelisted(ip);
    }
    
    // 默认允许访问
    return true;
  }
}
