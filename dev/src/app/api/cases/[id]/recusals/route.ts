// dev/src/app/api/cases/[id]/recusals/route.ts
// 回避申请：创建/查询（案件参与人），后台裁定见 /recusals/[recusalId]
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

const pathSchema = z.object({ id: uuidSchema });

const createSchema = z
  .object({
    targetUserId: uuidSchema,
    reason: z.string().min(1).max(5000),
  })
  .strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const caseId = pathValidation.data.id;

    const access = await requireCaseAccess({ caseId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const recusals = await prisma.recusalRequest.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        caseId: true,
        requestedByUserId: true,
        targetUserId: true,
        status: true,
        reason: true,
        decisionReason: true,
        decidedByUserId: true,
        decidedAt: true,
        createdAt: true,
        updatedAt: true,
        requestedByUser: { select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } } },
        targetUser: { select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } } },
        decidedByUser: { select: { id: true, email: true } },
      },
      take: 200,
    });

    return createSuccessResponse({ traceId, caseId, recusals }, '获取回避申请成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '获取回避申请失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const access = await requireCaseAccess({ caseId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const bodyValidation = await validateRequestBody(request, createSchema);
    if (!bodyValidation.success) return bodyValidation.error;
    const { targetUserId, reason } = bodyValidation.data;

    if (targetUserId === authUser.id) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('不可对自己发起回避申请');
    }

    const membership = await prisma.caseParticipant.findFirst({
      where: { caseId, userId: authUser.id, isActive: true },
      select: { id: true },
    });
    const isRequestorParticipant =
      PermissionCheckers.canManageCase(authUser)
      || access.arbitrationCase.applicantId === authUser.id
      || access.arbitrationCase.respondentId === authUser.id
      || !!membership;
    if (!isRequestorParticipant) return ErrorResponses.FORBIDDEN_MESSAGE('仅案件参与人可申请回避');

    const targetParticipant = await prisma.caseParticipant.findFirst({
      where: {
        caseId,
        userId: targetUserId,
        isActive: true,
        participantType: {
          in: [ParticipantType.ARBITRATOR, ParticipantType.PRESIDING_ARBITRATOR, ParticipantType.MEDIATOR],
        },
      },
      select: { id: true, participantType: true },
    });
    if (!targetParticipant) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('目标用户不是本案仲裁庭成员');
    }

    const existingOpen = await prisma.recusalRequest.findFirst({
      where: {
        caseId,
        requestedByUserId: authUser.id,
        targetUserId,
        status: { in: [RecusalRequestStatus.SUBMITTED, RecusalRequestStatus.UNDER_REVIEW] },
      },
      select: { id: true },
    });
    if (existingOpen) return ErrorResponses.DUPLICATE_RESOURCE('回避申请');

    const created = await prisma.$transaction(async (tx) => {
      const recusal = await tx.recusalRequest.create({
        data: {
          caseId,
          requestedByUserId: authUser.id,
          targetUserId,
          status: RecusalRequestStatus.SUBMITTED,
          reason,
          metadata: { traceId, targetParticipantType: targetParticipant.participantType },
        },
        select: {
          id: true,
          caseId: true,
          requestedByUserId: true,
          targetUserId: true,
          status: true,
          createdAt: true,
        },
      });

      await appendCaseEvent(
        {
          caseId,
          eventType: 'RECUSAL_REQUEST_CREATED',
          actorUserId: authUser.id,
          traceId,
          payload: { recusalId: recusal.id, targetUserId, reason },
        },
        tx
      );

      return recusal;
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.RECUSAL_REQUEST_CREATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'recusal_requests',
      action: 'create',
      details: { traceId, caseId, recusalId: created.id, targetUserId },
      result: 'SUCCESS',
    });

    return createSuccessResponse(created, '回避申请已提交');
  } catch (error) {
    logger.error({ err: error, traceId }, '创建回避申请失败');
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
