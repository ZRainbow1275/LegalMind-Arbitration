// dev/src/app/api/cases/[id]/mediation-room/stage/route.ts
// M3：调解会议室阶段推进（写入 CaseEvent + 审计）

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { ParticipantType, Role } from '@/generated/prisma';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';

const pathSchema = z.object({
  id: uuidSchema, // caseId
});

const stageKeySchema = z.enum([
  'PREPARE',
  'OPENING',
  'STATEMENTS',
  'ISSUE_FRAMING',
  'EVIDENCE_EXCHANGE',
  'NEGOTIATION',
  'DRAFT_AGREEMENT',
  'SIGNING',
  'ARCHIVE',
]);

const bodySchema = z.object({
  stageKey: stageKeySchema,
  reason: z.string().max(1000).optional(),
});

function safeReadStageKey(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const stageKey = (payload as Record<string, unknown>).stageKey;
  return typeof stageKey === 'string' ? stageKey : null;
}

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

    const { stageKey, reason } = bodyValidation.data;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        applicantId: true,
        respondentId: true,
        participants: {
          where: { userId: authUser.id, isActive: true },
          select: { participantType: true },
        },
      },
    });
    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const isBusinessAdmin = authUser.roles.includes(Role.ADMIN);
    const isCaseMediator = arbitrationCase.participants.some(
      (p) => p.participantType === ParticipantType.MEDIATOR
    );

    if (!isBusinessAdmin && !isCaseMediator) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'mediation_room',
        action: 'advance_stage',
        details: { traceId, caseId, stageKey },
        result: 'FAILURE',
        errorMessage: 'FORBIDDEN_NOT_MEDIATOR_OR_ADMIN',
      });
      return ErrorResponses.FORBIDDEN_MESSAGE('只有本案调解员或业务管理员可以推进阶段');
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const lastStage = await tx.caseEvent.findFirst({
        where: { caseId, eventType: 'MEDIATION_ROOM_STAGE_CHANGED' },
        orderBy: { sequence: 'desc' },
        select: { payload: true },
      });
      const previousStageKey = safeReadStageKey(lastStage?.payload) ?? 'PREPARE';

      const stageEvent = await appendCaseEvent(
        {
          caseId,
          eventType: 'MEDIATION_ROOM_STAGE_CHANGED',
          actorUserId: authUser.id,
          traceId,
          payload: {
            previousStageKey,
            stageKey,
            reason: reason ?? null,
          },
          createdAt: now,
        },
        tx
      );

      const systemMessageId = crypto.randomUUID();
      const systemMessageText = reason
        ? `阶段已进入：${stageKey}（原因：${reason}）`
        : `阶段已进入：${stageKey}`;

      const systemMessageEvent = await appendCaseEvent(
        {
          caseId,
          eventType: 'MEDIATION_ROOM_MESSAGE',
          actorUserId: authUser.id,
          traceId,
          payload: {
            room: { kind: 'PUBLIC' },
            message: {
              id: systemMessageId,
              type: 'SYSTEM_MESSAGE',
              text: systemMessageText,
            },
            stageKey,
          },
          createdAt: now,
        },
        tx
      );

      return { previousStageKey, stageEvent, systemMessageEvent };
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_STATUS_CHANGED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress,
      userAgent,
      resource: 'mediation_room',
      action: 'advance_stage',
      details: {
        traceId,
        caseId,
        caseNumber: arbitrationCase.caseNumber,
        previousStageKey: result.previousStageKey,
        stageKey,
        stageSequence: result.stageEvent.sequence.toString(),
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        stage: {
          previousStageKey: result.previousStageKey,
          currentStageKey: stageKey,
          sequence: result.stageEvent.sequence.toString(),
          createdAt: result.stageEvent.createdAt.toISOString(),
        },
        systemMessage: {
          sequence: result.systemMessageEvent.sequence.toString(),
        },
        traceId,
      },
      '阶段已推进'
    );
  } catch (error) {
      logger.error({ err: error, traceId }, '推进调解阶段失败');
      await AuditLogger.log({
        level: AuditLevel.ERROR,
        eventType: AuditEventType.CASE_STATUS_CHANGED,
        ipAddress,
      userAgent,
      resource: 'mediation_room',
      action: 'advance_stage',
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
