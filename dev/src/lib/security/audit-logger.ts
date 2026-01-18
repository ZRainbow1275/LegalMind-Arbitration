// dev/src/lib/security/audit-logger.ts
// 审计日志系统 - 等保三级标准

import { HashUtil } from './encryption';
import { getEnv } from '../env-validator';
import { getRedisManager } from '../redis';
import { prisma } from '../prisma';
import type { Prisma } from '../../generated/prisma';
import { logger } from '../logger';

function toPrismaInputJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v))
    ) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

/**
 * 审计日志级别
 */
export enum AuditLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * 审计事件类型
 */
export enum AuditEventType {
  // 用户认证事件
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',
  USER_MFA_SETUP_GENERATED = 'USER_MFA_SETUP_GENERATED',
  USER_MFA_ENABLED = 'USER_MFA_ENABLED',
  USER_MFA_DISABLED = 'USER_MFA_DISABLED',
  
  // 用户管理事件
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_LOCKED = 'USER_LOCKED',
  USER_UNLOCKED = 'USER_UNLOCKED',
  
  // 案件管理事件
  CASE_CREATED = 'CASE_CREATED',
  CASE_UPDATED = 'CASE_UPDATED',
  CASE_DELETED = 'CASE_DELETED',
  CASE_ASSIGNED = 'CASE_ASSIGNED',
  CASE_STATUS_CHANGED = 'CASE_STATUS_CHANGED',
  CASE_REVIEW_SUBMITTED = 'CASE_REVIEW_SUBMITTED',
  CASE_REVIEW_DECIDED = 'CASE_REVIEW_DECIDED',
  RECUSAL_REQUEST_CREATED = 'RECUSAL_REQUEST_CREATED',
  RECUSAL_REQUEST_DECIDED = 'RECUSAL_REQUEST_DECIDED',
  RECUSAL_REQUEST_WITHDRAWN = 'RECUSAL_REQUEST_WITHDRAWN',
  CASE_TASK_CREATED = 'CASE_TASK_CREATED',
  CASE_TASK_ASSIGNED = 'CASE_TASK_ASSIGNED',
  CASE_TASK_UNASSIGNED = 'CASE_TASK_UNASSIGNED',
  CASE_TASK_UPDATED = 'CASE_TASK_UPDATED',
  CASE_TASK_COMMENTED = 'CASE_TASK_COMMENTED',
  ARBITRATOR_PROFILE_SUBMITTED = 'ARBITRATOR_PROFILE_SUBMITTED',
  ARBITRATOR_PROFILE_DECIDED = 'ARBITRATOR_PROFILE_DECIDED',
  ARBITRATOR_REVIEW_CREATED = 'ARBITRATOR_REVIEW_CREATED',
  ARBITRATOR_REVIEW_MODERATED = 'ARBITRATOR_REVIEW_MODERATED',
  ARBITRATOR_AVAILABILITY_UPDATED = 'ARBITRATOR_AVAILABILITY_UPDATED',

  // 文档管理事件
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_GENERATED = 'DOCUMENT_GENERATED',
  DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  DOCUMENT_VIEWED = 'DOCUMENT_VIEWED',
  DOCUMENT_SIGNATURE_REQUEST_CREATED = 'DOCUMENT_SIGNATURE_REQUEST_CREATED',   
  DOCUMENT_SIGNED = 'DOCUMENT_SIGNED',
  DOCUMENT_SIGNATURE_DECLINED = 'DOCUMENT_SIGNATURE_DECLINED',
  SEAL_CREATED = 'SEAL_CREATED',
  SEAL_APPLIED = 'SEAL_APPLIED',
  EVIDENCE_VERIFICATION_REQUESTED = 'EVIDENCE_VERIFICATION_REQUESTED',
  EVIDENCE_VERIFICATION_UPDATED = 'EVIDENCE_VERIFICATION_UPDATED',

  // AI 事件
  AI_ASSISTANT_INVOKED = 'AI_ASSISTANT_INVOKED',

