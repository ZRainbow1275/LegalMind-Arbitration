// dev/src/lib/security/session-manager.ts
// 会话管理系统 - 等保三级标准

import { getRedisManager } from '../redis';
import { logger } from '../logger';
import crypto from 'crypto';

/**
 * 会话数据接口
 */
export interface SessionData {
  userId: string;
  email: string;
  roles: string[];
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  lastActivity: number;
  mfaVerified: boolean;
}

/**
 * 登录尝试记录
 */
interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

/**
 * 会话管理器
 * 实现等保三级要求的会话管理功能
 */
export class SessionManager {
  private static redis = getRedisManager();
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly LOGIN_ATTEMPT_PREFIX = 'login_attempt:';
  private static readonly BLACKLIST_PREFIX = 'session_blacklist:';
  
  // 从环境变量读取配置
  private static readonly SESSION_TIMEOUT = parseInt(
    process.env.SESSION_TIMEOUT || String(30 * 60) // 默认30分钟
  );
  private static readonly MAX_LOGIN_ATTEMPTS = parseInt(
    process.env.MAX_LOGIN_ATTEMPTS || '5'
  );
  private static readonly LOCKOUT_DURATION = parseInt(
    process.env.LOCKOUT_DURATION || String(15 * 60) // 默认15分钟
  );
  
  /**
   * 创建会话
   * @param sessionData 会话数据
   * @returns 会话令牌
   */
  static async createSession(sessionData: Omit<SessionData, 'createdAt' | 'lastActivity'>): Promise<string> {
    // 生成安全的会话令牌
    const sessionToken = this.generateSecureToken();
    
    const session: SessionData = {
      ...sessionData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    
    // 存储会话到Redis
    const sessionKey = `${this.SESSION_PREFIX}${sessionToken}`;
    await this.redis.set(sessionKey, session, this.SESSION_TIMEOUT);
    
    logger.info({ userId: sessionData.userId }, 'Session created');
    
    return sessionToken;
  }
  
  /**
   * 获取会话
   * @param sessionToken 会话令牌
   * @returns 会话数据
   */
  static async getSession(sessionToken: string): Promise<SessionData | null> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionToken}`;
    
    // 检查会话是否在黑名单中
    const isBlacklisted = await this.isSessionBlacklisted(sessionToken);
    if (isBlacklisted) {
      logger.warn('Session token is blacklisted');
      return null;
    }
    
    const session = await this.redis.get<SessionData>(sessionKey);
    
    if (!session) {
      return null;
    }
    
    // 检查会话是否超时
    const now = Date.now();
    const inactiveTime = now - session.lastActivity;
    
    if (inactiveTime > this.SESSION_TIMEOUT * 1000) {
      logger.warn({ userId: session.userId }, 'Session expired');
      await this.destroySession(sessionToken);
      return null;
    }
    
    // 更新最后活动时间
    session.lastActivity = now;
    await this.redis.set(sessionKey, session, this.SESSION_TIMEOUT);
    
    return session;
  }
  
  /**
   * 销毁会话
   * @param sessionToken 会话令牌
   */
  static async destroySession(sessionToken: string): Promise<void> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionToken}`;
    await this.redis.del(sessionKey);
    
    // 将会话加入黑名单（防止令牌重用）
    await this.blacklistSession(sessionToken);
    
