// dev/src/app/api/arbitrators/availability/route.ts
// 仲裁员可用性：创建/查询个人可用时间段（避免排班冲突）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validateRequestBody } from '@/lib/validation';
import { getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { ArbitratorAvailabilityStatus } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const createSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    timezone: z.string().max(50).optional(),
    status: z.nativeEnum(ArbitratorAvailabilityStatus).optional(),
    note: z.string().max(200).optional().nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const start = new Date(value.startAt);
    const end = new Date(value.endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    if (end.getTime() <= start.getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'endAt 必须晚于 startAt' });
    }
  });

export async function GET(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const slots = await prisma.arbitratorAvailabilitySlot.findMany({
      where: { arbitratorUserId: authUser.id },
      orderBy: [{ startAt: 'asc' }, { endAt: 'asc' }],
      select: {
        id: true,
        arbitratorUserId: true,
        status: true,
        startAt: true,
        endAt: true,
        timezone: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return createSuccessResponse({ traceId, slots }, '获取可用性成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '获取可用性失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const validation = await validateRequestBody(request, createSchema);
    if (!validation.success) return validation.error;

    const startAt = new Date(validation.data.startAt);
    const endAt = new Date(validation.data.endAt);
    const status = validation.data.status ?? ArbitratorAvailabilityStatus.AVAILABLE;
    const timezone = validation.data.timezone ?? 'Asia/Shanghai';
    const note = validation.data.note ?? null;

    const conflict = await prisma.arbitratorAvailabilitySlot.findFirst({
      where: {
        arbitratorUserId: authUser.id,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    if (conflict) return ErrorResponses.RESOURCE_CONFLICT('时间段与现有可用性冲突');

    const created = await prisma.arbitratorAvailabilitySlot.create({
      data: {
        arbitratorUserId: authUser.id,
        status,
        startAt,
        endAt,
        timezone,
        note,
        metadata: { traceId },
      },
      select: {
        id: true,
        arbitratorUserId: true,
        status: true,
        startAt: true,
        endAt: true,
        timezone: true,
        note: true,
        createdAt: true,
      },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.ARBITRATOR_AVAILABILITY_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'arbitrator_availability',
      action: 'create',
      details: { traceId, slotId: created.id, startAt: created.startAt, endAt: created.endAt, status },
      result: 'SUCCESS',
    });

    return createSuccessResponse(created, '已创建可用性时间段');
  } catch (error) {
    logger.error({ err: error, traceId }, '创建可用性失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
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

