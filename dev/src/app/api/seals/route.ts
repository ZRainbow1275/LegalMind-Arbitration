// dev/src/app/api/seals/route.ts
// 电子印章：创建/列出用户印章（图片存储在 MinIO/S3，并记录 sha256）
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getTraceId } from '@/lib/case-events';
import { getObjectStorageConfig, getS3Client } from '@/lib/object-storage';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

const createSealSchema = z
  .object({
    name: z.string().min(1).max(200),
  })
  .strict();

function getFileExtension(fileName: string): string {
  const match = fileName.match(/(\.[^./\\]+)$/);
  return match ? match[1] : '';
}

function buildObjectKey(userId: string, fileName: string): string {
  return `seals/${userId}/${fileName}`;
}

export async function GET(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const seals = await prisma.seal.findMany({
      where: { ownerUserId: authUser.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        imageBucket: true,
        imageKey: true,
        imageSha256: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return createSuccessResponse({ traceId, seals }, '获取印章列表成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '获取印章列表失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');

    const formData = await request.formData();
    const fileEntry = formData.get('image');
    if (!(fileEntry instanceof File)) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('请提供印章图片（字段名 image）');
    }
    const file = fileEntry;

    const parsed = createSealSchema.safeParse({ name: String(formData.get('name') ?? '') });
    if (!parsed.success) {
      return ErrorResponses.VALIDATION_ERROR({
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    }

    const allowedTypes = ['image/png', 'image/jpeg'];
    if (!file.type || !allowedTypes.includes(file.type)) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('仅支持 PNG/JPEG 格式的印章图片');
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('印章图片大小不能超过 5MB');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const fileExtension = getFileExtension(file.name) || (file.type === 'image/png' ? '.png' : '.jpg');
    const fileName = `${Date.now()}-${crypto.randomUUID()}${fileExtension}`;
    const objectKey = buildObjectKey(authUser.id, fileName);

    const s3 = getS3Client(storageConfig);
    await s3.send(
      new PutObjectCommand({
        Bucket: storageConfig.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const created = await prisma.seal.create({
      data: {
        ownerUserId: authUser.id,
        name: parsed.data.name,
        imageBucket: storageConfig.bucket,
        imageKey: objectKey,
        imageSha256: sha256,
        metadata: { traceId, originalName: file.name, contentType: file.type, size: file.size },
      },
      select: {
        id: true,
        name: true,
        status: true,
        imageBucket: true,
        imageKey: true,
        imageSha256: true,
        createdAt: true,
      },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.SEAL_CREATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'seals',
      action: 'create',
      details: { traceId, sealId: created.id, imageKey: created.imageKey, sha256 },
      result: 'SUCCESS',
    });

    return createSuccessResponse(created, '印章已创建');
  } catch (error) {
    logger.error({ err: error, traceId }, '创建印章失败');
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