  // 通知中心事件
  NOTIFICATION_CREATED = 'NOTIFICATION_CREATED',
  NOTIFICATION_UPDATED = 'NOTIFICATION_UPDATED',
  WEB_PUSH_SUBSCRIPTION_UPSERTED = 'WEB_PUSH_SUBSCRIPTION_UPSERTED',
  WEB_PUSH_SUBSCRIPTION_DISABLED = 'WEB_PUSH_SUBSCRIPTION_DISABLED',

  // 支付/对账事件
  PAYMENT_ORDER_CREATED = 'PAYMENT_ORDER_CREATED',
  PAYMENT_ORDER_STATUS_CHANGED = 'PAYMENT_ORDER_STATUS_CHANGED',
  PAYMENT_WEBHOOK_RECEIVED = 'PAYMENT_WEBHOOK_RECEIVED',

  // 电子送达 / 归档事件（合规硬链路）
  SERVICE_OF_PROCESS_CREATED = 'SERVICE_OF_PROCESS_CREATED',
  SERVICE_OF_PROCESS_PROOF_VIEWED = 'SERVICE_OF_PROCESS_PROOF_VIEWED',
  ARCHIVE_PACKAGE_CREATED = 'ARCHIVE_PACKAGE_CREATED',
  ARCHIVE_PACKAGE_DOWNLOADED = 'ARCHIVE_PACKAGE_DOWNLOADED',

  // 队列事件（BullMQ）
  QUEUE_JOB_COMPLETED = 'QUEUE_JOB_COMPLETED',
  QUEUE_JOB_FAILED = 'QUEUE_JOB_FAILED',

  // 外部系统集成事件
  EXTERNAL_SYSTEM_INVOCATION = 'EXTERNAL_SYSTEM_INVOCATION',
  EXTERNAL_SYSTEM_STATUS_VIEWED = 'EXTERNAL_SYSTEM_STATUS_VIEWED',

  // 庭审事件
  HEARING_CREATED = 'HEARING_CREATED',
  HEARING_STARTED = 'HEARING_STARTED',
  HEARING_ENDED = 'HEARING_ENDED',
  HEARING_CANCELLED = 'HEARING_CANCELLED',
  HEARING_RECORDING_REQUESTED = 'HEARING_RECORDING_REQUESTED',
  HEARING_RECORDING_STOPPED = 'HEARING_RECORDING_STOPPED',
  HEARING_TRANSCRIPT_REQUESTED = 'HEARING_TRANSCRIPT_REQUESTED',

  // 大文件上传
  MULTIPART_UPLOAD_INITIATED = 'MULTIPART_UPLOAD_INITIATED',
  MULTIPART_UPLOAD_COMPLETED = 'MULTIPART_UPLOAD_COMPLETED',
  MULTIPART_UPLOAD_ABORTED = 'MULTIPART_UPLOAD_ABORTED',
  
  // 系统配置事件
  SYSTEM_CONFIG_CHANGED = 'SYSTEM_CONFIG_CHANGED',
  CACHE_CLEARED = 'CACHE_CLEARED',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
  
  // 安全事件
  SECURITY_BREACH_ATTEMPT = 'SECURITY_BREACH_ATTEMPT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  IP_BLOCKED = 'IP_BLOCKED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_ATTACK_DETECTED = 'CSRF_ATTACK_DETECTED',
  XSS_ATTACK_DETECTED = 'XSS_ATTACK_DETECTED',
  SQL_INJECTION_DETECTED = 'SQL_INJECTION_DETECTED',
}

/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  level: AuditLevel;
  eventType: AuditEventType;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: unknown;
  result: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
  signature?: string; // 日志签名，防止篡改
}

/**
 * 审计日志管理器
 */
export class AuditLogger {
  private static redis = getRedisManager();
  private static readonly AUDIT_LOG_PREFIX = 'audit_log:';
  private static readonly BATCH_SIZE = 100;
  private static logBuffer: AuditLogEntry[] = [];
  
