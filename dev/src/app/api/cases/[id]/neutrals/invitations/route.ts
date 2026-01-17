// dev/src/app/api/cases/[id]/neutrals/invitations/route.ts
// M2：发起中立者（仲裁员/调解员）邀请

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { NeutralType, Role, InvitationStatus } from '@/generated/prisma';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import type { Prisma } from '@/generated/prisma';

const pathSchema = z.object({
  id: uuidSchema,
});

const createInvitationSchema = z.object({
  neutralType: z.nativeEnum(NeutralType),
  invitedUserId: uuidSchema,
  expiresAt: z.string().datetime().optional(),
  requirements: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string | string[]>> }
) {
  const traceId = getTraceId(request.headers);
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });      
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 仅业务管理员可发起邀请；运维（OPS_ADMIN）不参与案件事实
    if (!authUser.roles.includes(Role.ADMIN)) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'neutral_invitations',
        action: 'create',
        details: { traceId },
        result: 'FAILURE',
        errorMessage: 'FORBIDDEN_NOT_ADMIN',
      });
      return ErrorResponses.FORBIDDEN_MESSAGE('只有业务管理员可以发起邀请');    
    }

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;

    const bodyValidation = await validateRequestBody(request, createInvitationSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const caseId = pathValidation.data.id;
    const { neutralType, invitedUserId, expiresAt: expiresAtIso, requirements } = bodyValidation.data;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: { id: true, caseNumber: true, title: true },
    });
    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const invitedUser = await prisma.user.findUnique({
      where: { id: invitedUserId },
      include: {
        roles: { where: { isActive: true }, select: { role: true, isActive: true } },
        profile: { select: { realName: true, companyName: true } },
      },
    });
    if (!invitedUser) return ErrorResponses.NOT_FOUND('被邀请用户');

    const expectedRole = neutralType === NeutralType.ARBITRATOR ? Role.ARBITRATOR : Role.MEDIATOR;
    const hasExpectedRole = invitedUser.roles.some((r) => r.isActive && r.role === expectedRole);
    if (!hasExpectedRole) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('被邀请用户不具备对应平台身份');
    }

    const now = new Date();
    const expiresAt = expiresAtIso ? new Date(expiresAtIso) : new Date(now.getTime() + 3 * 24 * 3600 * 1000);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('expiresAt 必须是未来时间');
    }

    let requirementsJson: Prisma.InputJsonValue;
    try {
      requirementsJson = requirements !== undefined
        ? (JSON.parse(JSON.stringify(requirements)) as Prisma.InputJsonValue)
        : ({ requireDisclosure: true } as Prisma.InputJsonValue);
    } catch (error) {
        logger.error({ err: error, traceId }, 'requirements 序列化失败');
        return ErrorResponses.BAD_REQUEST('requirements 不可序列化');
      }

    const invitation = await prisma.$transaction(async (tx) => {
      const created = await tx.neutralInvitation.create({
        data: {
          caseId,
          neutralType,
          invitedUserId,
          invitedByUserId: authUser.id,
          status: InvitationStatus.SENT,
          sentAt: now,
          expiresAt,
          requirements: requirementsJson,
        },
      });

      await appendCaseEvent(
        {
          caseId,
          eventType: 'NEUTRAL_INVITATION_SENT',
          actorUserId: authUser.id,
          traceId,
          payload: {
            invitationId: created.id,
            neutralType,
            invitedUserId,
            invitedByUserId: authUser.id,
            expiresAt: expiresAt.toISOString(),
          },
          createdAt: now,
        },
        tx
      );

      return created;
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_ASSIGNED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress,
      userAgent,
      resource: 'neutral_invitations',
      action: 'create',
      details: {
        traceId,
        caseId,
        invitationId: invitation.id,
        neutralType,
        invitedUserId,
        expiresAt: expiresAt.toISOString(),
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        invitation,
        case: arbitrationCase,
        invitedUser: {
          id: invitedUser.id,
          email: invitedUser.email,
          displayName: invitedUser.profile?.realName || invitedUser.profile?.companyName || invitedUser.email,
        },
      },
      '邀请已发出'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '发起邀请失败');
    await AuditLogger.log({
      level: AuditLevel.ERROR,
      eventType: AuditEventType.CASE_ASSIGNED,
      ipAddress,
      userAgent,
      resource: 'neutral_invitations',
      action: 'create',
      details: { traceId },
      result: 'FAILURE',
      errorMessage: error instanceof Error ? error.message : '未知错误',
    }).catch(() => undefined);
    return ErrorResponses.INTERNAL_ERROR();
  }
}
