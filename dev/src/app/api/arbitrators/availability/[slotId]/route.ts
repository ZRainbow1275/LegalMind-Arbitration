// dev/src/app/api/arbitrators/availability/[slotId]/route.ts
// 仲裁员可用性详情：更新/删除单个时间段
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { ArbitratorAvailabilityStatus } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ slotId: uuidSchema });

const patchSchema = z
  .object({
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    timezone: z.string().max(50).optional(),
    status: z.nativeEnum(ArbitratorAvailabilityStatus).optional(),
    note: z.string().max(200).optional().nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.startAt && value.endAt) {
      const start = new Date(value.startAt);
      const end = new Date(value.endAt);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end.getTime() <= start.getTime()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'endAt 必须晚于 startAt' });
      }
    }
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const slotId = pathValidation.data.slotId;

    const bodyValidation = await validateRequestBody(request, patchSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const existing = await prisma.arbitratorAvailabilitySlot.findUnique({
      where: { id: slotId },
      select: { id: true, arbitratorUserId: true, startAt: true, endAt: true },
    });
    if (!existing) return ErrorResponses.NOT_FOUND('时间段');
    if (existing.arbitratorUserId !== authUser.id) return ErrorResponses.FORBIDDEN();

    const startAt = bodyValidation.data.startAt ? new Date(bodyValidation.data.startAt) : existing.startAt;
    const endAt = bodyValidation.data.endAt ? new Date(bodyValidation.data.endAt) : existing.endAt;
    if (endAt.getTime() <= startAt.getTime()) return ErrorResponses.BAD_REQUEST_MESSAGE('endAt 必须晚于 startAt');

    const conflict = await prisma.arbitratorAvailabilitySlot.findFirst({
      where: {
        arbitratorUserId: authUser.id,
        id: { not: slotId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    if (conflict) return ErrorResponses.RESOURCE_CONFLICT('时间段与现有可用性冲突');

    const updated = await prisma.arbitratorAvailabilitySlot.update({
      where: { id: slotId },
      data: {
        startAt,
        endAt,
        ...(bodyValidation.data.timezone ? { timezone: bodyValidation.data.timezone } : {}),
        ...(bodyValidation.data.status ? { status: bodyValidation.data.status } : {}),
        ...(bodyValidation.data.note !== undefined ? { note: bodyValidation.data.note } : {}),
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
        updatedAt: true,
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
      action: 'update',
      details: { traceId, slotId: updated.id, startAt: updated.startAt, endAt: updated.endAt, status: updated.status },
      result: 'SUCCESS',
    });

    return createSuccessResponse(updated, '已更新可用性时间段');
  } catch (error) {
    logger.error({ err: error, traceId }, '更新可用性失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const slotId = pathValidation.data.slotId;

    const existing = await prisma.arbitratorAvailabilitySlot.findUnique({
      where: { id: slotId },
      select: { id: true, arbitratorUserId: true },
    });
    if (!existing) return ErrorResponses.NOT_FOUND('时间段');
    if (existing.arbitratorUserId !== authUser.id) return ErrorResponses.FORBIDDEN();

    await prisma.arbitratorAvailabilitySlot.delete({ where: { id: slotId } });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.ARBITRATOR_AVAILABILITY_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'arbitrator_availability',
      action: 'delete',
      details: { traceId, slotId },
      result: 'SUCCESS',
    });

    return createSuccessResponse({ ok: true, traceId }, '已删除时间段');
  } catch (error) {
    logger.error({ err: error, traceId }, '删除可用性失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function GET() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function POST() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

