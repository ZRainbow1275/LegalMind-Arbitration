// dev/src/app/api/documents/[id]/route.ts
// 文档详情：对齐 docs/API_REFERENCE.md 的 GET /api/documents/:id
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { getTraceId, appendCaseEvent } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

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
            participants: {
              where: { userId: authUser.id, isActive: true },
              select: { id: true },
            },
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

    if (!document.case || !canAccess) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        resource: 'documents',
        action: 'get',
        details: { traceId, documentId },
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
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'documents',
      action: 'get',
      details: { traceId, documentId, caseId: document.caseId },
      result: 'SUCCESS',
    });

    await appendCaseEvent({
      caseId: document.caseId,
      eventType: 'DOCUMENT_VIEWED',
      actorUserId: authUser.id,
      traceId,
      payload: { documentId: document.id, fileHash: document.fileHash },
    });

    return createSuccessResponse(
      {
        document,
        traceId,
        previewUrl: `/api/documents/${document.id}/preview`,
        downloadUrl: `/api/documents/${document.id}/download`,
      },
      '文档详情获取成功'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '获取文档详情失败');
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

