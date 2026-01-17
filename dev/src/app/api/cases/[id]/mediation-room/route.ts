// dev/src/app/api/cases/[id]/mediation-room/route.ts
// M3：调解会议室（文字版庭审）最小闭环：基于 CaseEvent 的可回放事件流（拉取 + 增量）

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateSearchParams, uuidSchema } from '@/lib/validation';
import { Role } from '@/generated/prisma';

const pathSchema = z.object({
  id: uuidSchema, // caseId
});

const querySchema = z.object({
  afterSequence: z.string().regex(/^\d+$/).optional(),
  limit: z.string().optional(),
});

type RoomEventType = 'MEDIATION_ROOM_MESSAGE' | 'MEDIATION_ROOM_STAGE_CHANGED';
const allowedEventTypes: RoomEventType[] = [
  'MEDIATION_ROOM_MESSAGE',
  'MEDIATION_ROOM_STAGE_CHANGED',
];

function getDisplayName(user: {
  email: string;
  profile?: { realName: string | null; companyName: string | null } | null;
}) {
  return user.profile?.realName || user.profile?.companyName || user.email;
}

function safeReadStageKey(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const stageKey = (payload as Record<string, unknown>).stageKey;
  return typeof stageKey === 'string' ? stageKey : null;
}

function parseLimit(limitRaw: string | undefined): number {
  const parsed = limitRaw ? Number(limitRaw) : 50;
  const value = Number.isFinite(parsed) ? parsed : 50;
  return Math.min(200, Math.max(1, Math.floor(value)));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string | string[]>> }
) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const caseId = pathValidation.data.id;

    const { searchParams } = new URL(request.url);
    const queryValidation = validateSearchParams(searchParams, querySchema);
    if (!queryValidation.success) return queryValidation.error;

    const limit = parseLimit(queryValidation.data.limit);
    const afterSequenceRaw = queryValidation.data.afterSequence;
    const afterSequence = afterSequenceRaw ? BigInt(afterSequenceRaw) : null;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        title: true,
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
      return ErrorResponses.FORBIDDEN_MESSAGE('无权进入该调解会议室');
    }

    const latestStageEvent = await prisma.caseEvent.findFirst({
      where: { caseId, eventType: 'MEDIATION_ROOM_STAGE_CHANGED' },
      orderBy: { sequence: 'desc' },
      select: { payload: true, createdAt: true, sequence: true },
    });

    const currentStageKey = safeReadStageKey(latestStageEvent?.payload) ?? 'PREPARE';

    const eventsRaw =
      afterSequence !== null
        ? await prisma.caseEvent.findMany({
            where: {
              caseId,
              eventType: { in: allowedEventTypes },
              sequence: { gt: afterSequence },
            },
            orderBy: { sequence: 'asc' },
            take: limit,
            include: {
              actor: {
                select: {
                  id: true,
                  email: true,
                  profile: { select: { realName: true, companyName: true } },
                },
              },
            },
          })
        : (
            await prisma.caseEvent.findMany({
              where: { caseId, eventType: { in: allowedEventTypes } },
              orderBy: { sequence: 'desc' },
              take: limit,
              include: {
                actor: {
                  select: {
                    id: true,
                    email: true,
                    profile: { select: { realName: true, companyName: true } },
                  },
                },
              },
            })
          ).reverse();

    const events = eventsRaw.map((event) => ({
      id: event.id,
      sequence: event.sequence.toString(),
      eventType: event.eventType,
      createdAt: event.createdAt.toISOString(),
      traceId: event.traceId ?? null,
      hash: event.hash ?? null,
      actor: event.actor
        ? { id: event.actor.id, displayName: getDisplayName(event.actor) }
        : null,
      payload: event.payload,
    }));

    const nextAfterSequence =
      events.length > 0
        ? events[events.length - 1].sequence
        : afterSequence !== null
          ? afterSequence.toString()
          : '0';

    return createSuccessResponse(
      {
        room: {
          caseId,
          caseNumber: arbitrationCase.caseNumber,
          title: arbitrationCase.title,
        },
        stage: {
          currentStageKey,
          updatedAt: latestStageEvent?.createdAt ? latestStageEvent.createdAt.toISOString() : null,
          sequence: latestStageEvent?.sequence ? latestStageEvent.sequence.toString() : null,
        },
        events,
        nextAfterSequence,
      },
      '获取调解会议室成功'
    );
    } catch (error) {
      logger.error({ err: error }, '获取调解会议室失败');
      return ErrorResponses.INTERNAL_ERROR();
    }
}

export async function POST() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
