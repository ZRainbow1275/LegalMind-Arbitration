// dev/src/app/api/documents/[id]/verify/route.ts
// 证据真实性验证：支持 HASH 校验（下载对象计算 sha256）与 NOTARY（入队外部系统）
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import {
  EvidenceVerificationMethod,
  EvidenceVerificationStatus,
  type Prisma,
} from '@/generated/prisma';
import {
  createLazyObjectReadable,
  getObjectStorageConfig,
  getS3Client,
  resolveStorageLocation,
} from '@/lib/object-storage';
import { enqueueNotaryTask } from '@/lib/queue';
import { requireDocumentAccess } from '@/lib/document-guard';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ id: uuidSchema });

const verifySchema = z
  .object({
    method: z.nativeEnum(EvidenceVerificationMethod).optional(),
  })
  .strict();

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function hashReadableSha256(readable: NodeJS.ReadableStream): Promise<string> {
  const hash = crypto.createHash('sha256');
  for await (const chunk of readable) {
    hash.update(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return hash.digest('hex');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const documentId = pathValidation.data.id;

    const access = await requireDocumentAccess({ documentId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const verification = await prisma.evidenceVerification.findUnique({
      where: { documentId },
      select: {
        id: true,
        documentId: true,
        method: true,
        status: true,
        requestedByUserId: true,
        traceId: true,
        checkedAt: true,
        verifiedAt: true,
        error: true,
        details: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return createSuccessResponse({ traceId, caseId: access.document.caseId, documentId, verification }, '获取核验信息成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '获取核验信息失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const documentId = pathValidation.data.id;

    const access = await requireDocumentAccess({ documentId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const bodyValidation = await validateRequestBody(request, verifySchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const method = bodyValidation.data.method ?? EvidenceVerificationMethod.HASH;
    const now = new Date();

    await prisma.evidenceVerification.upsert({
      where: { documentId },
      create: {
        documentId,
        method,
        status: EvidenceVerificationStatus.PROCESSING,
        requestedByUserId: authUser.id,
        traceId,
        details: toPrismaJson({ requestedAt: now.toISOString() }),
      },
      update: {
        method,
        status: EvidenceVerificationStatus.PROCESSING,
        requestedByUserId: authUser.id,
        traceId,
        error: null,
        details: toPrismaJson({ requestedAt: now.toISOString() }),
      },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.EVIDENCE_VERIFICATION_REQUESTED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'evidence_verifications',
      action: 'request',
      details: { traceId, caseId: access.document.caseId, documentId, method },
      result: 'SUCCESS',
    });

    await appendCaseEvent({
      caseId: access.document.caseId,
      eventType: 'EVIDENCE_VERIFICATION_REQUESTED',
      actorUserId: authUser.id,
      traceId,
      payload: { documentId, method },
    });

    if (method === EvidenceVerificationMethod.NOTARY) {
      if (!access.document.fileHash) {
        await prisma.evidenceVerification.update({
          where: { documentId },
          data: {
            status: EvidenceVerificationStatus.FAILED,
            checkedAt: now,
            error: 'MISSING_FILE_HASH',
          },
        });
        return ErrorResponses.OPERATION_FAILED('文档缺少 fileHash，无法发起公证核验');
      }

      await enqueueNotaryTask({
        caseId: access.document.caseId,
        documentId,
        fileHash: access.document.fileHash,
        actorUserId: authUser.id,
        traceId,
      });

      return createSuccessResponse(
        { traceId, documentId, caseId: access.document.caseId, status: EvidenceVerificationStatus.PROCESSING },
        '已入队公证核验'
      );
    }

    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) {
      await prisma.evidenceVerification.update({
        where: { documentId },
        data: {
          status: EvidenceVerificationStatus.SERVICE_NOT_CONFIGURED,
          checkedAt: now,
          error: 'S3_NOT_CONFIGURED',
        },
      });
      return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');
    }

    if (!access.document.fileHash) {
      await prisma.evidenceVerification.update({
        where: { documentId },
        data: { status: EvidenceVerificationStatus.FAILED, checkedAt: now, error: 'MISSING_FILE_HASH' },
      });
      return ErrorResponses.OPERATION_FAILED('文档缺少 fileHash，无法进行 HASH 核验');
    }

    const s3 = getS3Client(storageConfig);
    const { bucket, key } = resolveStorageLocation(access.document, storageConfig.bucket);
    const readable = createLazyObjectReadable({ client: s3, bucket, key });
    const computedSha256 = await hashReadableSha256(readable);

    const ok = computedSha256.toLowerCase() === access.document.fileHash.toLowerCase();
    const status = ok ? EvidenceVerificationStatus.VERIFIED : EvidenceVerificationStatus.FAILED;
    const error = ok ? null : 'HASH_MISMATCH';

    const updated = await prisma.evidenceVerification.update({
      where: { documentId },
      data: {
        status,
        checkedAt: now,
        verifiedAt: ok ? now : null,
        error,
        details: toPrismaJson({
          method: 'HASH',
          bucket,
          key,
          expectedSha256: access.document.fileHash,
          computedSha256,
          checkedAt: now.toISOString(),
        }),
      },
      select: {
        id: true,
        documentId: true,
        method: true,
        status: true,
        checkedAt: true,
        verifiedAt: true,
        error: true,
        details: true,
      },
    });

    await AuditLogger.log({
      level: ok ? AuditLevel.INFO : AuditLevel.WARNING,
      eventType: AuditEventType.EVIDENCE_VERIFICATION_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'evidence_verifications',
      action: 'hash_check',
      details: { traceId, caseId: access.document.caseId, documentId, status },
      result: ok ? 'SUCCESS' : 'FAILURE',
      errorMessage: ok ? undefined : 'HASH_MISMATCH',
    });

    await appendCaseEvent({
      caseId: access.document.caseId,
      eventType: 'EVIDENCE_VERIFICATION_UPDATED',
      actorUserId: authUser.id,
      traceId,
      payload: { documentId, status, computedSha256, expectedSha256: access.document.fileHash },
    });

    return createSuccessResponse(updated, ok ? 'HASH 核验通过' : 'HASH 核验失败');
  } catch (error) {
    logger.error({ err: error, traceId }, '证据核验失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
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
