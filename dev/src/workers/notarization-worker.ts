import { z } from 'zod';
import { EvidenceVerificationMethod, EvidenceVerificationStatus, type Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { appendCaseEvent } from '@/lib/case-events';
import { getExternalSystemManager } from '@/lib/external-systems';
import { logger } from '@/lib/logger';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';

type MutableJsonObject = Record<string, unknown>;

function asJsonObject(value: unknown): MutableJsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as MutableJsonObject;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function upsertEvidenceVerification(params: {
  documentId: string;
  status: EvidenceVerificationStatus;
  traceId: string;
  requestedByUserId?: string;
  checkedAt?: Date;
  verifiedAt?: Date | null;
  error?: string | null;
  details?: unknown;
}) {
  await prisma.evidenceVerification.upsert({
    where: { documentId: params.documentId },
    create: {
      documentId: params.documentId,
      method: EvidenceVerificationMethod.NOTARY,
      status: params.status,
      requestedByUserId: params.requestedByUserId,
      traceId: params.traceId,
      checkedAt: params.checkedAt,
      verifiedAt: params.verifiedAt ?? null,
      error: params.error ?? null,
      details: typeof params.details === 'undefined' ? undefined : toPrismaJson(params.details),
    },
    update: {
      method: EvidenceVerificationMethod.NOTARY,
      status: params.status,
      requestedByUserId: params.requestedByUserId,
      traceId: params.traceId,
      checkedAt: params.checkedAt,
      verifiedAt: params.verifiedAt ?? null,
      error: params.error ?? null,
      details: typeof params.details === 'undefined' ? undefined : toPrismaJson(params.details),
    },
  });
}

export const notaryTaskPayloadSchema = z
  .object({
    caseId: z.string().uuid(),
    documentId: z.string().uuid(),
    fileHash: z.string().regex(/^[a-f0-9]{64}$/i),
    actorUserId: z.string().uuid().optional(),
    traceId: z.string().min(1),
  })
  .strict();

export type NotaryTaskPayload = z.infer<typeof notaryTaskPayloadSchema>;

type NotaryTaskResult =
  | { ok: true; skipped: true; reason: 'NOT_FOUND' | 'CASE_MISMATCH' | 'HASH_MISMATCH' }
  | { ok: true; submitted: true }
  | { ok: true; completed: true }
  | { ok: true; failed: true; errorCode: string; error?: string };

export async function processNotaryTask(payload: NotaryTaskPayload): Promise<NotaryTaskResult> {
  const now = new Date();
  const nowIso = now.toISOString();

  const doc = await prisma.caseDocument.findUnique({
    where: { id: payload.documentId },
    select: { id: true, caseId: true, metadata: true, fileHash: true },
  });
  if (!doc) return { ok: true, skipped: true, reason: 'NOT_FOUND' };

  if (doc.caseId !== payload.caseId) {
    return { ok: true, skipped: true, reason: 'CASE_MISMATCH' };
  }

  if (doc.fileHash && doc.fileHash !== payload.fileHash) {
    await appendCaseEvent({
      caseId: payload.caseId,
      eventType: 'EVIDENCE_HASH_MISMATCH',
      actorUserId: payload.actorUserId ?? null,
      traceId: payload.traceId,
      payload: {
        documentId: payload.documentId,
        expectedHash: doc.fileHash,
        receivedHash: payload.fileHash,
      },
    }).catch(() => undefined);

    await prisma.caseDocument.update({
      where: { id: payload.documentId },
      data: {
        metadata: toPrismaJson({
          ...asJsonObject(doc.metadata),
          notary: {
            ...asJsonObject(asJsonObject(doc.metadata).notary),
            status: 'HASH_MISMATCH',
            updatedAt: nowIso,
            fileHash: payload.fileHash,
            expectedHash: doc.fileHash,
          },
        }),
      },
    });

    await upsertEvidenceVerification({
      documentId: payload.documentId,
      status: EvidenceVerificationStatus.FAILED,
      traceId: payload.traceId,
      requestedByUserId: payload.actorUserId,
      checkedAt: now,
      verifiedAt: null,
      error: 'HASH_MISMATCH',
      details: {
        method: 'NOTARY',
        expectedHash: doc.fileHash,
        receivedHash: payload.fileHash,
        at: nowIso,
      },
    }).catch(() => undefined);

    return { ok: true, skipped: true, reason: 'HASH_MISMATCH' };
  }

  const metadata = asJsonObject(doc.metadata);
  const notaryMeta = asJsonObject(metadata.notary);
  const existingStatus = typeof notaryMeta.status === 'string' ? notaryMeta.status : null;
  if (existingStatus === 'COMPLETED') return { ok: true, completed: true };

  await appendCaseEvent({
    caseId: payload.caseId,
    eventType: 'EVIDENCE_HASH_COMMITTED',
    actorUserId: payload.actorUserId ?? null,
    traceId: payload.traceId,
    payload: {
      documentId: payload.documentId,
      fileHash: payload.fileHash,
    },
  });

  await prisma.caseDocument.update({
    where: { id: payload.documentId },
    data: {
      metadata: toPrismaJson({
        ...metadata,
        notary: {
          ...notaryMeta,
          status: 'PROCESSING',
          queuedAt: typeof notaryMeta.queuedAt === 'string' ? notaryMeta.queuedAt : nowIso,
          startedAt: nowIso,
          fileHash: payload.fileHash,
        },
      }),
    },
  });

  await upsertEvidenceVerification({
    documentId: payload.documentId,
    status: EvidenceVerificationStatus.PROCESSING,
    traceId: payload.traceId,
    requestedByUserId: payload.actorUserId,
    checkedAt: now,
    verifiedAt: null,
    error: null,
    details: { method: 'NOTARY', status: 'PROCESSING', at: nowIso },
  }).catch(() => undefined);

  const manager = getExternalSystemManager();
  const response = await manager.integrateNotarySystem('apply_notarization', {
    caseId: payload.caseId,
    documentId: payload.documentId,
    parameters: {
      fileHash: payload.fileHash,
    },
  });

  await AuditLogger.log({
    level: response.success ? AuditLevel.INFO : AuditLevel.ERROR,
    eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
    userId: payload.actorUserId ?? undefined,
    resource: 'notary',
    action: 'apply_notarization',
    details: {
      traceId: payload.traceId,
      caseId: payload.caseId,
      documentId: payload.documentId,
      success: response.success,
      errorCode: response.success ? null : response.errorCode ?? null,
      systemInfo: response.systemInfo ?? null,
    },
    result: response.success ? 'SUCCESS' : 'FAILURE',
    errorMessage: response.success ? undefined : response.error ?? undefined,
  }).catch(() => undefined);

  if (!response.success) {
    const errorCode = response.errorCode ?? 'UPSTREAM_ERROR';
    const error = response.error ?? 'NOTARY_REQUEST_FAILED';

    await prisma.caseDocument.update({
      where: { id: payload.documentId },
      data: {
        metadata: toPrismaJson({
          ...metadata,
          notary: {
            ...notaryMeta,
            status: errorCode,
            updatedAt: nowIso,
            fileHash: payload.fileHash,
            error,
            systemInfo: response.systemInfo ?? null,
          },
        }),
      },
    });

    await appendCaseEvent({
      caseId: payload.caseId,
      eventType: 'NOTARY_REQUEST_FAILED',
      actorUserId: payload.actorUserId ?? null,
      traceId: payload.traceId,
      payload: {
        documentId: payload.documentId,
        errorCode,
        error,
        systemInfo: response.systemInfo ?? null,
      },
    }).catch(() => undefined);

    logger.warn(
      {
        traceId: payload.traceId,
        caseId: payload.caseId,
        documentId: payload.documentId,
        errorCode,
      },
      'Notary integration failed'
    );

    await upsertEvidenceVerification({
      documentId: payload.documentId,
      status: EvidenceVerificationStatus.FAILED,
      traceId: payload.traceId,
      requestedByUserId: payload.actorUserId,
      checkedAt: now,
      verifiedAt: null,
      error: errorCode,
      details: { method: 'NOTARY', errorCode, error, systemInfo: response.systemInfo ?? null },
    }).catch(() => undefined);

    return { ok: true, failed: true, errorCode, error };
  }

  await prisma.caseDocument.update({
    where: { id: payload.documentId },
    data: {
      metadata: toPrismaJson({
        ...metadata,
        notary: {
          ...notaryMeta,
          status: 'SUBMITTED',
          updatedAt: nowIso,
          fileHash: payload.fileHash,
          external: response.data,
          systemInfo: response.systemInfo ?? null,
        },
      }),
    },
  });

  await appendCaseEvent({
    caseId: payload.caseId,
    eventType: 'NOTARY_REQUEST_SUBMITTED',
    actorUserId: payload.actorUserId ?? null,
    traceId: payload.traceId,
    payload: {
      documentId: payload.documentId,
      notary: response.data,
      systemInfo: response.systemInfo ?? null,
    },
  }).catch(() => undefined);

  await upsertEvidenceVerification({
    documentId: payload.documentId,
    status: EvidenceVerificationStatus.VERIFIED,
    traceId: payload.traceId,
    requestedByUserId: payload.actorUserId,
    checkedAt: now,
    verifiedAt: now,
    error: null,
    details: { method: 'NOTARY', status: 'SUBMITTED', notary: response.data, systemInfo: response.systemInfo ?? null },
  }).catch(() => undefined);

  return { ok: true, submitted: true };
}
