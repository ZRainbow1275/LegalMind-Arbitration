// dev/src/app/api/documents/multipart/[sessionId]/part-url/route.ts
// 获取分片上传 URL：返回 UploadPart 的预签名 URL（前端直接 PUT 到对象存储）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema, validateSearchParams } from '@/lib/validation';
import { getTraceId } from '@/lib/case-events';
import { MultipartUploadStatus } from '@/generated/prisma';
import { getObjectStorageConfig, getS3Client } from '@/lib/object-storage';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ sessionId: uuidSchema });

const querySchema = z.object({
  partNumber: z
    .string()
    .transform((v) => Number(v))
    .refine((n) => Number.isInteger(n) && n >= 1 && n <= 10000, 'partNumber 必须在 1..10000 之间'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const sessionId = pathValidation.data.sessionId;

    const url = new URL(request.url);
    const queryValidation = validateSearchParams(url.searchParams, querySchema);
    if (!queryValidation.success) return queryValidation.error;
    const partNumber = queryValidation.data.partNumber;

    const session = await prisma.multipartUploadSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        caseId: true,
        uploadId: true,
        bucket: true,
        objectKey: true,
        status: true,
      },
    });
    if (!session) return ErrorResponses.NOT_FOUND('上传会话');
    if (session.userId !== authUser.id) return ErrorResponses.FORBIDDEN();
    if (session.status === MultipartUploadStatus.ABORTED || session.status === MultipartUploadStatus.FAILED) {
      return ErrorResponses.RESOURCE_CONFLICT('上传会话已终止');
    }

    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');

    const s3 = getS3Client(storageConfig);
    const presignedUrl = await getSignedUrl(
      s3,
      new UploadPartCommand({
        Bucket: session.bucket,
        Key: session.objectKey,
        UploadId: session.uploadId,
        PartNumber: partNumber,
      }),
      { expiresIn: storageConfig.presignExpiresSeconds }
    );

    if (session.status === MultipartUploadStatus.INITIATED) {
      await prisma.multipartUploadSession.update({
        where: { id: sessionId },
        data: { status: MultipartUploadStatus.UPLOADING },
      });
    }

    return createSuccessResponse(
      { traceId, sessionId, partNumber, url: presignedUrl, expiresInSeconds: storageConfig.presignExpiresSeconds },
      '获取分片上传 URL 成功'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '获取分片上传 URL 失败');
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

