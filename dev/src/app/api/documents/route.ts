// dev/src/app/api/documents/route.ts
// 文档管理API端点 - 上传即证据（MinIO/S3 + SHA-256 + 队列存证 + 审计）

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validateSearchParams } from '@/lib/validation';
import { paginationSchema } from '@/lib/validation';
import { createSuccessResponse, createPaginatedResponse, ErrorResponses } from '@/lib/api-response';
import { Role } from '@/generated/prisma';
import { DocumentType } from '@/generated/prisma';
import type { Prisma } from '@/generated/prisma';
import { getEnv } from '@/lib/env-validator';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { enqueueDocumentProcessing, enqueueNotaryTask } from '@/lib/queue';
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

type DocumentProcessingMetadata = {
  ocr?: {
    status?: string;
    queuedAt?: string;
    updatedAt?: string;
    error?: string | null;
  };
  [key: string]: unknown;
};

type DocumentNotaryMetadata = {
  status?: string;
  queuedAt?: string;
  error?: string | null;
  [key: string]: unknown;
};

type DocumentMetadata = {
  storage?: { bucket?: string; key?: string };
  processing?: DocumentProcessingMetadata;
  notary?: DocumentNotaryMetadata;
  [key: string]: unknown;
};

const documentUploadFormSchema = z.object({
  caseId: z.string().uuid(),
  documentType: z
    .nativeEnum(DocumentType)
    .optional()
    .default(DocumentType.OTHER),
  category: z
    .string()
    .max(100, '文档分类不能超过100个字符')
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  description: z
    .string()
    .max(1000, '文档描述不能超过1000个字符')
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  isPublic: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true'),
});

let cachedS3Client: S3Client | null = null;
const cachedBuckets = new Set<string>();

