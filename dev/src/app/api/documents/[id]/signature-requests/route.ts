// dev/src/app/api/documents/[id]/signature-requests/route.ts
// 电子签名请求：创建签署请求并生成待签署人列表（可审计、可验签）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import {
  DocumentSignatureRequestStatus,
  DocumentSignatureStatus,
  type Prisma,
} from '@/generated/prisma';
import { requireDocumentAccess } from '@/lib/document-guard';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ id: uuidSchema });

const createSignatureRequestSchema = z
  .object({
    signerUserIds: z.array(uuidSchema).max(20).optional(),
    provider: z.enum(['internal']).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

function uniq(ids: string[]) {
  return Array.from(new Set(ids));
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const documentId = pathValidation.data.id;

    const access = await requireDocumentAccess({ documentId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const signatureRequests = await prisma.documentSignatureRequest.findMany({
      where: { documentId },
      orderBy: { requestedAt: 'desc' },
      include: {
        requestedByUser: { select: { id: true, email: true } },
        signatures: {
          orderBy: { createdAt: 'asc' },
          include: {
            signer: { select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } } },
          },
        },
      },
    });

    return createSuccessResponse(
      { traceId, documentId, caseId: access.document.caseId, signatureRequests },
      '获取签名请求成功'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '获取签名请求失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const documentId = pathValidation.data.id;

    const access = await requireDocumentAccess({ documentId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const canCreate =
      PermissionCheckers.canManageDocuments(authUser) || access.document.uploadedBy === authUser.id;
    if (!canCreate) {
      return ErrorResponses.FORBIDDEN_MESSAGE('仅文档上传者或管理员可发起签名请求');
    }

    const bodyValidation = await validateRequestBody(request, createSignatureRequestSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const signerUserIds = uniq(
      bodyValidation.data.signerUserIds && bodyValidation.data.signerUserIds.length > 0
        ? bodyValidation.data.signerUserIds
        : [authUser.id]
    );

    const metadata = bodyValidation.data.metadata ? toPrismaJson(bodyValidation.data.metadata) : undefined;
    const provider = bodyValidation.data.provider ?? 'internal';
    const now = new Date();

    const created = await prisma.$transaction(async (tx) => {
      const arbitrationCase = await tx.arbitrationCase.findUnique({
        where: { id: access.document.caseId },
        select: {
          applicantId: true,
          respondentId: true,
          participants: {
            where: { isActive: true, userId: { in: signerUserIds } },
            select: { userId: true },
          },
        },
      });
      if (!arbitrationCase) return { kind: 'not_found' as const };

      const allowedSignerIds = new Set<string>();
      allowedSignerIds.add(arbitrationCase.applicantId);
      if (arbitrationCase.respondentId) allowedSignerIds.add(arbitrationCase.respondentId);
      for (const p of arbitrationCase.participants) {
        if (p.userId) allowedSignerIds.add(p.userId);
      }

      const invalidSigners = signerUserIds.filter((id) => !allowedSignerIds.has(id));
      if (invalidSigners.length > 0) {
        return { kind: 'invalid_signers' as const, invalidSigners };
      }

      const signatureRequest = await tx.documentSignatureRequest.create({
        data: {
          caseId: access.document.caseId,
          documentId,
          status: DocumentSignatureRequestStatus.REQUESTED,
          provider,
          requestedByUserId: authUser.id,
          requestedAt: now,
          metadata,
        },
      });

      await tx.documentSignature.createMany({
        data: signerUserIds.map((signerUserId) => ({
          requestId: signatureRequest.id,
          signerUserId,
          status: DocumentSignatureStatus.PENDING,
        })),
        skipDuplicates: true,
      });

      await appendCaseEvent(
        {
          caseId: access.document.caseId,
          eventType: 'DOCUMENT_SIGNATURE_REQUEST_CREATED',
          actorUserId: authUser.id,
          traceId,
          payload: { documentId, requestId: signatureRequest.id, signerUserIds, provider },
        },
        tx
      );

      const withSigners = await tx.documentSignatureRequest.findUnique({
        where: { id: signatureRequest.id },
        include: {
          requestedByUser: { select: { id: true, email: true } },
          signatures: { include: { signer: { select: { id: true, email: true } } } },
        },
      });

      if (!withSigners) return { kind: 'unexpected' as const };
      return { kind: 'ok' as const, signatureRequest: withSigners };
    });

    if (created.kind === 'not_found') return ErrorResponses.NOT_FOUND('案件');
    if (created.kind === 'invalid_signers') {
      return ErrorResponses.BAD_REQUEST_MESSAGE('signerUserIds 包含非案件参与人', {
        invalidSignerUserIds: created.invalidSigners,
      });
    }
    if (created.kind === 'unexpected') return ErrorResponses.INTERNAL_ERROR();

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.DOCUMENT_SIGNATURE_REQUEST_CREATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'document_signature_requests',
      action: 'create',
      details: {
        traceId,
        caseId: access.document.caseId,
        documentId,
        requestId: created.signatureRequest.id,
        signerUserIds,
        provider,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(created.signatureRequest, '签名请求已创建');
  } catch (error) {
    logger.error({ err: error, traceId }, '创建签名请求失败');
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

