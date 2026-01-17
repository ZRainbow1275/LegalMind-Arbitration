// dev/src/app/api/documents/generated/[id]/preview/route.ts
// 生成文书预览：从 GeneratedDocument 存储内容直接返回（inline html）
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers, type AuthenticatedUser } from '@/lib/auth';
import { ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { getTraceId, appendCaseEvent } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

function buildContentDispositionInline(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_');
  const encoded = encodeURIComponent(filename);
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function canAccessGeneratedDocument(
  authUser: AuthenticatedUser,
  doc: {
    generatedBy: string;
    case: null | {
      applicantId: string;
      respondentId: string | null;
      participants: Array<{ userId: string | null }>;
    };
  }
) {
  if (doc.generatedBy === authUser.id) return true;
  if (!doc.case) return PermissionCheckers.canManageDocuments(authUser);

  return (
    PermissionCheckers.canViewAllCases(authUser)
    || doc.case.applicantId === authUser.id
    || doc.case.respondentId === authUser.id
    || doc.case.participants.some((p) => p.userId === authUser.id)
  );
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
    const { id } = pathValidation.data;

    const doc = await prisma.generatedDocument.findUnique({
      where: { id },
      include: {
        case: {
          select: {
            id: true,
            applicantId: true,
            respondentId: true,
            participants: {
              where: { userId: authUser.id, isActive: true },
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!doc) return ErrorResponses.NOT_FOUND('生成文书');
    if (!canAccessGeneratedDocument(authUser, doc)) return ErrorResponses.FORBIDDEN();

    const content = doc.generatedContent;
    const ext = (doc.fileFormat || 'html').toLowerCase();
    const filename = `${doc.title || doc.documentNumber}.${ext}`;
    const nowIso = new Date().toISOString();

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.DOCUMENT_VIEWED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'generated_documents',
      action: 'preview',
      details: { traceId, generatedDocumentId: doc.id, caseId: doc.caseId ?? null, format: ext, at: nowIso },
      result: 'SUCCESS',
    });

    if (doc.caseId) {
      await appendCaseEvent({
        caseId: doc.caseId,
        eventType: 'GENERATED_DOCUMENT_VIEWED',
        actorUserId: authUser.id,
        traceId,
        payload: { generatedDocumentId: doc.id, documentNumber: doc.documentNumber, format: ext, at: nowIso },
      });
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': buildContentDispositionInline(filename),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error({ err: error, traceId }, '生成文书预览失败');
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
