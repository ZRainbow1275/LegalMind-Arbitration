// dev/src/app/api/cases/[id]/neutrals/[userId]/consents/route.ts
// M2：当事方对中立者（仲裁员/调解员）合意确认（双方合意）——全线上留痕

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import {
  NeutralType,
  AppointmentStatus,
  PartyConsentDecision,
  PartyConsentStatus,
} from '@/generated/prisma';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

const pathSchema = z.object({
  id: uuidSchema, // caseId
  userId: uuidSchema, // targetUserId
});

const bodySchema = z.object({
  targetType: z.nativeEnum(NeutralType),
  decision: z
    .nativeEnum(PartyConsentDecision)
    .refine((value) => value !== PartyConsentDecision.PENDING, 'decision 不允许为 PENDING'),
  reason: z.string().max(2000).optional(),
  signatureRef: z.string().max(2000).optional(),
});

type PartySide = 'APPLICANT' | 'RESPONDENT';

function resolvePartySide(input: {
  actorUserId: string;
  applicantId: string;
  respondentId: string | null;
}): PartySide | null {
  if (input.actorUserId === input.applicantId) return 'APPLICANT';
  if (input.respondentId && input.actorUserId === input.respondentId) return 'RESPONDENT';
  return null;
}

class PartyConsentStateError extends Error {
  readonly name = 'PartyConsentStateError';

  constructor(
    readonly kind: 'CONSENT_NOT_FOUND' | 'CONSENT_ALREADY_EFFECTIVE',
    message: string
  ) {
    super(message);
  }
}

