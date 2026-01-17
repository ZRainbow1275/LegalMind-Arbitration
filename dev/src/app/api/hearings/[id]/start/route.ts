// dev/src/app/api/hearings/[id]/start/route.ts
// 开始庭审：对齐 docs/API_REFERENCE.md 的 POST /api/hearings/:id/start
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { getTraceId, appendCaseEvent } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { HearingStatus, type Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    if (!PermissionCheckers.canManageCase(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有庭审管理权限');
    }

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: hearingId } = pathValidation.data;

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.hearing.findUnique({
        where: { id: hearingId },
        select: { id: true, caseId: true, status: true, startedAt: true, endedAt: true },
      });
      if (!existing) return null;

      if (existing.status === HearingStatus.IN_PROGRESS) {
        return tx.hearing.findUnique({ where: { id: hearingId }, include: { participants: true, case: true } });
      }

      if (existing.status === HearingStatus.COMPLETED || existing.status === HearingStatus.CANCELLED) {
        throw new Error('HEARING_ALREADY_FINISHED');
      }

      const updateData: Prisma.HearingUpdateInput = {
        status: HearingStatus.IN_PROGRESS,
        ...(existing.startedAt ? {} : { startedAt: now }),
      };

      const hearing = await tx.hearing.update({
        where: { id: hearingId },
        data: updateData,
        include: { participants: true, case: true },
      });

      await tx.arbitrationCase.update({
        where: { id: hearing.caseId },
        data: { status: 'HEARING' },
      });

      await appendCaseEvent(
        {
          caseId: hearing.caseId,
          eventType: 'HEARING_STARTED',
          actorUserId: authUser.id,
          traceId,
          payload: { hearingId: hearing.id, startedAt: hearing.startedAt?.toISOString() ?? now.toISOString() },
        },
        tx
      );

      return hearing;
    });

    if (!updated) return ErrorResponses.NOT_FOUND('庭审');

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.HEARING_STARTED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'hearings',
      action: 'start',
      details: { traceId, hearingId },
      result: 'SUCCESS',
    });

    return createSuccessResponse(updated, '庭审已开始');
  } catch (error) {
    if (error instanceof Error && error.message === 'HEARING_ALREADY_FINISHED') {
      return ErrorResponses.RESOURCE_CONFLICT('庭审已结束，无法再次开始');
    }
    logger.error({ err: error, traceId }, '开始庭审失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function GET() {
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

