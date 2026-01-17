// dev/src/app/api/neutrals/invitations/[id]/respond/route.ts
// M2：响应邀请（接受/拒绝/延期）- 事务内锁定邀请行，避免竞态

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import {
  InvitationStatus,
  NeutralResponseAction,
  PartyConsentDecision,
  PartyConsentStatus,
} from '@/generated/prisma';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';
import type { Prisma } from '@/generated/prisma';

const pathSchema = z.object({
  id: uuidSchema,
});

const respondSchema = z
  .object({
    action: z.nativeEnum(NeutralResponseAction),
    reason: z.string().max(2000).optional(),
    extendExpiresAt: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === NeutralResponseAction.REQUEST_MORE_TIME && !data.extendExpiresAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['extendExpiresAt'],
        message: 'REQUEST_MORE_TIME 必须提供 extendExpiresAt',
      });
    }
  });

type LockedInvitationRow = {
  id: string;
  caseId: string;
  invitedUserId: string;
  status: InvitationStatus;
  expiresAt: Date | null;
};

type TransactionReject = {
  error: ReturnType<typeof ErrorResponses.BAD_REQUEST_MESSAGE | typeof ErrorResponses.FORBIDDEN_MESSAGE | typeof ErrorResponses.NOT_FOUND>;
  errorMessage: string;
};

