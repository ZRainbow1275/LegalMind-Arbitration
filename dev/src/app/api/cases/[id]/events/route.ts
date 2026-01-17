// dev/src/app/api/cases/[id]/events/route.ts
// 案件事件流（Prototype 依赖）：GET /api/cases/:id/events (SSE)
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type RealtimeEventType = 'canvas-update' | 'document-update' | 'case-update';

function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v));
}

function toRealtimeType(eventType: string): RealtimeEventType {
  const t = eventType.toLowerCase();
  if (t.includes('canvas')) return 'canvas-update';
  if (t.includes('document')) return 'document-update';
  return 'case-update';
}

function parseStartSequence(request: NextRequest): bigint {
  const lastEventId = request.headers.get('last-event-id') || request.headers.get('Last-Event-ID');
  if (lastEventId) {
    try {
      return BigInt(lastEventId);
    } catch {
      // ignore
    }
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('since') || searchParams.get('cursor');
  if (!raw) return BigInt(0);
  try {
    const n = BigInt(raw);
    return n < BigInt(0) ? BigInt(0) : n;
  } catch {
    return BigInt(0);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        applicantId: true,
        respondentId: true,
        participants: {
          where: { userId: authUser.id, isActive: true },
          select: { id: true },
        },
      },
    });

    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser)
      || arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id
      || arbitrationCase.participants.length > 0;

    if (!hasAccess) return ErrorResponses.FORBIDDEN();

    let cursor = parseStartSequence(request);
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;

        const sendKeepAlive = () => {
          if (closed) return;
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        };

        const sendEvent = (event: { id: string; event: RealtimeEventType; data: string }) => {
          if (closed) return;
          controller.enqueue(
            encoder.encode(`id: ${event.id}\nevent: ${event.event}\ndata: ${event.data}\n\n`)
          );
        };

        const poll = async () => {
          if (closed) return;
          try {
            const events = await prisma.caseEvent.findMany({
              where: { caseId, sequence: { gt: cursor } },
              orderBy: { sequence: 'asc' },
              take: 200,
              select: {
                sequence: true,
                eventType: true,
                actorUserId: true,
                traceId: true,
                payload: true,
                createdAt: true,
              },
            });

            for (const e of events) {
              const id = e.sequence.toString();
              cursor = e.sequence;
              const type = toRealtimeType(e.eventType);
              const body = safeJsonStringify({
                type,
                caseId,
                timestamp: e.createdAt.toISOString(),
                data: {
                  sequence: id,
                  eventType: e.eventType,
                  actorUserId: e.actorUserId,
                  traceId: e.traceId,
                  payload: e.payload,
                },
              });

              sendEvent({ id, event: type, data: body });
            }
          } catch (err) {
            logger.error({ err }, 'SSE poll failed');
          }
        };

        const pollTimer = setInterval(() => {
          void poll();
        }, 1500);

        const keepAliveTimer = setInterval(() => {
          sendKeepAlive();
        }, 15000);

        void poll();

        request.signal.addEventListener('abort', () => {
          if (closed) return;
          closed = true;
          clearInterval(pollTimer);
          clearInterval(keepAliveTimer);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'SSE handler failed');
    return ErrorResponses.INTERNAL_ERROR();
  }
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

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
