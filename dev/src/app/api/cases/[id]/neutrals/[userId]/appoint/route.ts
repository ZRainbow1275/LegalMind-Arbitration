// dev/src/app/api/cases/[id]/neutrals/[userId]/appoint/route.ts
// M2：在双方合意满足后使“任命生效”——写入 NeutralAppointment + 案件参与关系 + 留痕

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import {
  AppointmentStatus,
  NeutralType,
  PartyConsentStatus,
  ParticipantType,
  Role,
} from '@/generated/prisma';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';

const pathSchema = z.object({
  id: uuidSchema, // caseId
  userId: uuidSchema, // targetUserId
});

const bodySchema = z.object({
  targetType: z.nativeEnum(NeutralType),
});

function toParticipantType(targetType: NeutralType): ParticipantType {
  return targetType === NeutralType.ARBITRATOR
    ? ParticipantType.ARBITRATOR
    : ParticipantType.MEDIATOR;
}

function toRoleDescription(targetType: NeutralType): string {
  return targetType === NeutralType.ARBITRATOR ? '仲裁员' : '调解员';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string | string[]>> }
) {
  const traceId = getTraceId(request.headers);
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const guard = await requireAuthenticatedUser(request, {
      csrf: true,
      anyRole: [Role.ADMIN],
      forbiddenMessage: '只有业务管理员可以使任命生效',
    });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;

    const bodyValidation = await validateRequestBody(request, bodySchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const caseId = pathValidation.data.id;
    const targetUserId = pathValidation.data.userId;
    const { targetType } = bodyValidation.data;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: { id: true, caseNumber: true },
    });
    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const consent = await prisma.partyConsent.findUnique({
      where: {
        caseId_targetType_targetUserId: {
          caseId,
          targetType,
          targetUserId,
        },
      },
    });
    if (!consent) {
      return ErrorResponses.NOT_FOUND('合意记录');
    }

    if (consent.status !== PartyConsentStatus.CONSENTED_BOTH) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('双方尚未完成合意，不能使任命生效');
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.neutralAppointment.findFirst({
        where: {
          caseId,
          targetType,
          targetUserId,
          status: AppointmentStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (existing) {
        return { error: ErrorResponses.RESOURCE_CONFLICT('任命已生效，无需重复操作') };
      }

      const appointment = await tx.neutralAppointment.create({
        data: {
          caseId,
          invitationId: consent.invitationId,
          targetType,
          targetUserId,
          status: AppointmentStatus.ACTIVE,
          effectiveAt: now,
          createdByUserId: authUser.id,
        },
      });

      await tx.partyConsent.update({
        where: { id: consent.id },
        data: { status: PartyConsentStatus.EFFECTIVE },
      });

      const participantType = toParticipantType(targetType);
      const existingParticipant = await tx.caseParticipant.findFirst({
        where: {
          caseId,
          userId: targetUserId,
          participantType,
          isActive: true,
        },
        select: { id: true },
      });

      if (!existingParticipant) {
        await tx.caseParticipant.create({
          data: {
            caseId,
            userId: targetUserId,
            participantType,
            roleDescription: toRoleDescription(targetType),
            isActive: true,
          },
        });
      }

      await appendCaseEvent(
        {
          caseId,
          eventType: 'NEUTRAL_APPOINTMENT_EFFECTIVE',
          actorUserId: authUser.id,
          traceId,
          payload: {
            appointmentId: appointment.id,
            consentId: consent.id,
            invitationId: consent.invitationId,
            targetType,
            targetUserId,
            caseNumber: arbitrationCase.caseNumber,
          },
          createdAt: now,
        },
        tx
      );

      return { data: appointment };
    });

    if ('error' in result) return result.error;

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_ASSIGNED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress,
      userAgent,
      resource: 'neutral_appointments',
      action: 'effective',
      details: {
        traceId,
        caseId,
        appointmentId: result.data.id,
        consentId: consent.id,
        invitationId: consent.invitationId,
        targetType,
        targetUserId,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        appointment: {
          id: result.data.id,
          status: result.data.status,
          effectiveAt: result.data.effectiveAt ? result.data.effectiveAt.toISOString() : null,
          targetType: result.data.targetType,
          targetUserId: result.data.targetUserId,
        },
        traceId,
      },
      '任命已生效'
    );
    } catch (error) {
      logger.error({ err: error, traceId }, '使任命生效失败');
      await AuditLogger.log({
        level: AuditLevel.ERROR,
        eventType: AuditEventType.CASE_ASSIGNED,
        ipAddress,
      userAgent,
      resource: 'neutral_appointments',
      action: 'effective',
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