function getObjectStorageConfig(): ObjectStorageConfig | null {
  const env = getEnv();
  if (
    !env.S3_ENDPOINT
    || !env.S3_BUCKET
    || !env.S3_ACCESS_KEY_ID
    || !env.S3_SECRET_ACCESS_KEY
  ) {
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

function isBucketNotFound(error: unknown): boolean {
  const err = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
  const metadata =
    typeof err.$metadata === 'object' && err.$metadata !== null
      ? (err.$metadata as Record<string, unknown>)
      : {};
  const status = typeof metadata.httpStatusCode === 'number' ? metadata.httpStatusCode : undefined;
  const name = typeof err.name === 'string' ? err.name : undefined;
  const code = typeof err.code === 'string' ? err.code : undefined;
  const Code = typeof err.Code === 'string' ? err.Code : undefined;
  return (
    status === 404
    || name === 'NotFound'
    || Code === 'NotFound'
    || code === 'NotFound'
    || name === 'NoSuchBucket'
    || Code === 'NoSuchBucket'
    || code === 'NoSuchBucket'
  );
}

async function ensureBucketExists(client: S3Client, bucket: string): Promise<void> {
  if (cachedBuckets.has(bucket)) return;

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (!isBucketNotFound(error)) throw error;
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }

  cachedBuckets.add(bucket);
}

function getFileExtension(fileName: string): string {
  const match = fileName.match(/(\.[^./\\]+)$/);
  return match ? match[1] : '';
}

function sanitizeObjectKeyPart(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'file';
  return trimmed
    .replace(/[\/\\]/g, '_')
    .replace(/[\r\n\t"]/g, '_')
    .replace(/[^\p{L}\p{N}._()-]+/gu, '_')
    .slice(0, 160);
}

function buildObjectKey(caseId: string, fileName: string): string {
  return `cases/${caseId}/documents/${fileName}`;
}

function buildContentDisposition(originalName: string): string {
  const fallback = sanitizeObjectKeyPart(originalName).replace(/_+/g, '_');
  const encoded = encodeURIComponent(originalName);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function canAccessDocument(
  authUser: { id: string; roles: Role[] },
  document: { uploadedBy: string; isPublic: boolean; accessLevel: string },
  caseAccess: boolean,
  canManage: boolean
): boolean {
  if (canManage) return true;
  if (document.isPublic) return true;
  if (document.uploadedBy === authUser.id) return true;

  const accessLevel = document.accessLevel || 'case_participants';
  if (accessLevel === 'case_participants') return caseAccess;
  if (accessLevel === 'uploader_only') return document.uploadedBy === authUser.id;
  if (accessLevel === 'tribunal_only') {
    return authUser.roles.includes(Role.ARBITRATOR) || authUser.roles.includes(Role.ADMIN);
  }

  // 未识别的 accessLevel：默认拒绝，避免越权
  return false;
}

function toValidationError(error: z.ZodError) {
  return ErrorResponses.VALIDATION_ERROR({
    issues: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
  });
}

/**
 * 上传文档
 * POST /api/documents
 * 需要认证，支持AI OCR识别
 */
export async function POST(request: NextRequest) {
  let uploaded: { bucket: string; key: string } | null = null;

  try {
    const traceId = getTraceId(request.headers);

    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 检查上传权限
    if (!PermissionCheckers.canUploadDocument(authUser)) {
      return ErrorResponses.FORBIDDEN();
    }

    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) {
      return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');
    }

    // 解析FormData
    const formData = await request.formData();
    const fileEntry = formData.get('file');
    if (!(fileEntry instanceof File)) {
      return ErrorResponses.BAD_REQUEST('请选择要上传的文件');
    }
    const file = fileEntry;

    const fieldsParsed = documentUploadFormSchema.safeParse({
      caseId: String(formData.get('caseId') ?? ''),
      documentType: formData.get('documentType')
        ? String(formData.get('documentType'))
        : undefined,
      category: formData.get('category') ? String(formData.get('category')) : undefined,
      description: formData.get('description') ? String(formData.get('description')) : undefined,
      isPublic: formData.get('isPublic') ? String(formData.get('isPublic')) : undefined,
    });
    if (!fieldsParsed.success) {
      return toValidationError(fieldsParsed.error);
    }

    const { caseId, documentType, category, description, isPublic } = fieldsParsed.data;

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // 验证案件存在且用户有权限（案件级 ABAC 最小落地）
    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        applicantId: true,
        respondentId: true,
        participants: {
          where: { userId: authUser.id, isActive: true },
          select: { id: true },
        },
      },
    });

    if (!arbitrationCase) {
      return ErrorResponses.NOT_FOUND('案件');
    }

    // 检查用户是否有权限上传文档到此案件
    const hasAccess =
      PermissionCheckers.canManageDocuments(authUser)
      || arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id
      || arbitrationCase.participants.length > 0;

    if (!hasAccess) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'documents',
        action: 'upload',
        details: { traceId, caseId },
        result: 'FAILURE',
        errorMessage: 'FORBIDDEN_CASE_ACCESS',
      });

      return ErrorResponses.FORBIDDEN();
    }

    const env = getEnv();
    const maxSize = typeof env.MAX_FILE_SIZE === 'number' ? env.MAX_FILE_SIZE : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return ErrorResponses.BAD_REQUEST(`文件大小不能超过${Math.floor(maxSize / 1024 / 1024)}MB`);
    }

    const allowedTypes = [
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
    ];

    if (!file.type || !allowedTypes.includes(file.type)) {
      return ErrorResponses.BAD_REQUEST('不支持的文件类型');
    }

    // 生成文件哈希（SHA-256）：作为证据链与去重基础
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 去重（全局）：避免重复证据进入链路
    const existingDocument = await prisma.caseDocument.findFirst({
      where: { fileHash },
      select: { id: true },
    });

    if (existingDocument) {
      return ErrorResponses.DUPLICATE_RESOURCE('文件已存在');
    }

    // 上传到 MinIO / S3
    const fileExtension = getFileExtension(file.name);
    const fileName = `${Date.now()}-${crypto.randomUUID()}${fileExtension}`;
    const objectKey = buildObjectKey(caseId, fileName);

    const s3 = getS3Client(storageConfig);
    try {
      await ensureBucketExists(s3, storageConfig.bucket);
    } catch (error) {
      logger.error({ err: error }, '对象存储Bucket不可用');
      return ErrorResponses.SERVICE_NOT_CONFIGURED('对象存储Bucket');
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: storageConfig.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: file.type,
        ContentDisposition: buildContentDisposition(file.name),
        ...(storageConfig.serverSideEncryption
          ? { ServerSideEncryption: storageConfig.serverSideEncryption }
          : {}),
      })
    );

    uploaded = { bucket: storageConfig.bucket, key: objectKey };

    const nowIso = new Date().toISOString();
    const needsOcr = file.type.startsWith('image/') || file.type === 'application/pdf';

    // 创建文档记录（上传即证据：hash/存储/审计/队列）
    const document = await prisma.caseDocument.create({
      data: {
        caseId,
        uploadedBy: authUser.id,
        fileName,
        originalName: file.name,
        filePath: objectKey,
        fileSize: BigInt(file.size),
        fileType: file.type,
        mimeType: file.type,
        fileHash,
        documentType,
        category,
        description,
        isPublic,
        metadata: {
          traceId,
          storage: {
            provider: 's3',
            bucket: storageConfig.bucket,
            key: objectKey,
            serverSideEncryption: storageConfig.serverSideEncryption ?? null,
          },
          integrity: {
            algorithm: 'sha256',
            sha256: fileHash,
            computedAt: nowIso,
          },
          processing: {
            ocr: needsOcr ? { status: 'QUEUED', queuedAt: nowIso } : { status: 'NOT_REQUIRED', queuedAt: nowIso },
          },
          notary: {
            status: 'QUEUED',
            queuedAt: nowIso,
          },
          externalSystemRefs: {},
          uploadInfo: {
            userAgent,
            ipAddress,
            timestamp: nowIso,
          },
        },
      },
      include: {
        uploadedByUser: {
          select: {
            profile: {
              select: {
                realName: true,
                companyName: true,
              },
            },
          },
        },
      },
    });

    await appendCaseEvent({
      caseId,
      eventType: 'DOCUMENT_UPLOADED',
      actorUserId: authUser.id,
      traceId,
      payload: {
        documentId: document.id,
        documentType,
        fileHash,
        fileName: file.name,
        fileSize: file.size,
        storageKey: objectKey,
      },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.DOCUMENT_UPLOADED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress,
      userAgent,
      resource: 'documents',
      action: 'upload',
      details: {
        traceId,
        caseId,
        documentId: document.id,
        documentType,
        fileHash,
        fileType: file.type,
        fileSize: file.size,
        storage: { bucket: storageConfig.bucket, key: objectKey },
      },
      result: 'SUCCESS',
    });

    const enqueueResults = await Promise.allSettled([
      enqueueDocumentProcessing({ documentId: document.id, traceId }),
      enqueueNotaryTask({
        caseId,
        documentId: document.id,
        fileHash,
        actorUserId: authUser.id,
        traceId,
      }),
    ]);

    const [processingResult, notaryResult] = enqueueResults;
    if (processingResult.status === 'rejected' || notaryResult.status === 'rejected') {
      const nextMetadata: DocumentMetadata =
        document.metadata && typeof document.metadata === 'object' && !Array.isArray(document.metadata)
          ? (document.metadata as DocumentMetadata)
          : {};

      if (processingResult.status === 'rejected') {
        nextMetadata.processing = nextMetadata.processing || {};
        nextMetadata.processing.ocr = {
          status: 'QUEUE_FAILED',
          queuedAt: nowIso,
          error: processingResult.reason instanceof Error ? processingResult.reason.message : String(processingResult.reason),
        };

        await AuditLogger.log({
          level: AuditLevel.ERROR,
          eventType: AuditEventType.QUEUE_JOB_FAILED,
          userId: authUser.id,
          userName: authUser.email,
          ipAddress,
          userAgent,
          resource: 'queue',
          action: 'document_processing.enqueue',
          details: {
            traceId,
            documentId: document.id,
            error: nextMetadata.processing.ocr.error,
          },
          result: 'FAILURE',
          errorMessage: nextMetadata.processing.ocr.error ?? undefined,
        });
      }

      if (notaryResult.status === 'rejected') {
        nextMetadata.notary = {
          status: 'QUEUE_FAILED',
          queuedAt: nowIso,
          error: notaryResult.reason instanceof Error ? notaryResult.reason.message : String(notaryResult.reason),
        };

        await AuditLogger.log({
          level: AuditLevel.ERROR,
          eventType: AuditEventType.QUEUE_JOB_FAILED,
          userId: authUser.id,
          userName: authUser.email,
          ipAddress,
          userAgent,
          resource: 'queue',
          action: 'notary_tasks.enqueue',
          details: {
            traceId,
            documentId: document.id,
            caseId,
            error: nextMetadata.notary.error,
          },
          result: 'FAILURE',
          errorMessage: nextMetadata.notary.error ?? undefined,
        });
      }

      let metadataJson: Prisma.InputJsonValue;
      try {
        metadataJson = JSON.parse(JSON.stringify(nextMetadata)) as Prisma.InputJsonValue;
      } catch (error) {
        logger.error({ err: error }, '文档 metadata 序列化失败');
        metadataJson = {} as Prisma.InputJsonValue;
      }

      await prisma.caseDocument.update({
        where: { id: document.id },
        data: { metadata: metadataJson },
      });
    }

    return createSuccessResponse(
      {
        document,
        traceId,
        next: {
          ocr: needsOcr ? 'queued' : 'not_required',
          notary: 'queued',
        },
      },
      '文档上传成功'
    );
  } catch (error) {
    if (uploaded) {
      try {
        const storageConfig = getObjectStorageConfig();
        if (storageConfig) {
          const s3 = getS3Client(storageConfig);
          await s3.send(new DeleteObjectCommand({ Bucket: uploaded.bucket, Key: uploaded.key }));
        }
      } catch (cleanupError) {
        logger.error({ err: cleanupError }, '上传失败后清理对象存储文件失败');
      }
    }

    logger.error({ err: error }, '文档上传失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 获取文档列表
 * GET /api/documents
 * 需要认证，支持分页和筛选
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const traceId = getTraceId(request.headers);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // 下载：返回短有效期预签名 URL（上传=证据，下载必须审计）
    const downloadId = searchParams.get('downloadId') || searchParams.get('download');
    if (downloadId) {
      const idParsed = z.string().uuid().safeParse(downloadId);
      if (!idParsed.success) {
        return ErrorResponses.BAD_REQUEST('无效的documentId');
      }

      const storageConfig = getObjectStorageConfig();
      if (!storageConfig) {
        return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');
      }

      const document = await prisma.caseDocument.findUnique({
        where: { id: idParsed.data },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
              applicantId: true,
              respondentId: true,
              participants: {
                where: { userId: authUser.id, isActive: true },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!document) {
        return ErrorResponses.NOT_FOUND('文档');
      }

      const caseAccess =
        PermissionCheckers.canManageDocuments(authUser)
        || document.case?.applicantId === authUser.id
        || document.case?.respondentId === authUser.id
        || (document.case?.participants?.length ?? 0) > 0;

      const canManage = PermissionCheckers.canManageDocuments(authUser);
      if (!document.case || !canAccessDocument(authUser, document, caseAccess, canManage)) {
        await AuditLogger.log({
          level: AuditLevel.WARNING,
          eventType: AuditEventType.PERMISSION_DENIED,
          userId: authUser.id,
          userName: authUser.email,
          ipAddress,
          userAgent,
          resource: 'documents',
          action: 'download',
          details: { traceId, documentId: document.id, caseId: document.caseId },
          result: 'FAILURE',
          errorMessage: 'FORBIDDEN_DOCUMENT_ACCESS',
        });

        return ErrorResponses.FORBIDDEN();
      }

      const metadata: DocumentMetadata =
        document.metadata && typeof document.metadata === 'object' && !Array.isArray(document.metadata)
          ? (document.metadata as DocumentMetadata)
          : {};
      const storageBucket =
        typeof metadata?.storage?.bucket === 'string'
          ? String(metadata.storage.bucket)
          : storageConfig.bucket;
      const storageKey =
        typeof metadata?.storage?.key === 'string'
          ? String(metadata.storage.key)
          : document.filePath;

      const s3 = getS3Client(storageConfig);
      const expiresIn = storageConfig.presignExpiresSeconds;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: storageBucket,
          Key: storageKey,
          ResponseContentDisposition: buildContentDisposition(document.originalName),
          ResponseContentType: document.fileType || undefined,
        }),
        { expiresIn }
      );

      await AuditLogger.log({
        level: AuditLevel.INFO,
        eventType: AuditEventType.DOCUMENT_DOWNLOADED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'documents',
        action: 'download',
        details: {
          traceId,
          caseId: document.caseId,
          documentId: document.id,
          fileHash: document.fileHash,
          storage: { bucket: storageBucket, key: storageKey },
          expiresAt,
        },
        result: 'SUCCESS',
      });

      await appendCaseEvent({
        caseId: document.caseId,
        eventType: 'DOCUMENT_DOWNLOADED',
        actorUserId: authUser.id,
        traceId,
        payload: {
          documentId: document.id,
          fileHash: document.fileHash,
          storageKey,
          expiresAt,
        },
      });

      return createSuccessResponse(
        {
          url,
          expiresInSeconds: expiresIn,
          expiresAt,
          traceId,
          document: {
            id: document.id,
            originalName: document.originalName,
            fileType: document.fileType,
            fileHash: document.fileHash,
            case: document.case ? { id: document.case.id, caseNumber: document.case.caseNumber, title: document.case.title } : null,
          },
        },
        '获取下载链接成功'
      );
    }

    // 详情：单条文档（查看必须审计）
    const documentId = searchParams.get('documentId') || searchParams.get('id');
    if (documentId) {
      const idParsed = z.string().uuid().safeParse(documentId);
      if (!idParsed.success) {
        return ErrorResponses.BAD_REQUEST('无效的documentId');
      }

      const document = await prisma.caseDocument.findUnique({
        where: { id: idParsed.data },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
              applicantId: true,
              respondentId: true,
              participants: {
                where: { userId: authUser.id, isActive: true },
                select: { id: true },
              },
            },
          },
          uploadedByUser: {
            select: {
              profile: {
                select: {
                  realName: true,
                  companyName: true,
                },
              },
            },
          },
        },
      });

      if (!document) {
        return ErrorResponses.NOT_FOUND('文档');
      }

      const caseAccess =
        PermissionCheckers.canManageDocuments(authUser)
        || document.case?.applicantId === authUser.id
        || document.case?.respondentId === authUser.id
        || (document.case?.participants?.length ?? 0) > 0;

      const canManage = PermissionCheckers.canManageDocuments(authUser);
      if (!document.case || !canAccessDocument(authUser, document, caseAccess, canManage)) {
        await AuditLogger.log({
          level: AuditLevel.WARNING,
          eventType: AuditEventType.PERMISSION_DENIED,
          userId: authUser.id,
          userName: authUser.email,
          ipAddress,
          userAgent,
          resource: 'documents',
          action: 'view',
          details: { traceId, documentId: document.id, caseId: document.caseId },
          result: 'FAILURE',
          errorMessage: 'FORBIDDEN_DOCUMENT_ACCESS',
        });

        return ErrorResponses.FORBIDDEN();
      }

      await AuditLogger.log({
        level: AuditLevel.INFO,
        eventType: AuditEventType.DOCUMENT_VIEWED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'documents',
        action: 'view',
        details: { traceId, caseId: document.caseId, documentId: document.id, fileHash: document.fileHash },
        result: 'SUCCESS',
      });

      await appendCaseEvent({
        caseId: document.caseId,
        eventType: 'DOCUMENT_VIEWED',
        actorUserId: authUser.id,
        traceId,
        payload: { documentId: document.id, fileHash: document.fileHash },
      });

      return createSuccessResponse({ document, traceId }, '获取文档成功');
    }

    const paginationValidation = validateSearchParams(searchParams, paginationSchema);
    if (!paginationValidation.success) {
      return paginationValidation.error;
    }

    const { page, limit } = paginationValidation.data;

    const caseIdParam = searchParams.get('caseId');
    const caseId = caseIdParam ? z.string().uuid().safeParse(caseIdParam) : null;
    if (caseIdParam && !caseId?.success) {
      return ErrorResponses.BAD_REQUEST('无效的caseId');
    }

    const documentTypeParam = searchParams.get('documentType');
    const documentTypeParsed = documentTypeParam
      ? z.nativeEnum(DocumentType).safeParse(documentTypeParam)
      : null;
    if (documentTypeParam && !documentTypeParsed?.success) {
      return ErrorResponses.BAD_REQUEST('无效的documentType');
    }
    const documentType = documentTypeParsed?.success ? documentTypeParsed.data : null;
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // 构建查询条件
    const where: Prisma.CaseDocumentWhereInput = {};

    // 如果指定了案件ID，验证用户权限
    if (caseId?.success) {
      const arbitrationCase = await prisma.arbitrationCase.findUnique({
        where: { id: caseId.data },
        select: {
          applicantId: true,
          respondentId: true,
          participants: {
            where: { userId: authUser.id, isActive: true },
            select: { id: true },
          },
        },
      });

      if (!arbitrationCase) {
        return ErrorResponses.NOT_FOUND('案件');
      }

      const hasAccess = PermissionCheckers.canManageDocuments(authUser) ||
        arbitrationCase.applicantId === authUser.id ||
        arbitrationCase.respondentId === authUser.id ||
        arbitrationCase.participants.length > 0;

      if (!hasAccess) {
        return ErrorResponses.FORBIDDEN();
      }

      where.caseId = caseId.data;
    } else {
      // 如果没有指定案件ID，只显示用户有权限查看的文档
      if (!PermissionCheckers.canManageDocuments(authUser)) {
        where.OR = [
          { uploadedBy: authUser.id },
          { isPublic: true },
          {
            case: {
              OR: [
                { applicantId: authUser.id },
                { respondentId: authUser.id },
                {
                  participants: {
                    some: {
                      userId: authUser.id,
                      isActive: true,
                    },
                  },
                },
              ],
            },
          },
        ];
      }
    }

    // 添加其他筛选条件
    if (documentType) {
      where.documentType = documentType;
    }
    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { originalName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 查询文档总数
    const total = await prisma.caseDocument.count({ where });

    // 查询文档列表
    const documents = await prisma.caseDocument.findMany({
      where,
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        uploadedByUser: {
          select: {
            profile: {
              select: {
                realName: true,
                companyName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 计算分页信息
    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return createPaginatedResponse(documents, pagination, '获取文档列表成功');

  } catch (error) {
    logger.error({ err: error }, '获取文档列表失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 不支持的请求方法
 */
export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function DELETE(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId') || searchParams.get('id');
    if (!documentId) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('缺少 documentId');
    }

    const idParsed = z.string().uuid().safeParse(documentId);
    if (!idParsed.success) {
      return ErrorResponses.BAD_REQUEST('无效的documentId');
    }

    const document = await prisma.caseDocument.findUnique({
      where: { id: idParsed.data },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            applicantId: true,
            respondentId: true,
            participants: {
              where: { userId: authUser.id, isActive: true },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!document) {
      return ErrorResponses.NOT_FOUND('文档');
    }

    const canManage = PermissionCheckers.canManageDocuments(authUser);
    const caseAccess =
      canManage
      || document.case?.applicantId === authUser.id
      || document.case?.respondentId === authUser.id
      || (document.case?.participants?.length ?? 0) > 0;

    const canDelete = canManage || (document.uploadedBy === authUser.id && caseAccess);

    if (!canDelete) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress,
        userAgent,
        resource: 'documents',
        action: 'delete',
        details: { traceId, documentId: document.id, caseId: document.caseId },
        result: 'FAILURE',
        errorMessage: 'FORBIDDEN_DOCUMENT_DELETE',
      });

      return ErrorResponses.FORBIDDEN();
    }

    const metadata: DocumentMetadata =
      document.metadata && typeof document.metadata === 'object' && !Array.isArray(document.metadata)
        ? (document.metadata as DocumentMetadata)
        : {};
    const storageMeta = metadata.storage || {};
    const storageBucket = storageMeta.bucket || null;
    const storageKey = storageMeta.key || null;

    const deleted = await prisma.caseDocument.delete({
      where: { id: document.id },
      select: {
        id: true,
        caseId: true,
        fileHash: true,
        originalName: true,
        filePath: true,
      },
    });

    await appendCaseEvent({
      caseId: deleted.caseId,
      eventType: 'DOCUMENT_DELETED',
      actorUserId: authUser.id,
      traceId,
      payload: {
        documentId: deleted.id,
        fileHash: deleted.fileHash,
        originalName: deleted.originalName,
      },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.DOCUMENT_DELETED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress,
      userAgent,
      resource: 'documents',
      action: 'delete',
      details: {
        traceId,
        caseId: deleted.caseId,
        documentId: deleted.id,
        fileHash: deleted.fileHash,
        storage: { bucket: storageBucket, key: storageKey },
      },
      result: 'SUCCESS',
    });

    let storageDeletion: { ok: boolean; bucket: string | null; key: string | null; error?: string } = {
      ok: true,
      bucket: storageBucket,
      key: storageKey,
    };

    if (storageBucket && storageKey) {
      const storageConfig = getObjectStorageConfig();
      if (!storageConfig) {
        storageDeletion = {
          ok: false,
          bucket: storageBucket,
          key: storageKey,
          error: 'OBJECT_STORAGE_NOT_CONFIGURED',
        };
      } else {
        try {
          const s3 = getS3Client(storageConfig);
          await s3.send(
            new DeleteObjectCommand({
              Bucket: storageBucket,
              Key: storageKey,
            })
          );
        } catch (error) {
          storageDeletion = {
            ok: false,
            bucket: storageBucket,
            key: storageKey,
            error: error instanceof Error ? error.message : String(error),
          };
          logger.error({ err: error, traceId, documentId: deleted.id }, '对象存储删除失败');
        }
      }
    }

    return createSuccessResponse(
      {
        deleted: {
          documentId: deleted.id,
          caseId: deleted.caseId,
        },
        storageDeletion,
        traceId,
      },
      '文档已删除'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '删除文档失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
