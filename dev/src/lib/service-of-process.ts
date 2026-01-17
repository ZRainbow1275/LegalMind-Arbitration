import type { ArchivePackage, ServiceAttempt, ServiceOfProcess } from '@/generated/prisma';
import { HashUtil } from '@/lib/security/encryption';
import { getEnv } from '@/lib/env-validator';
import { stableJsonStringify } from '@/lib/manifest';

export type ServiceProofPayload = {
  version: '1.0';
  type: 'SERVICE_OF_PROCESS_PROOF';
  generatedAt: string;
  service: {
    id: string;
    caseId: string;
    documentId: string | null;
    channel: ServiceOfProcess['channel'];
    status: ServiceOfProcess['status'];
    recipientName: string | null;
    recipientEmail: string | null;
    recipientPhone: string | null;
    subject: string;
    message: string | null;
    legalBasis: string | null;
    requestedByUserId: string | null;
    traceId: string | null;
    createdAt: string;
    updatedAt: string;
    deliveredAt: string | null;
    effectiveAt: string | null;
    lastError: string | null;
  };
  attempts: Array<{
    id: string;
    attemptNumber: number;
    channel: ServiceAttempt['channel'];
    status: ServiceAttempt['status'];
    provider: string | null;
    providerMessageId: string | null;
    startedAt: string;
    finishedAt: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  }>;
};

export function buildServiceProof(params: {
  service: ServiceOfProcess;
  attempts: ServiceAttempt[];
  generatedAt?: Date;
}): { payload: ServiceProofPayload; proofHash: string; signature: string } {
  const generatedAt = params.generatedAt ?? new Date();
  const payload: ServiceProofPayload = {
    version: '1.0',
    type: 'SERVICE_OF_PROCESS_PROOF',
    generatedAt: generatedAt.toISOString(),
    service: {
      id: params.service.id,
      caseId: params.service.caseId,
      documentId: params.service.documentId ?? null,
      channel: params.service.channel,
      status: params.service.status,
      recipientName: params.service.recipientName ?? null,
      recipientEmail: params.service.recipientEmail ?? null,
      recipientPhone: params.service.recipientPhone ?? null,
      subject: params.service.subject,
      message: params.service.message ?? null,
      legalBasis: params.service.legalBasis ?? null,
      requestedByUserId: params.service.requestedByUserId ?? null,
      traceId: params.service.traceId ?? null,
      createdAt: params.service.createdAt.toISOString(),
      updatedAt: params.service.updatedAt.toISOString(),
      deliveredAt: params.service.deliveredAt ? params.service.deliveredAt.toISOString() : null,
      effectiveAt: params.service.effectiveAt ? params.service.effectiveAt.toISOString() : null,
      lastError: params.service.lastError ?? null,
    },
    attempts: params.attempts
      .slice()
      .sort((a, b) => a.attemptNumber - b.attemptNumber)
      .map((attempt) => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        channel: attempt.channel,
        status: attempt.status,
        provider: attempt.provider ?? null,
        providerMessageId: attempt.providerMessageId ?? null,
        startedAt: attempt.startedAt.toISOString(),
        finishedAt: attempt.finishedAt ? attempt.finishedAt.toISOString() : null,
        errorCode: attempt.errorCode ?? null,
        errorMessage: attempt.errorMessage ?? null,
      })),
  };

  const canonical = stableJsonStringify(payload);
  const proofHash = HashUtil.sha256(canonical);
  const env = getEnv();
  const signature = HashUtil.hmac(`${proofHash}.${payload.generatedAt}`, env.AUDIT_LOG_SECRET);

  return { payload, proofHash, signature };
}

export type ArchiveManifestPayload = {
  version: '1.0';
  type: 'CASE_ARCHIVE_MANIFEST';
  generatedAt: string;
  archive: {
    id: string;
    caseId: string;
    status: ArchivePackage['status'];
    createdByUserId: string | null;
    traceId: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
  };
  caseSnapshot: unknown;
  documents: unknown[];
  caseEvents: unknown[];
};

