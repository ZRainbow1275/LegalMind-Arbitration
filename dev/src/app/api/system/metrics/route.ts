// dev/src/app/api/system/metrics/route.ts
// 系统监控指标API端点 - 提供详细的系统性能和使用统计

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getRedisManager } from '@/lib/redis';
import { getMiddlewareManager } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { Role } from '@/generated/prisma';
import { PerformanceMonitor } from '@/lib/performance-monitor';
import { getQueueJobCounts } from '@/lib/queue';
import { getEnv } from '@/lib/env-validator';
import { logger } from '@/lib/logger';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

/**
 * 获取系统监控指标
 * GET /api/system/metrics
 * 需要管理员权限
 */
export async function GET(request: NextRequest) {
  try {
    // 获取认证用户
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return ErrorResponses.UNAUTHORIZED();
    }

    // 运维后台专用：仅允许 OPS_ADMIN（与业务管理员隔离）
    if (!authUser.roles.includes(Role.OPS_ADMIN)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('需要运维管理员权限');
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '1h'; // 1h, 24h, 7d, 30d
    const includeDetails = searchParams.get('includeDetails') === 'true';

    // 收集系统指标
    const metrics = await collectSystemMetrics(timeRange, includeDetails);

    return createSuccessResponse(metrics, '获取系统监控指标成功');

  } catch (error) {
    logger.error({ err: error }, '获取系统监控指标失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 收集系统指标
 */
async function collectSystemMetrics(timeRange: string, includeDetails: boolean) {
  const redis = getRedisManager();
  const middleware = getMiddlewareManager();

  // 1. 系统基础指标
  const systemMetrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
      external: Math.round(process.memoryUsage().external / 1024 / 1024), // MB
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024), // MB
    },
    cpu: {
      usage: await getCPUUsage(),
    },
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV,
  };

  // 2. 数据库指标
  const databaseMetrics = await getDatabaseMetrics();

  // 3. Redis指标
  const redisMetrics = await redis.getStats();

  // 4. API指标
  const apiMetrics = await middleware.getStats();

  // 5. 业务指标
  const businessMetrics = await getBusinessMetrics(timeRange);

  // 6. 性能指标
  const performanceMetrics = await getPerformanceMetrics(timeRange);

  // 7. 队列指标（BullMQ）
  const queueMetrics = await getQueueJobCounts().catch((error) => ({
    error: error instanceof Error ? error.message : 'queue metrics unavailable',
  }));

  // 8. 对象存储（MinIO / S3）
  const storageMetrics = await getStorageMetrics().catch((error) => ({
    status: 'error',
    error: error instanceof Error ? error.message : 'storage metrics unavailable',
  }));

  const details = includeDetails
    ? {
        recentErrors: await getRecentErrors(),
        slowQueries: await getSlowQueries(),
        topEndpoints: await getTopEndpoints(),
        userActivity: await getUserActivity(timeRange),
      }
    : undefined;

  return {
    system: systemMetrics,
    database: databaseMetrics,
    redis: redisMetrics,
    api: apiMetrics,
    business: businessMetrics,
    performance: performanceMetrics,
    queue: queueMetrics,
    storage: storageMetrics,
    ...(details ? { details } : {}),
  };
}

/**
 * 获取CPU使用率
 */
async function getCPUUsage(): Promise<number> {
  return new Promise((resolve) => {
    const startUsage = process.cpuUsage();
    const startTime = Date.now();

    setTimeout(() => {
      const currentUsage = process.cpuUsage(startUsage);
      const currentTime = Date.now();
      const timeDiff = currentTime - startTime;

      const cpuPercent = (currentUsage.user + currentUsage.system) / (timeDiff * 1000);
      resolve(Math.round(cpuPercent * 100));
    }, 100);
  });
}

async function getStorageMetrics() {
  const env = getEnv();
  if (
    !env.S3_ENDPOINT
    || !env.S3_BUCKET
    || !env.S3_ACCESS_KEY_ID
    || !env.S3_SECRET_ACCESS_KEY
  ) {
    return {
      status: 'not_configured',
    };
  }

  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));

    return {
      status: 'healthy',
      bucket: env.S3_BUCKET,
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      presignExpiresSeconds: env.S3_PRESIGNED_URL_EXPIRES_SECONDS,
      serverSideEncryption: env.S3_SERVER_SIDE_ENCRYPTION ?? null,
    };
  } catch (error) {
    return {
      status: 'unreachable',
      bucket: env.S3_BUCKET,
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      presignExpiresSeconds: env.S3_PRESIGNED_URL_EXPIRES_SECONDS,
      serverSideEncryption: env.S3_SERVER_SIDE_ENCRYPTION ?? null,
      error: error instanceof Error ? error.message : 'storage unreachable',
    };
  }
}

