// dev/src/app/api/cases/[id]/recusals/[recusalId]/route.ts
// 回避申请裁定：撤回/受理/同意/驳回（仲裁庭/管理员）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { ParticipantType, RecusalRequestStatus } from '@/generated/prisma';
import { requireCaseAccess } from '@/lib/case-guard';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ id: uuidSchema, recusalId: uuidSchema });

const patchSchema = z
  .object({
    action: z.enum(['WITHDRAW', 'SET_UNDER_REVIEW', 'APPROVE', 'REJECT']),
    reason: z.string().max(5000).optional(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recusalId: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const caseId = pathValidation.data.id;
    const recusalId = pathValidation.data.recusalId;

    const access = await requireCaseAccess({ caseId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const bodyValidation = await validateRequestBody(request, patchSchema);
    if (!bodyValidation.success) return bodyValidation.error;
    const { action, reason } = bodyValidation.data;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const recusal = await tx.recusalRequest.findFirst({
        where: { id: recusalId, caseId },
        select: {
          id: true,
          caseId: true,
          requestedByUserId: true,
          targetUserId: true,
          status: true,
        },
      });
      if (!recusal) return { kind: 'not_found' as const };

      if (action === 'WITHDRAW') {
        if (recusal.requestedByUserId !== authUser.id) return { kind: 'forbidden' as const };
        const withdrawableStatuses: RecusalRequestStatus[] = [
          RecusalRequestStatus.SUBMITTED,
          RecusalRequestStatus.UNDER_REVIEW,
        ];
        if (!withdrawableStatuses.includes(recusal.status)) {
          return { kind: 'conflict' as const, status: recusal.status };
        }

        const updated = await tx.recusalRequest.update({
          where: { id: recusalId },
          data: { status: RecusalRequestStatus.WITHDRAWN, decisionReason: reason ?? null, decidedAt: now },
          select: { id: true, status: true, decidedAt: true },
        });

        await appendCaseEvent(
          {
            caseId,
            eventType: 'RECUSAL_REQUEST_WITHDRAWN',
            actorUserId: authUser.id,
            traceId,
            payload: { recusalId, reason: reason ?? null, at: now.toISOString() },
          },
          tx
        );

        return { kind: 'withdrawn' as const, updated };
      }

      if (!PermissionCheckers.canManageCase(authUser)) {
        return { kind: 'forbidden_manage' as const };
      }

      if (action === 'SET_UNDER_REVIEW') {
        const updated = await tx.recusalRequest.update({
          where: { id: recusalId },
          data: { status: RecusalRequestStatus.UNDER_REVIEW, decidedByUserId: authUser.id, decisionReason: reason ?? null },
          select: { id: true, status: true, updatedAt: true },
        });

        await appendCaseEvent(
          {
            caseId,
            eventType: 'RECUSAL_REQUEST_UNDER_REVIEW',
            actorUserId: authUser.id,
            traceId,
            payload: { recusalId, reason: reason ?? null, at: now.toISOString() },
          },
          tx
        );

        return { kind: 'under_review' as const, updated };
      }

      const nextStatus =
        action === 'APPROVE' ? RecusalRequestStatus.APPROVED : RecusalRequestStatus.REJECTED;

      const updated = await tx.recusalRequest.update({
        where: { id: recusalId },
        data: {
          status: nextStatus,
          decisionReason: reason ?? null,
          decidedByUserId: authUser.id,
          decidedAt: now,
        },
        select: { id: true, status: true, decidedAt: true },
      });

      if (action === 'APPROVE') {
        await tx.caseParticipant.updateMany({
          where: {
            caseId,
            userId: recusal.targetUserId,
            isActive: true,
            participantType: {
              in: [ParticipantType.ARBITRATOR, ParticipantType.PRESIDING_ARBITRATOR, ParticipantType.MEDIATOR],
            },
          },
          data: { isActive: false },
        });
      }

      await appendCaseEvent(
        {
          caseId,
          eventType: 'RECUSAL_REQUEST_DECIDED',
          actorUserId: authUser.id,
          traceId,
          payload: { recusalId, decision: action, reason: reason ?? null, decidedAt: now.toISOString() },
        },
        tx
      );

      return { kind: 'decided' as const, updated, decision: action };
    });

    if (result.kind === 'not_found') return ErrorResponses.NOT_FOUND('回避申请');
    if (result.kind === 'forbidden') return ErrorResponses.FORBIDDEN_MESSAGE('仅申请人可撤回');
    if (result.kind === 'forbidden_manage') return ErrorResponses.FORBIDDEN_MESSAGE('需要案件管理权限才能裁定回避申请');
    if (result.kind === 'conflict') {
      return ErrorResponses.RESOURCE_CONFLICT(`当前状态为 ${result.status}，无法撤回`);
    }

    const auditEvent =
      result.kind === 'withdrawn'
        ? AuditEventType.RECUSAL_REQUEST_WITHDRAWN
        : result.kind === 'under_review'
          ? AuditEventType.RECUSAL_REQUEST_DECIDED
          : AuditEventType.RECUSAL_REQUEST_DECIDED;

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: auditEvent,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'recusal_requests',
      action: action.toLowerCase(),
      details: { traceId, caseId, recusalId, action, reason: reason ?? null },
      result: 'SUCCESS',
    });

    return createSuccessResponse(result.updated, '回避申请已更新');
  } catch (error) {
    logger.error({ err: error, traceId }, '更新回避申请失败');
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

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
