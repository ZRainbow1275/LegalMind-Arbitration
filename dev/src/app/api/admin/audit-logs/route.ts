// dev/src/app/api/admin/audit-logs/route.ts
// 运维后台：审计日志查询（仅 OPS_ADMIN）

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import {
  calculatePagination,
  createPaginatedResponse,
  ErrorResponses,
  parsePaginationParams,
} from '@/lib/api-response';
import { validateSearchParams } from '@/lib/validation';
import { uuidSchema } from '@/lib/validation';
import { Role } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  userId: uuidSchema.optional(),
  eventType: z.string().max(100).optional(),
  level: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
  result: z.enum(['SUCCESS', 'FAILURE']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

async function requireOpsAdmin(request: NextRequest) {
  const guard = await requireAuthenticatedUser(request, {
    csrf: false,
    anyRole: [Role.OPS_ADMIN],
    forbiddenMessage: '需要运维管理员权限',
  });
  if (!guard.ok) return guard;
  return { ok: true as const, authUser: guard.user };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOpsAdmin(request);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const validation = validateSearchParams(searchParams, querySchema);
    if (!validation.success) return validation.error;

    const { page, limit } = parsePaginationParams(searchParams);

    const where = {
      ...(validation.data.userId ? { userId: validation.data.userId } : {}),
      ...(validation.data.eventType ? { eventType: validation.data.eventType } : {}),
      ...(validation.data.level ? { level: validation.data.level } : {}),
      ...(validation.data.result ? { result: validation.data.result } : {}),
      ...(validation.data.from || validation.data.to
        ? {
            timestamp: {
              ...(validation.data.from ? { gte: new Date(validation.data.from) } : {}),
              ...(validation.data.to ? { lte: new Date(validation.data.to) } : {}),
            },
          }
        : {}),
    } satisfies Record<string, unknown>;

    const total = await prisma.auditLog.count({ where });
    const pagination = calculatePagination(total, page, limit);

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        timestamp: true,
        level: true,
        eventType: true,
        result: true,
        userId: true,
        userName: true,
        ipAddress: true,
        userAgent: true,
        resource: true,
        action: true,
        details: true,
        errorMessage: true,
      },
    });

    const data = logs.map((l) => ({
      ...l,
      timestamp: l.timestamp.toISOString(),
    }));

    return createPaginatedResponse(data, pagination, '审计日志获取成功');
  } catch (error) {
    logger.error({ err: error }, '获取审计日志失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function POST() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
