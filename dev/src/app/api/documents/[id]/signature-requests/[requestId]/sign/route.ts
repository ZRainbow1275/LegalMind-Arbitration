// dev/src/app/api/documents/[id]/signature-requests/[requestId]/sign/route.ts
// 签署/拒签：服务端使用密钥对 documentHash 进行签名，并落库可验签结果
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
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
import { getDocumentSigningConfig, signDocumentHash } from '@/lib/document-signing';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ id: uuidSchema, requestId: uuidSchema });

const signSchema = z
  .object({
    action: z.enum(['SIGN', 'DECLINE']).default('SIGN'),
    reason: z.string().max(2000).optional(),
  })
  .strict();

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
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
    const requestId = pathValidation.data.requestId;

    const access = await requireDocumentAccess({ documentId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const bodyValidation = await validateRequestBody(request, signSchema);
    if (!bodyValidation.success) return bodyValidation.error;
    const { action, reason } = bodyValidation.data;

    if (!access.document.fileHash) {
      return ErrorResponses.OPERATION_FAILED('文档缺少 fileHash，无法执行签名');
    }
    const documentHashHex = access.document.fileHash;

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const signatureRequest = await tx.documentSignatureRequest.findFirst({
        where: { id: requestId, documentId },
        select: { id: true, caseId: true, status: true, provider: true },
      });
      if (!signatureRequest) return { kind: 'not_found' as const };

      if (
        signatureRequest.status !== DocumentSignatureRequestStatus.REQUESTED
        && signatureRequest.status !== DocumentSignatureRequestStatus.DRAFT
      ) {
        return { kind: 'conflict' as const, status: signatureRequest.status };
      }

      const signature = await tx.documentSignature.findUnique({
        where: { requestId_signerUserId: { requestId, signerUserId: authUser.id } },
        select: { id: true, status: true },
      });
      if (!signature) return { kind: 'forbidden' as const };

      if (action === 'DECLINE') {
        await tx.documentSignature.update({
          where: { requestId_signerUserId: { requestId, signerUserId: authUser.id } },
          data: {
            status: DocumentSignatureStatus.DECLINED,
            signedAt: now,
            metadata: toPrismaJson({ reason: reason ?? null, declinedAt: now.toISOString() }),
          },
        });

        await tx.documentSignature.updateMany({
          where: { requestId, status: DocumentSignatureStatus.PENDING },
          data: { status: DocumentSignatureStatus.CANCELED },
        });

        await tx.documentSignatureRequest.update({
          where: { id: requestId },
          data: { status: DocumentSignatureRequestStatus.CANCELED, completedAt: now },
        });

        await appendCaseEvent(
          {
            caseId: signatureRequest.caseId,
            eventType: 'DOCUMENT_SIGNATURE_DECLINED',
            actorUserId: authUser.id,
            traceId,
            payload: { documentId, requestId, reason: reason ?? null, declinedAt: now.toISOString() },
          },
          tx
        );

        return { kind: 'declined' as const, caseId: signatureRequest.caseId };
      }

      if (signature.status === DocumentSignatureStatus.SIGNED) {
        return { kind: 'already_signed' as const, caseId: signatureRequest.caseId };
      }

      const signingConfig = getDocumentSigningConfig();
      if (!signingConfig) return { kind: 'service_not_configured' as const };

      const { signatureBase64, signatureHashHex } = signDocumentHash({
        algorithm: signingConfig.algorithm,
        privateKeyPem: signingConfig.privateKeyPem,
        documentHashHex,
      });

      await tx.documentSignature.update({
        where: { requestId_signerUserId: { requestId, signerUserId: authUser.id } },
        data: {
          status: DocumentSignatureStatus.SIGNED,
          signedAt: now,
          signatureAlg: signingConfig.algorithm,
          signatureValue: signatureBase64,
          publicKeyPem: signingConfig.publicKeyPem,
          documentHash: documentHashHex,
          signatureHash: signatureHashHex,
        },
      });

      const counts = await tx.documentSignature.groupBy({
        by: ['status'],
        where: { requestId },
        _count: { _all: true },
      });

      const signedCount = counts.find((c) => c.status === DocumentSignatureStatus.SIGNED)?._count._all ?? 0;
      const totalCount = counts.reduce((sum, c) => sum + c._count._all, 0);

      if (totalCount > 0 && signedCount === totalCount) {
        await tx.documentSignatureRequest.update({
          where: { id: requestId },
          data: { status: DocumentSignatureRequestStatus.COMPLETED, completedAt: now },
        });
      } else {
        await tx.documentSignatureRequest.update({
          where: { id: requestId },
          data: { status: DocumentSignatureRequestStatus.REQUESTED },
        });
      }

      await appendCaseEvent(
        {
          caseId: signatureRequest.caseId,
          eventType: 'DOCUMENT_SIGNED',
          actorUserId: authUser.id,
          traceId,
          payload: { documentId, requestId, signerUserId: authUser.id, signedAt: now.toISOString() },
        },
        tx
      );

      return { kind: 'signed' as const, caseId: signatureRequest.caseId, completed: signedCount === totalCount };
    });

    if (result.kind === 'not_found') return ErrorResponses.NOT_FOUND('签名请求');
    if (result.kind === 'forbidden') return ErrorResponses.FORBIDDEN_MESSAGE('您不是该签名请求的签署人');
    if (result.kind === 'service_not_configured') {
      return ErrorResponses.SERVICE_NOT_CONFIGURED('电子签名服务');
    }
    if (result.kind === 'conflict') {
      return ErrorResponses.RESOURCE_CONFLICT(`当前签名请求状态为 ${result.status}，无法继续操作`);
    }

    const auditEvent =
      result.kind === 'declined'
        ? AuditEventType.DOCUMENT_SIGNATURE_DECLINED
        : AuditEventType.DOCUMENT_SIGNED;

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: auditEvent,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'document_signatures',
      action: action === 'DECLINE' ? 'decline' : 'sign',
      details: { traceId, caseId: access.document.caseId, documentId, requestId, reason: reason ?? null },
      result: 'SUCCESS',
    });

    if (result.kind === 'declined') {
      return createSuccessResponse({ ok: true, action: 'DECLINE', traceId }, '已拒签，签名请求已取消');
    }
    if (result.kind === 'already_signed') {
      return createSuccessResponse({ ok: true, action: 'SIGN', traceId }, '已签署');
    }

    return createSuccessResponse(
      { ok: true, action: 'SIGN', traceId, completed: result.completed },
      '签署成功'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '签署失败');
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
