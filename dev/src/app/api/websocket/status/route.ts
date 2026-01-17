// dev/src/app/api/websocket/status/route.ts
// WebSocket状态查询API端点

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getWebSocketManager } from '@/lib/websocket';
import { logger } from '@/lib/logger';
import { Role } from '@/generated/prisma';

/**
 * 获取WebSocket连接状态
 * GET /api/websocket/status
 * 需要认证
 */
export async function GET(request: NextRequest) {
  try {
    // 获取认证用户
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return ErrorResponses.UNAUTHORIZED();
    }

    const wsManager = getWebSocketManager();
    if (!wsManager) {
      return createSuccessResponse({
        status: 'not_initialized',
        message: 'WebSocket服务未初始化',
      }, 'WebSocket服务状态');
    }

    // 获取在线统计信息
    const stats = wsManager.getOnlineStats();

    // 基础状态信息
    const statusData = {
      status: 'online',
      timestamp: new Date().toISOString(),
      server: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
      connections: {
        total: stats.totalConnections,
        uniqueUsers: stats.uniqueUsers,
        activeHearings: stats.activeHearings,
        activeCases: stats.activeCases,
      },
    };

    // 仅运维管理员可查看基础设施级的详细信息（运维隔离）
    if (authUser.roles.includes(Role.OPS_ADMIN)) {
      return createSuccessResponse({
        ...statusData,
        detailed: {
          nodeVersion: process.version,
          platform: process.platform,
          environment: process.env.NODE_ENV,
          // 可以添加更多管理员级别的信息
        },
      }, 'WebSocket服务状态（运维视图）');
    }

    return createSuccessResponse(statusData, 'WebSocket服务状态');

  } catch (error) {
    logger.error({ err: error }, '获取WebSocket状态失败');
    return ErrorResponses.INTERNAL_ERROR();
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
