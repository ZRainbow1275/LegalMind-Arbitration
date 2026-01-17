// dev/src/app/api/documents/[id]/download/route.ts
// 文档下载：用于 Prototype 文档节点 downloadUrl
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { getEnv } from '@/lib/env-validator';
import { getTraceId, appendCaseEvent } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

type ObjectStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  presignExpiresSeconds: number;
  serverSideEncryption?: 'AES256' | 'aws:kms';
};

type DocumentMetadata = {
  storage?: { bucket?: string; key?: string };
  [key: string]: unknown;
};

let cachedS3Client: S3Client | null = null;

function getObjectStorageConfig(): ObjectStorageConfig | null {
  const env = getEnv();
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    return null;
  }

  return {
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    presignExpiresSeconds: env.S3_PRESIGNED_URL_EXPIRES_SECONDS,
    serverSideEncryption: env.S3_SERVER_SIDE_ENCRYPTION,
  };
}

function getS3Client(config: ObjectStorageConfig): S3Client {
  if (cachedS3Client) return cachedS3Client;
  cachedS3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return cachedS3Client;
}

function buildContentDispositionAttachment(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function resolveStorageLocation(document: { filePath: string; metadata: unknown }, config: ObjectStorageConfig) {
  const metadata: DocumentMetadata =
    document.metadata && typeof document.metadata === 'object' && !Array.isArray(document.metadata)
      ? (document.metadata as DocumentMetadata)
      : {};

  const bucket =
    typeof metadata?.storage?.bucket === 'string' ? String(metadata.storage.bucket) : config.bucket;
  const key = typeof metadata?.storage?.key === 'string' ? String(metadata.storage.key) : document.filePath;

  return { bucket, key };
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
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: documentId } = pathValidation.data;

    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');

    const document = await prisma.caseDocument.findUnique({
      where: { id: documentId },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            applicantId: true,
            respondentId: true,
            participants: { where: { userId: authUser.id, isActive: true }, select: { id: true } },
          },
        },
      },
    });
    if (!document) return ErrorResponses.NOT_FOUND('文档');

    const caseAccess =
      PermissionCheckers.canManageDocuments(authUser)
      || document.case?.applicantId === authUser.id
      || document.case?.respondentId === authUser.id
      || (document.case?.participants?.length ?? 0) > 0;

    const canManage = PermissionCheckers.canManageDocuments(authUser);
    const canAccess =
      caseAccess
      || document.uploadedBy === authUser.id
      || (document.isPublic && canManage);

    if (!document.case || !canAccess) return ErrorResponses.FORBIDDEN();

    const { bucket, key } = resolveStorageLocation(document, storageConfig);
    const s3 = getS3Client(storageConfig);
    const expiresIn = storageConfig.presignExpiresSeconds;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: buildContentDispositionAttachment(document.originalName),
        ResponseContentType: document.fileType || undefined,
      }),
      { expiresIn }
    );

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.DOCUMENT_DOWNLOADED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'documents',
      action: 'download',
      details: { traceId, documentId: document.id, caseId: document.caseId, bucket, key, expiresAt },
      result: 'SUCCESS',
    });

    await appendCaseEvent({
      caseId: document.caseId,
      eventType: 'DOCUMENT_DOWNLOADED',
      actorUserId: authUser.id,
      traceId,
      payload: { documentId: document.id, fileHash: document.fileHash, bucket, key, expiresAt },
    });

    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    logger.error({ err: error, traceId }, '文档下载失败');
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

