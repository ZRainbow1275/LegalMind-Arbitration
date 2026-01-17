// dev/src/app/api/cases/[id]/archive/download/route.ts
// 归档包下载：返回 presigned URL（受控下载）并记录审计与案件事件
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validatePathParams, validateSearchParams, uuidSchema } from '@/lib/validation';
import { ErrorResponses } from '@/lib/api-response';
import { getObjectStorageConfig, getS3Client } from '@/lib/object-storage';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';
import { ArchiveStatus } from '@/generated/prisma';
import { z } from 'zod';

const querySchema = z.object({
  archiveId: z.string().uuid().optional(),
});

function buildContentDispositionAttachment(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
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

    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    const { searchParams } = new URL(request.url);
    const queryValidation = validateSearchParams(searchParams, querySchema);
    if (!queryValidation.success) return queryValidation.error;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        title: true,
        applicantId: true,
        respondentId: true,
        participants: { where: { userId: authUser.id, isActive: true }, select: { id: true } },
      },
    });
    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser)
      || arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id
      || arbitrationCase.participants.length > 0;

    if (!hasAccess) return ErrorResponses.FORBIDDEN();

    const archivePackage = queryValidation.data.archiveId
      ? await prisma.archivePackage.findFirst({
          where: { id: queryValidation.data.archiveId, caseId, status: ArchiveStatus.COMPLETED },
        })
      : await prisma.archivePackage.findFirst({
          where: { caseId, status: ArchiveStatus.COMPLETED },
          orderBy: { createdAt: 'desc' },
        });

    if (!archivePackage) return ErrorResponses.NOT_FOUND('归档包');
    if (!archivePackage.bucket || !archivePackage.objectKey) {
      return ErrorResponses.OPERATION_FAILED('归档包尚未完成或缺少对象存储定位信息');
    }

    const s3: S3Client = getS3Client(storageConfig);
    const expiresIn = storageConfig.presignExpiresSeconds;
    const filename =
      archivePackage.fileName
      || `archive_${arbitrationCase.caseNumber}_${archivePackage.id}.zip`;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: archivePackage.bucket,
        Key: archivePackage.objectKey,
        ResponseContentDisposition: buildContentDispositionAttachment(filename),
        ResponseContentType: archivePackage.contentType || 'application/zip',
      }),
      { expiresIn }
    );

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.ARCHIVE_PACKAGE_DOWNLOADED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'archive_packages',
      action: 'download',
      details: {
        traceId,
        caseId,
        caseNumber: arbitrationCase.caseNumber,
        archivePackageId: archivePackage.id,
        bucket: archivePackage.bucket,
        objectKey: archivePackage.objectKey,
        expiresAt,
      },
      result: 'SUCCESS',
    });

    await appendCaseEvent({
      caseId,
      eventType: 'ARCHIVE_PACKAGE_DOWNLOADED',
      actorUserId: authUser.id,
      traceId,
      payload: {
        archivePackageId: archivePackage.id,
        bucket: archivePackage.bucket,
        objectKey: archivePackage.objectKey,
        expiresAt,
      },
    });

    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    logger.error({ err: error, traceId }, '归档包下载失败');
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