/**
 * 获取数据库指标
 */
async function getDatabaseMetrics() {
  try {
    // 获取数据库连接状态
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    // 获取表统计信息
    const tableStats = await Promise.all([
      prisma.user.count(),
      prisma.arbitrationCase.count(),
      prisma.hearing.count(),
      prisma.mediation.count(),
      prisma.notification.count(),
      prisma.documentTemplate.count(),
      prisma.generatedDocument.count(),
      prisma.batchOperation.count(),
    ]);

    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      tables: {
        users: tableStats[0],
        cases: tableStats[1],
        hearings: tableStats[2],
        mediations: tableStats[3],
        notifications: tableStats[4],
        templates: tableStats[5],
        documents: tableStats[6],
        batchOperations: tableStats[7],
      },
      totalRecords: tableStats.reduce((sum, count) => sum + count, 0),
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : '数据库连接失败',
    };
  }
}

/**
 * 获取业务指标
 */
async function getBusinessMetrics(timeRange: string) {
  try {
    const timeFilter = getTimeFilter(timeRange);

    // 并行查询各种业务指标
    const [
      newUsers,
      newCases,
      completedCases,
      activeHearings,
      successfulMediations,
      generatedDocuments,
      batchOperations,
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: timeFilter } } }),
      prisma.arbitrationCase.count({ where: { createdAt: { gte: timeFilter } } }),
      prisma.arbitrationCase.count({ 
        where: { 
          status: 'CLOSED',
          updatedAt: { gte: timeFilter }
        }
      }),
      prisma.hearing.count({ 
        where: { 
          status: 'IN_PROGRESS',
          createdAt: { gte: timeFilter }
        }
      }),
      prisma.mediation.count({ 
        where: { 
          status: 'COMPLETED',
          updatedAt: { gte: timeFilter }
        }
      }),
      prisma.generatedDocument.count({ where: { createdAt: { gte: timeFilter } } }),
      prisma.batchOperation.count({ where: { createdAt: { gte: timeFilter } } }),
    ]);

    // 计算案件处理效率
    const totalCases = await prisma.arbitrationCase.count();
    const processingEfficiency = totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0;

    return {
      users: {
        new: newUsers,
        total: await prisma.user.count(),
        active: await getActiveUsersCount(timeRange),
      },
      cases: {
        new: newCases,
        completed: completedCases,
        total: totalCases,
        processingEfficiency: `${processingEfficiency}%`,
      },
      hearings: {
        active: activeHearings,
        total: await prisma.hearing.count(),
      },
      mediations: {
        successful: successfulMediations,
        total: await prisma.mediation.count(),
      },
      documents: {
        generated: generatedDocuments,
        total: await prisma.generatedDocument.count(),
      },
      batchOperations: {
        new: batchOperations,
        total: await prisma.batchOperation.count(),
      },
    };
  } catch (error) {
    logger.error({ err: error }, '获取业务指标失败');
    return {
      error: '获取业务指标失败',
    };
  }
}

/**
 * 获取性能指标
 */
async function getPerformanceMetrics(timeRange: string) {
  const redis = getRedisManager();

  try {
    // 获取API响应时间统计
    const apiPaths = ['/api/cases', '/api/hearings', '/api/documents', '/api/auth/login'];
    type ResponseTimeStat = {
      avg: number;
      min: number;
      max: number;
      p95: number;
      count: number;
    };

    const responseTimeStats: Record<string, ResponseTimeStat> = {};

    const pipeline = redis.getClient().pipeline();
    for (const path of apiPaths) {
      pipeline.lrange(`metrics:response_times:${path}`, 0, -1);
    }

    const execResult = await pipeline.exec();
    if (execResult) {
      execResult.forEach((entry, index) => {
        const path = apiPaths[index];
        const [err, value] = entry;
        if (err || !Array.isArray(value)) return;

        const times = value
          .map((t) => Number.parseInt(String(t), 10))
          .filter((t) => Number.isFinite(t))
          .sort((a, b) => a - b);

        if (times.length === 0) return;

        const p95Index = Math.min(times.length - 1, Math.floor(times.length * 0.95));
        responseTimeStats[path] = {
          avg: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
          min: times[0],
          max: times[times.length - 1],
          p95: times[p95Index],
          count: times.length,
        };
      });
    }

    return {
      responseTime: responseTimeStats,
      throughput: {
        requestsPerMinute: await getRequestsPerMinute(),
        peakHour: await getPeakHour(),
      },
      errorRate: await getErrorRate(timeRange),
      cacheHitRate: await getCacheHitRate(),
    };
  } catch (error) {
    logger.error({ err: error }, '获取性能指标失败');
    return {
      error: '获取性能指标失败',
    };
  }
}