type LockedConsentRow = {
  id: string;
  status: PartyConsentStatus;
  applicantDecision: PartyConsentDecision;
  respondentDecision: PartyConsentDecision;
  invitationId: string | null;
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

    const bodyValidation = await validateRequestBody(request, bodySchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const caseId = pathValidation.data.id;
    const targetUserId = pathValidation.data.userId;
    const { targetType, decision, reason, signatureRef } = bodyValidation.data;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: { id: true, applicantId: true, respondentId: true },
    });
    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const partySide = resolvePartySide({
      actorUserId: authUser.id,
      applicantId: arbitrationCase.applicantId,
      respondentId: arbitrationCase.respondentId,
    });
    if (!partySide) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'party_consents',
        action: 'submit',
        details: { traceId, caseId, targetUserId, targetType },
        result: 'FAILURE',
        errorMessage: 'FORBIDDEN_NOT_PARTY',
      });
      return ErrorResponses.FORBIDDEN_MESSAGE('只有案件当事人可以提交合意');
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<LockedConsentRow[]>`
        SELECT
          id,
          status,
          applicant_decision AS "applicantDecision",
          respondent_decision AS "respondentDecision",
          invitation_id AS "invitationId"
        FROM party_consents
        WHERE case_id = ${caseId}
          AND target_type = ${targetType}
          AND target_user_id = ${targetUserId}
        FOR UPDATE
      `;

      const locked = rows[0];
      if (!locked) {
        throw new PartyConsentStateError(
          'CONSENT_NOT_FOUND',
          '尚未创建合意记录（需被邀请中立者先接受邀请）'
        );
      }

      if (locked.status === PartyConsentStatus.EFFECTIVE) {
        throw new PartyConsentStateError(
          'CONSENT_ALREADY_EFFECTIVE',
          '合意已生效，如需变更请走解除任命流程'
        );
      }

      const nextApplicantDecision =
        partySide === 'APPLICANT' ? decision : locked.applicantDecision;
      const nextRespondentDecision =
        partySide === 'RESPONDENT' ? decision : locked.respondentDecision;

      const derivedStatus =
        nextApplicantDecision === PartyConsentDecision.WITHDRAWN
        || nextRespondentDecision === PartyConsentDecision.WITHDRAWN
          ? PartyConsentStatus.WITHDRAWN
          : nextApplicantDecision === PartyConsentDecision.CONSENTED
              && nextRespondentDecision === PartyConsentDecision.CONSENTED
            ? PartyConsentStatus.CONSENTED_BOTH
            : PartyConsentStatus.PENDING;

      let finalStatus: PartyConsentStatus = derivedStatus;
      let appointmentId: string | null = null;

      if (derivedStatus === PartyConsentStatus.CONSENTED_BOTH) {
        const existing = await tx.neutralAppointment.findFirst({
          where: {
            caseId,
            targetType,
            targetUserId,
            status: { in: [AppointmentStatus.PENDING, AppointmentStatus.ACTIVE] },
          },
          select: { id: true, status: true },
        });

        if (existing) {
          appointmentId = existing.id;
          if (existing.status === AppointmentStatus.PENDING) {
            await tx.neutralAppointment.update({
              where: { id: existing.id },
              data: { status: AppointmentStatus.ACTIVE, effectiveAt: now },
            });
          }
        } else {
          const created = await tx.neutralAppointment.create({
            data: {
              caseId,
              invitationId: locked.invitationId,
              targetType,
              targetUserId,
              status: AppointmentStatus.ACTIVE,
              effectiveAt: now,
              createdByUserId: authUser.id,
            },
            select: { id: true },
          });
          appointmentId = created.id;
        }

        finalStatus = PartyConsentStatus.EFFECTIVE;
      }

      const updatedConsent = await tx.partyConsent.update({
        where: { id: locked.id },
        data:
          partySide === 'APPLICANT'
            ? {
                status: finalStatus,
                applicantDecision: decision,
                applicantDecisionAt: now,
                applicantReason: reason ?? null,
                applicantSignatureRef: signatureRef ?? null,
              }
            : {
                status: finalStatus,
                respondentDecision: decision,
                respondentDecisionAt: now,
                respondentReason: reason ?? null,
                respondentSignatureRef: signatureRef ?? null,
              },
      });

      await appendCaseEvent(
        {
          caseId,
          eventType:
            decision === PartyConsentDecision.CONSENTED
              ? 'PARTY_CONSENTED'
              : decision === PartyConsentDecision.REJECTED
                ? 'PARTY_CONSENT_REJECTED'
                : 'PARTY_CONSENT_WITHDRAWN',
          actorUserId: authUser.id,
          traceId,
          payload: {
            consentId: updatedConsent.id,
            partySide,
            targetType,
            targetUserId,
            decision,
            nextStatus: updatedConsent.status,
            appointmentId,
          },
          createdAt: now,
        },
        tx
      );

      if (appointmentId && updatedConsent.status === PartyConsentStatus.EFFECTIVE) {
        await appendCaseEvent(
          {
            caseId,
            eventType: 'NEUTRAL_APPOINTED',
            actorUserId: authUser.id,
            traceId,
            payload: { appointmentId, targetType, targetUserId },
            createdAt: now,
          },
          tx
        );
      }

      return updatedConsent;
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress,
      userAgent,
      resource: 'party_consents',
      action: 'submit',
      details: {
        traceId,
        caseId,
        consentId: updated.id,
        partySide,
        targetType,
        targetUserId,
        decision,
        nextStatus: updated.status,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        consent: {
          id: updated.id,
          status: updated.status,
          applicantDecision: updated.applicantDecision,
          respondentDecision: updated.respondentDecision,
          applicantDecisionAt: updated.applicantDecisionAt
            ? updated.applicantDecisionAt.toISOString()
            : null,
          respondentDecisionAt: updated.respondentDecisionAt
            ? updated.respondentDecisionAt.toISOString()
            : null,
        },
        traceId,
      },
      '合意已提交'
    );
  } catch (error) {
    if (error instanceof PartyConsentStateError) {
      return ErrorResponses.BAD_REQUEST_MESSAGE(error.message);
    }

    logger.error({ err: error, traceId }, '提交合意失败');
    await AuditLogger.log({
      level: AuditLevel.ERROR,
      eventType: AuditEventType.CASE_UPDATED,
      ipAddress,
      userAgent,
      resource: 'party_consents',
      action: 'submit',
      details: { traceId },
      result: 'FAILURE',
      errorMessage: error instanceof Error ? error.message : '未知错误',
    }).catch(() => undefined);
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
