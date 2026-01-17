// dev/src/lib/case-events.ts
// 业务事件（CaseEvent）：用于全过程留痕与可回放

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';

function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v));
}

export type AppendCaseEventInput = {
  caseId: string;
  eventType: string;
  actorUserId?: string | null;
  traceId?: string | null;
  payload: unknown;
  createdAt?: Date;
};

type CaseEventClient = Pick<typeof prisma, 'caseEvent'>;

export async function appendCaseEvent(input: AppendCaseEventInput, client: CaseEventClient = prisma) {
  const createdAt = input.createdAt ?? new Date();
  const last = await client.caseEvent.findFirst({
    where: { caseId: input.caseId },
    orderBy: { sequence: 'desc' },
    select: { hash: true },
  });

  const prevHash = last?.hash ?? '';
  const material = safeJsonStringify({
    caseId: input.caseId,
    eventType: input.eventType,
    actorUserId: input.actorUserId ?? null,
    traceId: input.traceId ?? null,
    createdAt: createdAt.toISOString(),
    payload: input.payload,
    prevHash,
  });

  const hash = crypto.createHash('sha256').update(material).digest('hex');

  return client.caseEvent.create({
    data: {
      caseId: input.caseId,
      eventType: input.eventType,
      actorUserId: input.actorUserId ?? null,
      traceId: input.traceId ?? null,
      payload: input.payload as Prisma.InputJsonValue,
      hash,
      createdAt,
    },
  });
}

export function getTraceId(headers: Headers): string {
  return headers.get('x-trace-id') || headers.get('x-request-id') || crypto.randomUUID();
}
