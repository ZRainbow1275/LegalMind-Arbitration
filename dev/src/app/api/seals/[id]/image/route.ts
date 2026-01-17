// dev/src/app/api/seals/[id]/image/route.ts
// 获取印章图片：返回短有效期预签名 URL（禁止直接暴露对象存储凭证）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { getTraceId } from '@/lib/case-events';
import { getObjectStorageConfig, getS3Client } from '@/lib/object-storage';
import { Role } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ id: uuidSchema });

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
    const sealId = pathValidation.data.id;

    const seal = await prisma.seal.findUnique({
      where: { id: sealId },
      select: { id: true, ownerUserId: true, imageBucket: true, imageKey: true },
    });
    if (!seal) return ErrorResponses.NOT_FOUND('印章');

    const isOwner = seal.ownerUserId === authUser.id;
    const isAdmin = authUser.roles.includes(Role.ADMIN);
    if (!isOwner && !isAdmin) return ErrorResponses.FORBIDDEN();

    if (!seal.imageBucket || !seal.imageKey) {
      return ErrorResponses.OPERATION_FAILED('印章缺少图片存储信息');
    }

    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');

    const s3 = getS3Client(storageConfig);
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: seal.imageBucket, Key: seal.imageKey }),
      { expiresIn: storageConfig.presignExpiresSeconds }
    );

    return createSuccessResponse({ traceId, sealId, url }, '获取印章图片成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '获取印章图片失败');
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