    logger.info('Session destroyed');
  }
  
  /**
   * 销毁用户的所有会话
   * @param userId 用户ID
   */
  static async destroyUserSessions(userId: string): Promise<void> {
    const pattern = `${this.SESSION_PREFIX}*`;
    const keys = await this.redis.getClient().keys(pattern);
    
    if (keys.length === 0) {
      logger.info({ userId, destroyedCount: 0 }, 'User sessions destroyed');
      return;
    }

    const sessions = await this.redis.mget<SessionData>(keys);
    const keysToDelete: string[] = [];

    for (let i = 0; i < keys.length; i++) {
      const session = sessions[i];
      if (session?.userId === userId) keysToDelete.push(keys[i]);
    }

    if (keysToDelete.length > 0) {
      await this.redis.del(keysToDelete);
    }

    logger.info({ userId, destroyedCount: keysToDelete.length }, 'User sessions destroyed');     
  }
  
  /**
   * 将会话加入黑名单
   * @param sessionToken 会话令牌
   */
  private static async blacklistSession(sessionToken: string): Promise<void> {
    const blacklistKey = `${this.BLACKLIST_PREFIX}${sessionToken}`;
    // 黑名单保留时间与会话超时时间相同
    await this.redis.set(blacklistKey, true, this.SESSION_TIMEOUT);
  }
  
  /**
   * 检查会话是否在黑名单中
   * @param sessionToken 会话令牌
   */
  private static async isSessionBlacklisted(sessionToken: string): Promise<boolean> {
    const blacklistKey = `${this.BLACKLIST_PREFIX}${sessionToken}`;
    return await this.redis.exists(blacklistKey);
  }
  
  /**
   * 记录登录尝试
   * @param identifier 标识符（用户名或IP地址）
   * @returns 是否被锁定
   */
  static async recordLoginAttempt(identifier: string): Promise<{ locked: boolean; remainingAttempts: number; lockedUntil?: number }> {
    const attemptKey = `${this.LOGIN_ATTEMPT_PREFIX}${identifier}`;
    const attempt = await this.redis.get<LoginAttempt>(attemptKey) || {
      count: 0,
      lastAttempt: Date.now(),
    };
    
    const now = Date.now();
    
    // 检查是否仍在锁定期内
    if (attempt.lockedUntil && now < attempt.lockedUntil) {
      return {
        locked: true,
        remainingAttempts: 0,
        lockedUntil: attempt.lockedUntil,
      };
    }
    
    // 增加尝试次数
    attempt.count++;
    attempt.lastAttempt = now;
    
    // 检查是否达到最大尝试次数
    if (attempt.count >= this.MAX_LOGIN_ATTEMPTS) {
      attempt.lockedUntil = now + this.LOCKOUT_DURATION * 1000;
      await this.redis.set(attemptKey, attempt, this.LOCKOUT_DURATION);
      
      logger.warn(
        {
          identifierHash: crypto.createHash('sha256').update(identifier).digest('hex').slice(0, 12),
          lockedUntil: new Date(attempt.lockedUntil).toISOString(),
        },
        'Account locked due to too many login attempts'
      );
      
      return {
        locked: true,
        remainingAttempts: 0,
        lockedUntil: attempt.lockedUntil,
      };
    }
    
    // 保存尝试记录
    await this.redis.set(attemptKey, attempt, this.LOCKOUT_DURATION);
    
    return {
      locked: false,
      remainingAttempts: this.MAX_LOGIN_ATTEMPTS - attempt.count,
    };
  }
  
  /**
   * 清除登录尝试记录（登录成功后调用）
   * @param identifier 标识符
   */
  static async clearLoginAttempts(identifier: string): Promise<void> {
    const attemptKey = `${this.LOGIN_ATTEMPT_PREFIX}${identifier}`;
    await this.redis.del(attemptKey);
  }
  
  /**
   * 检查账户是否被锁定
   * @param identifier 标识符
   * @returns 锁定信息
   */
  static async isAccountLocked(identifier: string): Promise<{ locked: boolean; lockedUntil?: number }> {
    const attemptKey = `${this.LOGIN_ATTEMPT_PREFIX}${identifier}`;
    const attempt = await this.redis.get<LoginAttempt>(attemptKey);
    
    if (!attempt || !attempt.lockedUntil) {
      return { locked: false };
    }
    
    const now = Date.now();
    if (now >= attempt.lockedUntil) {
      // 锁定期已过，清除记录
      await this.clearLoginAttempts(identifier);
      return { locked: false };
    }
    
    return {
      locked: true,
      lockedUntil: attempt.lockedUntil,
    };
  }
  
  /**
   * 生成安全的会话令牌
   * 使用加密安全的随机数生成器
   */
  private static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * 验证会话令牌格式
   * @param token 令牌
   * @returns 是否有效
   */
  static isValidTokenFormat(token: string): boolean {
    // 会话令牌应该是64个十六进制字符
    return /^[a-f0-9]{64}$/.test(token);
  }
  
  /**
   * 获取活跃会话统计
   */
  static async getActiveSessionStats(): Promise<{
    total: number;
    byUser: Record<string, number>;
  }> {
    const pattern = `${this.SESSION_PREFIX}*`;
    const keys = await this.redis.getClient().keys(pattern);
    
    const byUser: Record<string, number> = {};

    if (keys.length > 0) {
      const sessions = await this.redis.mget<SessionData>(keys);
      for (const session of sessions) {
        if (!session) continue;
        byUser[session.userId] = (byUser[session.userId] || 0) + 1;
      }
    }
    
    return {
      total: keys.length,
      byUser,
    };
  }
}

/**
 * 多因素认证（MFA）管理器
 */
export class MFAManager {
  private static redis = getRedisManager();
  private static readonly MFA_CODE_PREFIX = 'mfa_code:';
  private static readonly MFA_CODE_EXPIRY = 300; // 5分钟
  
  /**
   * 生成MFA验证码
   * @param userId 用户ID
   * @returns 6位数字验证码
   */
  static async generateMFACode(userId: string): Promise<string> {
    // 生成6位随机数字
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const codeKey = `${this.MFA_CODE_PREFIX}${userId}`;
    await this.redis.set(codeKey, code, this.MFA_CODE_EXPIRY);
    
    logger.info({ userId }, 'MFA code generated');
    
    return code;
  }
  
  /**
   * 验证MFA验证码
   * @param userId 用户ID
   * @param code 验证码
   * @returns 是否验证成功
   */
  static async verifyMFACode(userId: string, code: string): Promise<boolean> {
    const codeKey = `${this.MFA_CODE_PREFIX}${userId}`;
    const storedCode = await this.redis.get<string>(codeKey);
    
    if (!storedCode) {
      logger.warn({ userId }, 'MFA code missing or expired');
      return false;
    }
    
    if (storedCode !== code) {
      logger.warn({ userId }, 'MFA code mismatch');
      return false;
    }
    
    // 验证成功后删除验证码
    await this.redis.del(codeKey);
    
    logger.info({ userId }, 'MFA verified');
    
    return true;
  }
  
  /**
   * 清除MFA验证码
   * @param userId 用户ID
   */
  static async clearMFACode(userId: string): Promise<void> {
    const codeKey = `${this.MFA_CODE_PREFIX}${userId}`;
    await this.redis.del(codeKey);
  }
}
