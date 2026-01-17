// dev/src/app/api/cases/[id]/mediation-room/messages/route.ts
// M3：调解会议室消息发送（写入 CaseEvent）

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { Role } from '@/generated/prisma';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';

const pathSchema = z.object({
  id: uuidSchema, // caseId
});

const bodySchema = z.object({
  clientMessageId: uuidSchema,
  type: z.literal('USER_MESSAGE'),
  text: z.string().min(1).max(4000),
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
    const caseId = pathValidation.data.id;

    const bodyValidation = await validateRequestBody(request, bodySchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const { clientMessageId, text } = bodyValidation.data;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        applicantId: true,
        respondentId: true,
        participants: {
          where: { userId: authUser.id, isActive: true },
          select: { participantType: true },
        },
      },
    });
    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const isParty =
      arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id;
    const isParticipant = arbitrationCase.participants.length > 0;
    const isBusinessAdmin = authUser.roles.includes(Role.ADMIN);

    if (!isParty && !isParticipant && !isBusinessAdmin) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'mediation_room_messages',
        action: 'send',
        details: { traceId, caseId },
        result: 'FAILURE',
        errorMessage: 'FORBIDDEN_NOT_PARTICIPANT',
      });
      return ErrorResponses.FORBIDDEN_MESSAGE('无权在该调解会议室发送消息');
    }

    const existing = await prisma.caseEvent.findFirst({
      where: {
        caseId,
        eventType: 'MEDIATION_ROOM_MESSAGE',
        actorUserId: authUser.id,
        payload: {
          path: ['message', 'id'],
          equals: clientMessageId,
        },
      },
      select: { id: true, sequence: true, createdAt: true },
    });

    if (existing) {
      return createSuccessResponse(
        {
          event: {
            id: existing.id,
            sequence: existing.sequence.toString(),
            createdAt: existing.createdAt.toISOString(),
          },
          traceId,
        },
        '消息已发送'
      );
    }

    const now = new Date();
    const created = await prisma.$transaction(async (tx) => {
      return appendCaseEvent(
        {
          caseId,
          eventType: 'MEDIATION_ROOM_MESSAGE',
          actorUserId: authUser.id,
          traceId,
          payload: {
            room: { kind: 'PUBLIC' },
            message: {
              id: clientMessageId,
              type: 'USER_MESSAGE',
              text: text.trim(),
            },
          },
          createdAt: now,
        },
        tx
      );
    });

    return createSuccessResponse(
      {
        event: {
          id: created.id,
          sequence: created.sequence.toString(),
          createdAt: created.createdAt.toISOString(),
        },
        traceId,
      },
      '消息已发送'
    );
  } catch (error) {
      logger.error({ err: error, traceId }, '发送调解会议室消息失败');
      await AuditLogger.log({
        level: AuditLevel.ERROR,
        eventType: AuditEventType.CASE_UPDATED,
        ipAddress,
      userAgent,
      resource: 'mediation_room_messages',
      action: 'send',
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
