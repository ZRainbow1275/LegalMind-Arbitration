// dev/src/app/api/documents/multipart/[sessionId]/complete/route.ts
// 完成分片上传：合并对象、计算 sha256、落库 CaseDocument，并触发后续处理/存证
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { CompleteMultipartUploadCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import {
  DocumentType,
  MultipartUploadStatus,
  type Prisma,
} from '@/generated/prisma';
import {
  createLazyObjectReadable,
  getObjectStorageConfig,
  getS3Client,
} from '@/lib/object-storage';
import { enqueueDocumentProcessing, enqueueNotaryTask } from '@/lib/queue';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ sessionId: uuidSchema });

const completeSchema = z
  .object({
    parts: z
      .array(
        z
          .object({
            partNumber: z.number().int().min(1).max(10000),
            etag: z.string().min(1).max(200),
          })
          .strict()
      )
      .min(1)
      .max(10000),
  })
  .strict();

type SessionMetadata = {
  documentType?: DocumentType;
  category?: string;
  description?: string;
  isPublic?: boolean;
  traceId?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getSessionMetadata(metadata: unknown): SessionMetadata {
  if (!isPlainObject(metadata)) return {};
  const docType = metadata.documentType;
  return {
    documentType: Object.values(DocumentType).includes(docType as DocumentType) ? (docType as DocumentType) : undefined,
    category: typeof metadata.category === 'string' ? metadata.category : undefined,
    description: typeof metadata.description === 'string' ? metadata.description : undefined,
    isPublic: typeof metadata.isPublic === 'boolean' ? metadata.isPublic : undefined,
    traceId: typeof metadata.traceId === 'string' ? metadata.traceId : undefined,
  };
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    if (!PermissionCheckers.canUploadDocument(authUser)) return ErrorResponses.FORBIDDEN();

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const sessionId = pathValidation.data.sessionId;

    const bodyValidation = await validateRequestBody(request, completeSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');

    const session = await prisma.multipartUploadSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        caseId: true,
        uploadId: true,
        bucket: true,
        objectKey: true,
        fileName: true,
        originalName: true,
        contentType: true,
        fileSize: true,
        status: true,
        metadata: true,
      },
    });
    if (!session) return ErrorResponses.NOT_FOUND('上传会话');
    if (session.userId !== authUser.id) return ErrorResponses.FORBIDDEN();
    if (!session.caseId) return ErrorResponses.OPERATION_FAILED('上传会话缺少 caseId');

    if (session.status === MultipartUploadStatus.ABORTED || session.status === MultipartUploadStatus.FAILED) {
      return ErrorResponses.RESOURCE_CONFLICT('上传会话已终止');
    }

    const parts = bodyValidation.data.parts
      .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag }))
      .sort((a, b) => (a.PartNumber ?? 0) - (b.PartNumber ?? 0));

    const s3 = getS3Client(storageConfig);
    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: session.bucket,
        Key: session.objectKey,
        UploadId: session.uploadId,
        MultipartUpload: { Parts: parts },
      })
    );

    const now = new Date();
    await prisma.multipartUploadSession.update({
      where: { id: sessionId },
      data: {
        status: MultipartUploadStatus.COMPLETED,
        parts: toPrismaJson(parts),
        completedAt: now,
        error: null,
      },
    });

    const readable = createLazyObjectReadable({ client: s3, bucket: session.bucket, key: session.objectKey });
    const fileHash = await hashReadableSha256(readable);

    const existing = await prisma.caseDocument.findFirst({
      where: { fileHash },
      select: { id: true },
    });
    if (existing) {
      await s3.send(new DeleteObjectCommand({ Bucket: session.bucket, Key: session.objectKey })).catch(() => undefined);
      await prisma.multipartUploadSession.update({
        where: { id: sessionId },
        data: { status: MultipartUploadStatus.FAILED, error: 'DUPLICATE_FILE_HASH' },
      });
      return ErrorResponses.DUPLICATE_RESOURCE('文件已存在');
    }

    const metadata = getSessionMetadata(session.metadata);
    const needsOcr = session.contentType.startsWith('image/') || session.contentType === 'application/pdf';
    const nowIso = now.toISOString();

    const document = await prisma.caseDocument.create({
      data: {
        caseId: session.caseId,
        uploadedBy: authUser.id,
        fileName: session.fileName,
        originalName: session.originalName,
        filePath: session.objectKey,
        fileSize: session.fileSize,
        fileType: session.contentType,
        mimeType: session.contentType,
        fileHash,
        documentType: metadata.documentType ?? DocumentType.OTHER,
        category: metadata.category,
        description: metadata.description,
        isPublic: metadata.isPublic ?? false,
        metadata: {
          traceId,
          storage: {
            provider: 's3',
            bucket: session.bucket,
            key: session.objectKey,
            multipartSessionId: sessionId,
          },
          integrity: {
            algorithm: 'sha256',
            sha256: fileHash,
            computedAt: nowIso,
          },
          processing: { ocr: needsOcr ? { status: 'QUEUED', queuedAt: nowIso } : { status: 'NOT_REQUIRED', queuedAt: nowIso } },
          notary: { status: 'QUEUED', queuedAt: nowIso },
          uploadInfo: {
            method: 'multipart',
            userAgent: request.headers.get('user-agent') || null,
            ipAddress: request.headers.get('x-forwarded-for') || null,
            timestamp: nowIso,
          },
        },
      },
    });

    await prisma.multipartUploadSession.update({
      where: { id: sessionId },
      data: { metadata: toPrismaJson({ ...metadata, traceId, documentId: document.id, fileHash }) },
    });

    await appendCaseEvent({
      caseId: session.caseId,
      eventType: 'DOCUMENT_UPLOADED',
      actorUserId: authUser.id,
      traceId,
      payload: {
        documentId: document.id,
        documentType: document.documentType,
        fileHash,
        originalName: session.originalName,
        fileSize: session.fileSize.toString(),
        storageKey: session.objectKey,
        multipartSessionId: sessionId,
      },
    });

    await appendCaseEvent({
      caseId: session.caseId,
      eventType: 'MULTIPART_UPLOAD_COMPLETED',
      actorUserId: authUser.id,
      traceId,
      payload: { sessionId, documentId: document.id, fileHash, completedAt: nowIso },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.MULTIPART_UPLOAD_COMPLETED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'multipart_uploads',
      action: 'complete',
      details: { traceId, caseId: session.caseId, sessionId, documentId: document.id, fileHash },
      result: 'SUCCESS',
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.DOCUMENT_UPLOADED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'documents',
      action: 'upload_multipart',
      details: {
        traceId,
        caseId: session.caseId,
        documentId: document.id,
        fileHash,
        contentType: session.contentType,
        fileSize: session.fileSize.toString(),
        storage: { bucket: session.bucket, key: session.objectKey },
      },
      result: 'SUCCESS',
    });

    const enqueueResults = await Promise.allSettled([
      enqueueDocumentProcessing({ documentId: document.id, traceId }),
      enqueueNotaryTask({ caseId: session.caseId, documentId: document.id, fileHash, actorUserId: authUser.id, traceId }),
    ]);

    const failures = enqueueResults.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    if (failures.length > 0) {
      logger.warn({ traceId, failures: failures.map((f) => String(f.reason)) }, 'Multipart upload follow-up enqueue failed');
    }

    return createSuccessResponse({ traceId, document }, '分片上传已完成');
  } catch (error) {
    logger.error({ err: error, traceId }, '完成分片上传失败');
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

