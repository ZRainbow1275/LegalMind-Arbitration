// dev/src/app/api/neutrals/invitations/[id]/disclosure/route.ts
// M2：提交/更新利益冲突披露（被邀请中立者）

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { InvitationStatus, Prisma } from '@/generated/prisma';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';

const pathSchema = z.object({
  id: uuidSchema,
});

const disclosureSchema = z.object({
  disclosureText: z.string().min(1, '披露内容不能为空').max(10000, '披露内容过长'),
  attachments: z.unknown().optional(),
  signatureRef: z.string().max(2000).optional(),
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

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;

    const bodyValidation = await validateRequestBody(request, disclosureSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const invitationId = pathValidation.data.id;

    const invitation = await prisma.neutralInvitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        caseId: true,
        invitedUserId: true,
        status: true,
        expiresAt: true,
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
        resource: 'conflict_disclosures',
        action: 'submit',
        details: { traceId, invitationId },
        result: 'FAILURE',
        errorMessage: 'FORBIDDEN_NOT_INVITED',
      });
      return ErrorResponses.FORBIDDEN_MESSAGE('只有被邀请人可以提交披露');
    }

    const now = new Date();
    if (invitation.expiresAt && invitation.expiresAt.getTime() <= now.getTime() && invitation.status === InvitationStatus.SENT) {
      await prisma.neutralInvitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.EXPIRED },
      });
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.CASE_UPDATED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'conflict_disclosures',
        action: 'submit',
        details: { traceId, invitationId, caseId: invitation.caseId },
        result: 'FAILURE',
        errorMessage: 'INVITATION_EXPIRED',
      });
      return ErrorResponses.BAD_REQUEST_MESSAGE('邀请已过期');
    }

      if (invitation.status !== InvitationStatus.SENT && invitation.status !== InvitationStatus.ACCEPTED) {
        await AuditLogger.log({
          level: AuditLevel.WARNING,
          eventType: AuditEventType.CASE_UPDATED,
          userId: authUser.id,
          userName: authUser.email,
          ipAddress,
          userAgent,
          resource: 'conflict_disclosures',
          action: 'submit',
          details: { traceId, invitationId, caseId: invitation.caseId, status: invitation.status },
          result: 'FAILURE',
          errorMessage: 'INVITATION_STATUS_NOT_ALLOWED',
        });
        return ErrorResponses.BAD_REQUEST_MESSAGE('当前状态不允许提交披露');
      }

      const attachmentsInput = bodyValidation.data.attachments;
      let attachments: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined;

      if (attachmentsInput === null) {
        attachments = Prisma.DbNull;
      } else if (attachmentsInput !== undefined) {
        try {
          attachments = JSON.parse(JSON.stringify(attachmentsInput)) as Prisma.InputJsonValue;
          } catch (error) {
            logger.error({ err: error, traceId }, '披露附件序列化失败');
            return ErrorResponses.BAD_REQUEST_MESSAGE('附件格式无效');
          }
      }

      const disclosure = await prisma.$transaction(async (tx) => {        
        const created = await tx.conflictDisclosure.create({
          data: {
            invitationId,
            createdBy: authUser.id,
            disclosureText: bodyValidation.data.disclosureText,
            attachments,
            signedAt: now,
            signatureRef: bodyValidation.data.signatureRef ?? null,       
          },
        });

      await appendCaseEvent(
        {
          caseId: invitation.caseId,
          eventType: 'NEUTRAL_DISCLOSURE_SUBMITTED',
          actorUserId: authUser.id,
          traceId,
          payload: {
            invitationId,
            disclosureId: created.id,
          },
          createdAt: now,
        },
        tx
      );

      return created;
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress,
      userAgent,
      resource: 'conflict_disclosures',
      action: 'submit',
      details: {
        traceId,
        invitationId,
        caseId: invitation.caseId,
        disclosureId: disclosure.id,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        disclosure: {
          id: disclosure.id,
          invitationId: disclosure.invitationId,
          createdAt: disclosure.createdAt.toISOString(),
        },
      },
      '披露已提交'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '提交披露失败');
    await AuditLogger.log({
      level: AuditLevel.ERROR,
      eventType: AuditEventType.CASE_UPDATED,
      ipAddress,
      userAgent,
      resource: 'conflict_disclosures',
      action: 'submit',
      details: { traceId },
      result: 'FAILURE',
      errorMessage: error instanceof Error ? error.message : '未知错误',
    }).catch(() => undefined);
    return ErrorResponses.INTERNAL_ERROR();
  }
}
