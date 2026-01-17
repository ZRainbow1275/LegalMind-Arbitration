// dev/src/app/api/health/route.ts
// 系统健康检查API端点 - 包含数据库、Redis、性能监控

import { NextRequest } from 'next/server';
import { healthCheck } from '@/lib/prisma';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getRedisManager } from '@/lib/redis';
import { PerformanceMonitor } from '@/lib/performance-monitor';
import { getExternalSystemManager } from '@/lib/external-systems';
import { getAIServiceManager } from '@/lib/ai-services';
import { logger } from '@/lib/logger';

/**
 * 系统健康检查
 * GET /api/health
 * 公开接口，无需认证
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // 数据库健康检查
    const dbHealth = await healthCheck();

    // Redis健康检查
    const redis = getRedisManager();
    const redisHealth = await redis.isReady();
    const redisStats = redisHealth ? await redis.getStats() : null;

    // 系统信息
    const systemInfo = {
      service: 'LegalMind Arbitration Platform',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      cpu: {
        usage: process.cpuUsage(),
      },
    };

    // 外部系统状态检查（真实：基于配置 + 连通性探测；未配置则显式呈现）
    const nowIso = new Date().toISOString();

    const externalManager = getExternalSystemManager();
    const externalConfigStatus = externalManager.getSystemStatus();
    const externalReachability = await externalManager.testConnections();

    const aiManager = getAIServiceManager();
    const aiServiceStatus = aiManager.getServiceStatus();

    const externalSystems = {
      aiServices: {
        status: Object.keys(aiServiceStatus).length > 0 ? 'configured' : 'not_configured',
        services: aiServiceStatus,
        lastCheck: nowIso,
      },
      systems: Object.fromEntries(
        Object.entries(externalConfigStatus).map(([key, value]) => {
          const reachable = externalReachability[key as keyof typeof externalReachability] === true;
          const status = !value.enabled
            ? 'disabled'
            : !value.configured
              ? 'not_configured'
              : reachable
                ? 'healthy'
                : 'unreachable';

          return [
            key,
            {
              status,
              enabled: value.enabled,
              configured: value.configured,
              name: value.name,
              endpoint: value.endpoint || null,
              reachable,
              lastCheck: nowIso,
            },
          ];
        })
      ),
    };

    const externalSystemsOk = Object.entries(externalConfigStatus).every(([key, sys]) => {
      if (!sys.enabled) return true;
      if (!sys.configured) return false;
      return externalReachability[key as keyof typeof externalReachability] === true;
    });

    // 性能监控概览
    const performanceOverview = await PerformanceMonitor.getOverview();

    // 计算总响应时间
    const totalResponseTime = Date.now() - startTime;

    // 确定整体健康状态
    const overallStatus =
      dbHealth.status === 'healthy' && redisHealth
        ? 'healthy'
        : 'unhealthy';

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${totalResponseTime}ms`,
      system: systemInfo,
      database: dbHealth,
      redis: redisHealth ? {
        status: 'healthy',
        connected: true,
        keys: redisStats?.keys || 0,
        memory: redisStats?.memory || '0B',
        hitRate: redisStats?.hitRate || '0.00%',
      } : {
        status: 'unhealthy',
        connected: false,
      },
      externalSystems,
      performance: {
        overview: Object.keys(performanceOverview).length > 0
          ? performanceOverview
          : { message: '暂无性能数据' },
      },
      checks: {
        database: dbHealth.status === 'healthy',
        redis: redisHealth,
        memory: systemInfo.memory.used < 1000, // 小于1GB认为正常
        uptime: systemInfo.uptime > 0,
        externalSystems: externalSystemsOk,
      },
    };

    // 根据健康状态返回不同的HTTP状态码
    if (overallStatus === 'healthy') {
      return createSuccessResponse(healthData, '系统运行正常');
    } else {
      return createSuccessResponse(healthData, '系统存在问题');
    }

  } catch (error) {
    logger.error({ err: error }, '健康检查失败');
    
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      system: {
        service: 'LegalMind Arbitration Platform',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    return createSuccessResponse(errorData, '系统健康检查失败');
  }
}

/**
 * 不支持的请求方法
 */
export async function POST() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
