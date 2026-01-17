// dev/src/app/api/documents/multipart/initiate/route.ts
// 100MB+ 上传：初始化对象存储 multipart 会话（返回 sessionId + uploadId）
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { DocumentType, MultipartUploadStatus, type Prisma } from '@/generated/prisma';
import { getObjectStorageConfig, getS3Client } from '@/lib/object-storage';
import { logger } from '@/lib/logger';

const initiateSchema = z
  .object({
    caseId: uuidSchema,
    originalName: z.string().min(1).max(255),
    contentType: z.string().min(1).max(100),
    fileSize: z.number().int().positive().max(5 * 1024 * 1024 * 1024),
    documentType: z.nativeEnum(DocumentType).optional().default(DocumentType.OTHER),
    category: z
      .string()
      .max(100)
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
    description: z
      .string()
      .max(1000)
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
    isPublic: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => v === true || v === 'true'),
  })
  .strict();

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getFileExtension(fileName: string): string {
  const match = fileName.match(/(\.[^./\\]+)$/);
  return match ? match[1] : '';
}

function buildObjectKey(caseId: string, fileName: string): string {
  return `cases/${caseId}/documents/${fileName}`;
}

function buildContentDisposition(originalName: string): string {
  const encoded = encodeURIComponent(originalName);
  return `attachment; filename*=UTF-8''${encoded}`;
}

const allowedTypes = new Set<string>([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/zip',
  'application/x-zip-compressed',
]);

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    if (!PermissionCheckers.canUploadDocument(authUser)) return ErrorResponses.FORBIDDEN();

    const validation = await validateRequestBody(request, initiateSchema);
    if (!validation.success) return validation.error;

    const { caseId, originalName, contentType, fileSize, documentType, category, description, isPublic } =
      validation.data;

    if (!allowedTypes.has(contentType)) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('不支持的文件类型');
    }

    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        applicantId: true,
        respondentId: true,
        participants: { where: { userId: authUser.id, isActive: true }, select: { id: true } },
      },
    });
    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const hasAccess =
      PermissionCheckers.canManageDocuments(authUser)
      || arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id
      || arbitrationCase.participants.length > 0;
    if (!hasAccess) return ErrorResponses.FORBIDDEN_MESSAGE('无权向该案件上传文件');

    const fileExtension = getFileExtension(originalName);
    const fileName = `${Date.now()}-${crypto.randomUUID()}${fileExtension}`;
    const objectKey = buildObjectKey(caseId, fileName);

    const s3 = getS3Client(storageConfig);
    const createResult = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: storageConfig.bucket,
        Key: objectKey,
        ContentType: contentType,
        ContentDisposition: buildContentDisposition(originalName),
        ...(storageConfig.serverSideEncryption ? { ServerSideEncryption: storageConfig.serverSideEncryption } : {}),
      })
    );

    if (!createResult.UploadId) {
      return ErrorResponses.INTERNAL_ERROR();
    }

    const session = await prisma.multipartUploadSession.create({
      data: {
        userId: authUser.id,
        caseId,
        uploadId: createResult.UploadId,
        bucket: storageConfig.bucket,
        objectKey,
        fileName,
        originalName,
        contentType,
        fileSize: BigInt(fileSize),
        status: MultipartUploadStatus.INITIATED,
        metadata: toPrismaJson({ traceId, documentType, category, description, isPublic }),
      },
      select: { id: true, uploadId: true, bucket: true, objectKey: true, status: true, createdAt: true },
    });

    await appendCaseEvent({
      caseId,
      eventType: 'MULTIPART_UPLOAD_INITIATED',
      actorUserId: authUser.id,
      traceId,
      payload: { sessionId: session.id, uploadId: session.uploadId, bucket: session.bucket, objectKey: session.objectKey },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.MULTIPART_UPLOAD_INITIATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'multipart_uploads',
      action: 'initiate',
      details: { traceId, caseId, sessionId: session.id, bucket: session.bucket, objectKey: session.objectKey },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        traceId,
        sessionId: session.id,
        uploadId: session.uploadId,
        bucket: session.bucket,
        objectKey: session.objectKey,
        status: session.status,
        minPartSizeBytes: 5 * 1024 * 1024,
        recommendedPartSizeBytes: 10 * 1024 * 1024,
        expiresInSeconds: storageConfig.presignExpiresSeconds,
      },
      '已初始化分片上传'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '初始化分片上传失败');
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

