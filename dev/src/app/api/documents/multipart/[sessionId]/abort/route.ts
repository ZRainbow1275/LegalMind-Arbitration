// dev/src/app/api/documents/multipart/[sessionId]/abort/route.ts
// 终止分片上传：调用对象存储 AbortMultipartUpload，并标记会话为 ABORTED
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { MultipartUploadStatus } from '@/generated/prisma';
import { getObjectStorageConfig, getS3Client } from '@/lib/object-storage';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ sessionId: uuidSchema });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const sessionId = pathValidation.data.sessionId;

    const session = await prisma.multipartUploadSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, caseId: true, uploadId: true, bucket: true, objectKey: true, status: true },
    });
    if (!session) return ErrorResponses.NOT_FOUND('上传会话');
    if (session.userId !== authUser.id) return ErrorResponses.FORBIDDEN();

    if (session.status === MultipartUploadStatus.COMPLETED) {
      return ErrorResponses.RESOURCE_CONFLICT('上传会话已完成，无法终止');
    }
    if (session.status === MultipartUploadStatus.ABORTED) {
      return createSuccessResponse({ traceId, sessionId, status: MultipartUploadStatus.ABORTED }, '上传会话已终止');
    }

    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');

    const s3 = getS3Client(storageConfig);
    await s3
      .send(
        new AbortMultipartUploadCommand({
          Bucket: session.bucket,
          Key: session.objectKey,
          UploadId: session.uploadId,
        })
      )
      .catch(() => undefined);

    await prisma.multipartUploadSession.update({
      where: { id: sessionId },
      data: { status: MultipartUploadStatus.ABORTED, error: 'ABORTED_BY_USER' },
    });

    if (session.caseId) {
      await appendCaseEvent({
        caseId: session.caseId,
        eventType: 'MULTIPART_UPLOAD_ABORTED',
        actorUserId: authUser.id,
        traceId,
        payload: { sessionId, bucket: session.bucket, objectKey: session.objectKey },
      });
    }

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.MULTIPART_UPLOAD_ABORTED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'multipart_uploads',
      action: 'abort',
      details: { traceId, caseId: session.caseId, sessionId, bucket: session.bucket, objectKey: session.objectKey },
      result: 'SUCCESS',
    });

    return createSuccessResponse({ traceId, sessionId, status: MultipartUploadStatus.ABORTED }, '上传会话已终止');
  } catch (error) {
    logger.error({ err: error, traceId }, '终止分片上传失败');
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