  /**
   * 记录审计日志
   * @param entry 日志条目
   */
  static async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'signature'>): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date(),
      };
      
      // 生成日志签名（防篡改）
      logEntry.signature = this.generateSignature(logEntry);
      
      // 添加到缓冲区
      this.logBuffer.push(logEntry);
      
      // 如果缓冲区达到批量大小，批量写入
      if (this.logBuffer.length >= this.BATCH_SIZE) {
        await this.flushLogs();
      }

      // 对于关键事件/错误级别，立即写入（避免进程异常导致日志丢失）
      if (
        this.isCriticalEvent(entry.eventType)
        || entry.level === AuditLevel.ERROR
        || entry.level === AuditLevel.CRITICAL
      ) {
        await this.flushLogs();
      }
      
      // 同时写入Redis（用于实时查询）
      await this.cacheLog(logEntry);
      
      // 输出到控制台
      this.logToConsole(logEntry);
    } catch (error) {
      logger.error({ err: error }, '审计日志记录失败');
    }
  }
  
  /**
   * 刷新日志缓冲区到数据库
   */
  private static async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // 批量写入数据库
      await prisma.auditLog.createMany({
        data: logs.map((log) => ({
          timestamp: log.timestamp,
          level: log.level,
          eventType: log.eventType,
          result: log.result,
          userId: log.userId ?? null,
          userName: log.userName ?? null,
          ipAddress: log.ipAddress ?? null,
          userAgent: log.userAgent ?? null,
          resource: log.resource ?? null,
          action: log.action ?? null,
          details: toPrismaInputJsonValue(log.details),
          errorMessage: log.errorMessage ?? null,
          signature: log.signature ?? null,
        })),
      });
    } catch (error) {
      logger.error({ err: error }, '审计日志批量写入失败');
      // 写入失败时，将日志重新加入缓冲区
      this.logBuffer.unshift(...logs);
    }
  }
  
  /**
   * 缓存日志到Redis（用于实时查询）
   * @param entry 日志条目
   */
  private static async cacheLog(entry: AuditLogEntry): Promise<void> {
    try {
      const key = `${this.AUDIT_LOG_PREFIX}${entry.eventType}`;
      
      // 使用列表存储最近的日志
      await this.redis.getClient().lpush(key, JSON.stringify(entry));
      
      // 只保留最近1000条
      await this.redis.getClient().ltrim(key, 0, 999);
      
      // 设置过期时间（7天）
      await this.redis.expire(key, 7 * 24 * 3600);
    } catch (error) {
      logger.error({ err: error }, '审计日志缓存失败');
    }
  }
  
  /**
   * 生成日志签名（防篡改）
   * @param entry 日志条目
   * @returns 签名
   */
  private static generateSignature(entry: AuditLogEntry): string {
    const env = getEnv();
    const data = JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      eventType: entry.eventType,
      userId: entry.userId,
      resource: entry.resource,
      action: entry.action,
      result: entry.result,
    });
    
    // 使用HMAC生成签名
    return HashUtil.hmac(data, env.AUDIT_LOG_SECRET);
  }
  
  /**
   * 验证日志签名
   * @param entry 日志条目
   * @returns 是否有效
   */
  static verifySignature(entry: AuditLogEntry): boolean {
    const expectedSignature = this.generateSignature(entry);
    return entry.signature === expectedSignature;
  }
  
  /**
   * 判断是否为关键事件
   * @param eventType 事件类型
   * @returns 是否为关键事件
   */
  private static isCriticalEvent(eventType: AuditEventType): boolean {
    const criticalEvents = [
      AuditEventType.USER_LOGIN,
      AuditEventType.USER_LOGOUT,
      AuditEventType.USER_LOGIN_FAILED,
      AuditEventType.USER_DELETED,
      AuditEventType.CASE_DELETED,
      AuditEventType.DOCUMENT_DELETED,
      AuditEventType.SYSTEM_CONFIG_CHANGED,
      AuditEventType.SECURITY_BREACH_ATTEMPT,
      AuditEventType.UNAUTHORIZED_ACCESS,
      AuditEventType.PERMISSION_DENIED,
      AuditEventType.CSRF_ATTACK_DETECTED,
      AuditEventType.XSS_ATTACK_DETECTED,
      AuditEventType.SQL_INJECTION_DETECTED,
    ];
    
    return criticalEvents.includes(eventType);
  }
  
  /**
   * 输出日志到控制台
   * @param entry 日志条目
   */
  private static logToConsole(entry: AuditLogEntry): void {
    const emoji = {
      [AuditLevel.INFO]: 'ℹ️',
      [AuditLevel.WARNING]: '⚠️',
      [AuditLevel.ERROR]: '❌',
      [AuditLevel.CRITICAL]: '🚨',
    };
    
    const message = `${emoji[entry.level]} [AUDIT] ${entry.eventType} - ${entry.result}`;
    const details = {
      user: entry.userName || entry.userId,
      ip: entry.ipAddress,
      resource: entry.resource,
      action: entry.action,
    };
    
    if (entry.level === AuditLevel.CRITICAL || entry.level === AuditLevel.ERROR) {
      logger.error(details, message);
    } else if (entry.level === AuditLevel.WARNING) {
      logger.warn(details, message);
    } else {
      logger.info(details, message);
    }
  }
  
  /**
   * 查询审计日志
   * @param filters 过滤条件
   * @param limit 限制数量
   * @returns 日志列表
   */
  static async queryLogs(
    filters: {
      eventType?: AuditEventType;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      level?: AuditLevel;
    },
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    try {
      // 先从Redis缓存查询
      if (filters.eventType) {
        const key = `${this.AUDIT_LOG_PREFIX}${filters.eventType}`;
        const cached = await this.redis.getClient().lrange(key, 0, limit - 1);
        
        if (cached.length > 0) {
          return cached.map(log => JSON.parse(log));
        }
      }
      
      const logs = await prisma.auditLog.findMany({
        where: {
          eventType: filters.eventType,
          userId: filters.userId,
          timestamp: (filters.startDate || filters.endDate)
            ? {
                gte: filters.startDate,
                lte: filters.endDate,
              }
            : undefined,
          level: filters.level,
        },
        take: limit,
        orderBy: { timestamp: 'desc' },
      });

      return logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level as AuditLevel,
        eventType: log.eventType as AuditEventType,
        userId: log.userId ?? undefined,
        userName: log.userName ?? undefined,
        ipAddress: log.ipAddress ?? undefined,
        userAgent: log.userAgent ?? undefined,
        resource: log.resource ?? undefined,
        action: log.action ?? undefined,
        details: log.details ?? undefined,
        result: log.result as 'SUCCESS' | 'FAILURE',
        errorMessage: log.errorMessage ?? undefined,
        signature: log.signature ?? undefined,
      }));
    } catch (error) {
      logger.error({ err: error }, '审计日志查询失败');
      return [];
    }
  }
  
  /**
   * 导出审计日志
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 日志数据
   */
  static async exportLogs(startDate: Date, endDate: Date): Promise<AuditLogEntry[]> {
    try {
      return await this.queryLogs({ startDate, endDate }, 10000);
    } catch (error) {
      logger.error({ err: error }, '审计日志导出失败');
      return [];
    }
  }
  
  /**
   * 清理过期日志
   * @param retentionDays 保留天数
   */
  static async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      logger.error({ err: error }, '审计日志清理失败');
      return 0;
    }
  }
}

/**
 * 审计日志装饰器
 * 用于自动记录方法调用
 */
export function auditLog(eventType: AuditEventType, level: AuditLevel = AuditLevel.INFO) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const startTime = Date.now();
      let result: 'SUCCESS' | 'FAILURE' = 'SUCCESS';
      let errorMessage: string | undefined;
      
      try {
        const returnValue = await originalMethod.apply(this, args);
        return returnValue;
      } catch (error) {
        result = 'FAILURE';
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw error;
      } finally {
        // 记录审计日志
        await AuditLogger.log({
          level,
          eventType,
          resource:
            typeof target === 'function'
              ? target.name
              : (target as { constructor?: { name?: string } }).constructor?.name ?? 'Unknown',
          action: propertyKey,
          details: {
            args: args.length,
            duration: Date.now() - startTime,
          },
          result,
          errorMessage,
        });
      }
    };
    
    return descriptor;
  };
}
