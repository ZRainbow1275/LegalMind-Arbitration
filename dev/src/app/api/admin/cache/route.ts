// dev/src/app/api/admin/cache/route.ts
// 缓存管理API端点 - 仅运维管理员可访问

import { NextRequest } from 'next/server';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getRedisManager } from '@/lib/redis';
import { CacheInvalidation } from '@/lib/cache-wrapper';
import { requireAuthenticatedUser } from '@/lib/auth';
import { Role } from '@/generated/prisma';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { getTraceId } from '@/lib/case-events';
import { logger } from '@/lib/logger';

async function requireOpsAdmin(request: NextRequest, csrf: boolean) {
  const guard = await requireAuthenticatedUser(request, {
    csrf,
    anyRole: [Role.OPS_ADMIN],
    forbiddenMessage: '需要运维管理员权限',
  });
  if (!guard.ok) return guard;
  return { ok: true as const, authUser: guard.user };
}

/**
 * 获取缓存统计信息
 * GET /api/admin/cache
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireOpsAdmin(request, false);
    if (!guard.ok) return guard.response;
    
    const redis = getRedisManager();
    const stats = await redis.getStats();
    
    return createSuccessResponse({
      stats,
      timestamp: new Date().toISOString(),
    }, '缓存统计信息获取成功');
    
  } catch (error) {
    logger.error({ err: error }, '获取缓存统计失败');
    return ErrorResponses.INTERNAL_SERVER_ERROR('获取缓存统计失败');
  }
}

/**
 * 清除缓存
 * DELETE /api/admin/cache
 * 
 * Query参数:
 * - type: 缓存类型 (user|case|hearing|all)
 * - id: 资源ID（可选）
 */
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireOpsAdmin(request, true);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    
    if (!type) {
      return ErrorResponses.BAD_REQUEST('缺少type参数');
    }
    
    let clearedCount = 0;
    
    switch (type) {
      case 'user':
        if (!id) {
          return ErrorResponses.BAD_REQUEST('清除用户缓存需要提供id参数');
        }
        await CacheInvalidation.invalidateUser(id);
        clearedCount = 1;
        break;
        
      case 'case':
        if (!id) {
          return ErrorResponses.BAD_REQUEST('清除案件缓存需要提供id参数');
        }
        await CacheInvalidation.invalidateCase(id);
        clearedCount = 1;
        break;
        
      case 'hearing':
        if (!id) {
          return ErrorResponses.BAD_REQUEST('清除庭审缓存需要提供id参数');
        }
        await CacheInvalidation.invalidateHearing(id);
        clearedCount = 1;
        break;
        
      case 'all':
        const redis = getRedisManager();
        await redis.flushAll();
        clearedCount = -1; // 表示全部清除
        break;
        
      default:
        return ErrorResponses.BAD_REQUEST('无效的type参数');
    }

    await AuditLogger.log({
      level: AuditLevel.WARNING,
      eventType: AuditEventType.CACHE_CLEARED,
      userId: guard.authUser.id,
      userName: guard.authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'admin/cache',
      action: 'clear',
      details: {
        traceId: getTraceId(request.headers),
        type,
        id: id || null,
        clearedCount,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse({
      type,
      id,
      clearedCount,
      timestamp: new Date().toISOString(),
    }, `缓存清除成功${clearedCount === -1 ? '（全部）' : ''}`);
    
  } catch (error) {
    logger.error({ err: error }, '清除缓存失败');
    return ErrorResponses.INTERNAL_SERVER_ERROR('清除缓存失败');
  }
}

/**
 * 预热缓存
 * POST /api/admin/cache/warm
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireOpsAdmin(request, true);
    if (!guard.ok) return guard.response;

    const { CacheWarming } = await import('@/lib/cache-wrapper');
    await CacheWarming.warmAll();

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.SYSTEM_CONFIG_CHANGED,
      userId: guard.authUser.id,
      userName: guard.authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'admin/cache',
      action: 'warm_all',
      details: { traceId: getTraceId(request.headers) },
      result: 'SUCCESS',
    });

    return createSuccessResponse({
      timestamp: new Date().toISOString(),
    }, '缓存预热完成');

  } catch (error) {
    logger.error({ err: error }, '缓存预热失败');
    return ErrorResponses.INTERNAL_SERVER_ERROR('缓存预热失败');
  }
}

export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
