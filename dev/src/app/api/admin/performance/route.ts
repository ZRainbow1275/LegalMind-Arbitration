// dev/src/app/api/admin/performance/route.ts
// 性能监控API端点 - 仅运维管理员可访问

import { NextRequest } from 'next/server';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { requireAuthenticatedUser } from '@/lib/auth';
import { Role } from '@/generated/prisma';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { getTraceId } from '@/lib/case-events';
import { logger } from '@/lib/logger';
import { 
  PerformanceMonitor, 
  APIPerformanceTracker, 
  DatabasePerformanceTracker 
} from '@/lib/performance-monitor';

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
 * 获取性能监控概览
 * GET /api/admin/performance
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireOpsAdmin(request, false);
    if (!guard.ok) return guard.response;
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // api | db | all
    const name = searchParams.get('name'); // 特定指标名称
    
    let data: unknown = {};
    
    if (name) {
      // 获取特定指标的详细信息
      const stats = await PerformanceMonitor.getStats(name);
      const slowQueries = await PerformanceMonitor.getSlowQueries(name, 10);
      
      data = {
        name,
        stats,
        slowQueries,
      };
    } else if (type === 'api') {
      // 获取API性能报告
      data = await APIPerformanceTracker.getReport();
    } else if (type === 'db') {
      // 获取数据库性能报告
      data = await DatabasePerformanceTracker.getReport();
    } else {
      // 获取全部性能概览
      const overview = await PerformanceMonitor.getOverview();
      const apiReport = await APIPerformanceTracker.getReport();
      const dbReport = await DatabasePerformanceTracker.getReport();
      
      data = {
        overview,
        api: apiReport,
        database: dbReport,
      };
    }
    
    return createSuccessResponse({
      data,
      timestamp: new Date().toISOString(),
    }, '性能监控数据获取成功');
    
  } catch (error) {
    logger.error({ err: error }, '获取性能监控数据失败');
    return ErrorResponses.INTERNAL_SERVER_ERROR('获取性能监控数据失败');        
  }
}

/**
 * 清除性能监控数据
 * DELETE /api/admin/performance
 * 
 * Query参数:
 * - name: 指标名称（可选，不提供则清除全部）
 */
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireOpsAdmin(request, true);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    await PerformanceMonitor.clearMetrics(name || undefined);

    await AuditLogger.log({
      level: AuditLevel.WARNING,
      eventType: AuditEventType.SYSTEM_CONFIG_CHANGED,
      userId: guard.authUser.id,
      userName: guard.authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'admin/performance',
      action: 'clear',
      details: { traceId: getTraceId(request.headers), name: name || null },
      result: 'SUCCESS',
    });

    return createSuccessResponse({
      name,
      timestamp: new Date().toISOString(),
    }, `性能监控数据已清除${name ? `: ${name}` : '（全部）'}`);
    
  } catch (error) {
    logger.error({ err: error }, '清除性能监控数据失败');
    return ErrorResponses.INTERNAL_SERVER_ERROR('清除性能监控数据失败');        
  }
}

export async function POST() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