type TransactionOk = {
  data: {
    invitation: NonNullable<
      Awaited<ReturnType<typeof prisma.neutralInvitation.findUnique>>
    >;
    responseId: string | null;
    consentId: string | null;
  };
};

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

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;

    const bodyValidation = await validateRequestBody(request, respondSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const invitationId = pathValidation.data.id;
    const { action, reason, extendExpiresAt } = bodyValidation.data;

    const invitation = await prisma.neutralInvitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        caseId: true,
        neutralType: true,
        invitedUserId: true,
      },
    });
    if (!invitation) return ErrorResponses.NOT_FOUND('邀请');

    if (invitation.invitedUserId !== authUser.id) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'neutral_responses',
        action: 'respond',
        details: { traceId, invitationId, caseId: invitation.caseId, action },
        result: 'FAILURE',
        errorMessage: 'FORBIDDEN_NOT_INVITED',
      });
      return ErrorResponses.FORBIDDEN_MESSAGE('只有被邀请人可以响应邀请');
    }

    const now = new Date();

    const result: TransactionReject | TransactionOk = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<LockedInvitationRow[]>`
        SELECT
          id,
          case_id AS "caseId",
          invited_user_id AS "invitedUserId",
          status,
          expires_at AS "expiresAt"
        FROM neutral_invitations
        WHERE id = ${invitationId}
        FOR UPDATE
      `;

      const locked = rows[0];
      if (!locked) {
        return { error: ErrorResponses.NOT_FOUND('邀请'), errorMessage: 'INVITATION_NOT_FOUND' };
      }

      if (locked.invitedUserId !== authUser.id) {
        return { error: ErrorResponses.FORBIDDEN_MESSAGE('只有被邀请人可以响应邀请'), errorMessage: 'FORBIDDEN_NOT_INVITED' };
      }

      if (
        locked.expiresAt
        && locked.expiresAt.getTime() <= now.getTime()
        && locked.status === InvitationStatus.SENT
      ) {
        await tx.neutralInvitation.update({
          where: { id: invitationId },
          data: { status: InvitationStatus.EXPIRED },
        });
        return { error: ErrorResponses.BAD_REQUEST_MESSAGE('邀请已过期'), errorMessage: 'INVITATION_EXPIRED' };
      }

      if (action === NeutralResponseAction.ACCEPT && locked.status === InvitationStatus.ACCEPTED) {
        const current = await tx.neutralInvitation.findUnique({ where: { id: invitationId } });
        if (!current) {
          return { error: ErrorResponses.NOT_FOUND('邀请'), errorMessage: 'INVITATION_NOT_FOUND' };
        }
        return { data: { invitation: current, responseId: null, consentId: null } };
      }

      if (action === NeutralResponseAction.REJECT && locked.status === InvitationStatus.REJECTED) {
        const current = await tx.neutralInvitation.findUnique({ where: { id: invitationId } });
        if (!current) {
          return { error: ErrorResponses.NOT_FOUND('邀请'), errorMessage: 'INVITATION_NOT_FOUND' };
        }
        return { data: { invitation: current, responseId: null, consentId: null } };
      }

      if (locked.status !== InvitationStatus.SENT) {
        return { error: ErrorResponses.BAD_REQUEST_MESSAGE('当前状态不允许响应邀请'), errorMessage: 'INVITATION_STATUS_NOT_ALLOWED' };
      }

      if (action === NeutralResponseAction.ACCEPT) {
        const hasDisclosure = await tx.conflictDisclosure.findFirst({
          where: { invitationId },
          select: { id: true },
        });
        if (!hasDisclosure) {
          return { error: ErrorResponses.BAD_REQUEST_MESSAGE('接受邀请前必须先提交披露'), errorMessage: 'DISCLOSURE_REQUIRED' };
        }
      }

      const response = await tx.neutralResponse.create({
        data: {
          invitationId,
          actorUserId: authUser.id,
          action,
          reason: reason ?? null,
          respondedAt: now,
          createdAt: now,
        },
      });

      let nextStatus: InvitationStatus = InvitationStatus.SENT;
      const updateData: Prisma.NeutralInvitationUpdateInput = { respondedAt: now };

      if (action === NeutralResponseAction.ACCEPT) {
        nextStatus = InvitationStatus.ACCEPTED;
        updateData.status = InvitationStatus.ACCEPTED;
      } else if (action === NeutralResponseAction.REJECT) {
        nextStatus = InvitationStatus.REJECTED;
        updateData.status = InvitationStatus.REJECTED;
      } else if (action === NeutralResponseAction.REQUEST_MORE_TIME) {
        const newExpiresAt = extendExpiresAt ? new Date(extendExpiresAt) : null;
        if (!newExpiresAt || Number.isNaN(newExpiresAt.getTime()) || newExpiresAt.getTime() <= now.getTime()) {
          return { error: ErrorResponses.BAD_REQUEST_MESSAGE('extendExpiresAt 必须是未来时间'), errorMessage: 'INVALID_EXTEND_EXPIRES_AT' };
        }
        updateData.expiresAt = newExpiresAt;
      }

      const updatedInvitation = await tx.neutralInvitation.update({
        where: { id: invitationId },
        data: updateData,
      });

      let consentId: string | null = null;
      if (action === NeutralResponseAction.ACCEPT) {
        const consent = await tx.partyConsent.upsert({
          where: {
            caseId_targetType_targetUserId: {
              caseId: invitation.caseId,
              targetType: invitation.neutralType,
              targetUserId: invitation.invitedUserId,
            },
          },
          create: {
            caseId: invitation.caseId,
            invitationId,
            targetType: invitation.neutralType,
            targetUserId: invitation.invitedUserId,
            status: PartyConsentStatus.PENDING,
            applicantDecision: PartyConsentDecision.PENDING,
            respondentDecision: PartyConsentDecision.PENDING,
          },
          update: { invitationId },
        });
        consentId = consent.id;
      }

      await appendCaseEvent(
        {
          caseId: invitation.caseId,
          eventType:
            action === NeutralResponseAction.ACCEPT
              ? 'NEUTRAL_INVITATION_ACCEPTED'
              : action === NeutralResponseAction.REJECT
                ? 'NEUTRAL_INVITATION_REJECTED'
                : 'NEUTRAL_INVITATION_REQUEST_MORE_TIME',
          actorUserId: authUser.id,
          traceId,
          payload: {
            invitationId,
            action,
            nextStatus,
            responseId: response.id,
            consentId,
          },
          createdAt: now,
        },
        tx
      );

      return { data: { invitation: updatedInvitation, responseId: response.id, consentId } };
    });

    if ('error' in result) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.CASE_UPDATED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'neutral_responses',
        action: 'respond',
        details: { traceId, invitationId, caseId: invitation.caseId, action },
        result: 'FAILURE',
        errorMessage: result.errorMessage,
      });
      return result.error;
    }

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress,
      userAgent,
      resource: 'neutral_responses',
      action: 'respond',
      details: {
        traceId,
        invitationId,
        caseId: invitation.caseId,
        action,
        responseId: result.data.responseId,
        consentId: result.data.consentId,
        nextInvitationStatus: result.data.invitation.status,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(result.data, '响应邀请成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '响应邀请失败');
    await AuditLogger.log({
      level: AuditLevel.ERROR,
      eventType: AuditEventType.CASE_UPDATED,
      ipAddress,
      userAgent,
      resource: 'neutral_responses',
      action: 'respond',
      details: { traceId },
      result: 'FAILURE',
      errorMessage: error instanceof Error ? error.message : '未知错误',
    }).catch(() => undefined);
    return ErrorResponses.INTERNAL_ERROR();
  }
}