/**
 * 获取最近错误
 */
async function getRecentErrors() {
  const redis = getRedisManager();
  
  try {
    const errors = await redis.getClient().lrange('logs:errors', 0, 9); // 最近10个错误
    return errors.flatMap((entry) => {
      try {
        return [JSON.parse(entry)];
      } catch {
        return [];
      }
    });
  } catch (error) {
    logger.error({ err: error }, '获取最近错误失败');
    return [];
  }
}

/**
 * 获取慢查询
 */
async function getSlowQueries() {
  try {
    const overview = await PerformanceMonitor.getOverview();
    const names = Object.keys(overview).slice(0, 50);

    const results: Array<{
      name: string;
      duration: number;
      timestamp: number;
      metadata?: Record<string, unknown>;
    }> = [];

    for (const name of names) {
      const items = await PerformanceMonitor.getSlowQueries(name, 5);
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const duration = (item as { duration?: unknown }).duration;
        const timestamp = (item as { timestamp?: unknown }).timestamp;
        if (typeof duration !== 'number' || typeof timestamp !== 'number') continue;
        results.push({
          name,
          duration,
          timestamp,
          metadata: (item as { metadata?: Record<string, unknown> }).metadata,
        });
      }
    }

    results.sort((a, b) => b.duration - a.duration);
    return results.slice(0, 10);
  } catch (error) {
    logger.error({ err: error }, '获取慢查询失败');
    return [];
  }
}

/**
 * 获取热门端点
 */
async function getTopEndpoints() {
  const redis = getRedisManager();

  const endpoints = [
    '/api/cases',
    '/api/hearings',
    '/api/documents',
    '/api/auth/login',
    '/api/health',
  ];

  try {
    const keys = endpoints.map((endpoint) => `metrics:requests:path:${endpoint}`);
    const counts = await redis.mget<number>(keys);

    const stats = endpoints.map((endpoint, index) => {
      const countRaw = counts[index];
      const countParsed =
        typeof countRaw === 'number'
          ? countRaw
          : Number.parseInt(String(countRaw ?? '0'), 10);
      const requests = Number.isFinite(countParsed) ? countParsed : 0;
      return { endpoint, requests };
    });

    return stats.sort((a, b) => b.requests - a.requests);
  } catch (error) {
    logger.error({ err: error }, '获取热门端点失败');
    return [];
  }
}

/**
 * 获取用户活动
 */
async function getUserActivity(timeRange: string) {
  try {
    const timeFilter = getTimeFilter(timeRange);
    
    const activeUsers = await prisma.user.count({
      where: {
        updatedAt: { gte: timeFilter },
      },
    });

    return {
      activeUsers,
      newRegistrations: await prisma.user.count({
        where: { createdAt: { gte: timeFilter } },
      }),
      loginAttempts: 0, // 可以从日志中统计
    };
  } catch (error) {
    return { error: '获取用户活动失败' };
  }
}

// 辅助函数

function getTimeFilter(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 60 * 60 * 1000);
  }
}

async function getActiveUsersCount(timeRange: string): Promise<number> {
  const timeFilter = getTimeFilter(timeRange);
  return await prisma.user.count({
    where: {
      updatedAt: { gte: timeFilter },
    },
  });
}

async function getRequestsPerMinute(): Promise<number> {
  const redis = getRedisManager();
  const total = (await redis.get<number>('metrics:requests:total')) ?? 0;
  const uptimeMinutes = process.uptime() / 60; // 转换为分钟
  if (!Number.isFinite(uptimeMinutes) || uptimeMinutes <= 0) return 0;
  return Math.round(total / uptimeMinutes);
}

async function getPeakHour(): Promise<string> {
  // 简化实现，返回当前小时
  return new Date().getHours() + ':00';
}

async function getErrorRate(timeRange: string): Promise<number> {
  const redis = getRedisManager();
  const totalRequests = (await redis.get<number>('metrics:requests:total')) ?? 0;
  const error500 = (await redis.get<number>('metrics:responses:500')) ?? 0;
  const error400 = (await redis.get<number>('metrics:responses:400')) ?? 0;
  const errorRequests = error500 + error400;

  return totalRequests > 0 ? Math.round((errorRequests / totalRequests) * 100) : 0;
}

async function getCacheHitRate(): Promise<number> {
  try {
    const redis = getRedisManager();
    const stats = await redis.getStats();
    const total = stats.hits + stats.misses;
    if (total <= 0) return 0;
    return Math.round((stats.hits / total) * 100);
  } catch {
    return 0;
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
