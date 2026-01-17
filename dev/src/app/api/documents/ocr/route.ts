// dev/src/app/api/documents/ocr/route.ts
// OCR 识别：对齐 docs/API_REFERENCE.md 的 POST /api/documents/ocr
//
// 注意：
// - 支持图片/PDF；对 Office 等格式显式失败，避免“假成功”。
// - 真实 OCR 依赖第三方服务；未配置或未实现时返回可审计的失败响应。
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validateRequestBody } from '@/lib/validation';
import { getAIServiceManager } from '@/lib/ai-services';
import { getTraceId, appendCaseEvent } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';
import {
  getObjectBuffer,
  getObjectStorageConfig,
  getS3Client,
  resolveStorageLocation,
} from '@/lib/object-storage';

const ocrSchema = z.object({
  documentId: z.string().uuid(),
  ocrType: z.enum(['id_card', 'business_license', 'contract']),
});

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const validation = await validateRequestBody(request, ocrSchema);
    if (!validation.success) return validation.error;

    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) return ErrorResponses.SERVICE_NOT_CONFIGURED('MinIO/S3对象存储');

    const document = await prisma.caseDocument.findUnique({
      where: { id: validation.data.documentId },
      include: {
        case: {
          select: {
            id: true,
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

    const fileType = document.fileType.toLowerCase();
    const mimeType = (document.mimeType ?? '').toLowerCase();
    const ocrSupported = fileType.startsWith('image/')
      || fileType === 'application/pdf'
      || mimeType.startsWith('image/')
      || mimeType === 'application/pdf';
    if (!ocrSupported) {
      return ErrorResponses.BAD_REQUEST_MESSAGE(
        '当前仅支持对图片/PDF 文件执行 OCR（Office 等格式请先转换为 PDF 或图片）',
        { fileType: document.fileType, mimeType: document.mimeType }
      );
    }

    const { bucket, key } = resolveStorageLocation(document, storageConfig.bucket);
    const buffer = await getObjectBuffer({ client: getS3Client(storageConfig), bucket, key });
    if (buffer.length === 0) {
      return ErrorResponses.OPERATION_FAILED('无法读取文档内容');
    }

    const ai = getAIServiceManager();
    const result = await ai.performOCR(buffer, { language: 'zh' });

    if (!result.success) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        resource: 'documents',
        action: 'ocr',
        details: { traceId, documentId: document.id, providerError: result.error },
        result: 'FAILURE',
        errorMessage: result.error || 'OCR_FAILED',
      });

      if (result.error === 'SERVICE_NOT_CONFIGURED') {
        return ErrorResponses.SERVICE_NOT_CONFIGURED('OCR');
      }
      if (result.error?.endsWith('_NOT_IMPLEMENTED')) {
        return ErrorResponses.NOT_IMPLEMENTED(`OCR 集成尚未实现：${result.error}`);
      }

      return ErrorResponses.OPERATION_FAILED(result.error || 'OCR 识别失败');
    }

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.EXTERNAL_SYSTEM_INVOCATION,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'documents',
      action: 'ocr',
      details: { traceId, documentId: document.id, ocrType: validation.data.ocrType },
      result: 'SUCCESS',
    });

    await appendCaseEvent({
      caseId: document.caseId,
      eventType: 'DOCUMENT_OCR_COMPLETED',
      actorUserId: authUser.id,
      traceId,
      payload: { documentId: document.id, ocrType: validation.data.ocrType, provider: 'tencent' },
    });

    return createSuccessResponse({ documentId: document.id, ocrType: validation.data.ocrType, result: result.data }, 'OCR 识别完成');
  } catch (error) {
    logger.error({ err: error, traceId }, 'OCR 识别失败');
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
