// dev/src/app/api/documents/[id]/signature-requests/[requestId]/route.ts
// 签名请求详情：返回签名状态与验签结果（服务端实时验签，不返回私钥）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { getTraceId } from '@/lib/case-events';
import { DocumentSignatureStatus } from '@/generated/prisma';
import { requireDocumentAccess } from '@/lib/document-guard';
import { verifyDocumentSignature } from '@/lib/document-signing';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ id: uuidSchema, requestId: uuidSchema });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
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
    const requestId = pathValidation.data.requestId;

    const access = await requireDocumentAccess({ documentId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const signatureRequest = await prisma.documentSignatureRequest.findFirst({
      where: { id: requestId, documentId },
      select: {
        id: true,
        caseId: true,
        documentId: true,
        status: true,
        provider: true,
        requestedAt: true,
        completedAt: true,
        metadata: true,
        requestedByUser: { select: { id: true, email: true } },
        signatures: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            signerUserId: true,
            status: true,
            signedAt: true,
            signatureAlg: true,
            signatureHash: true,
            documentHash: true,
            signatureValue: true,
            publicKeyPem: true,
            signer: {
              select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } },
            },
          },
        },
      },
    });

    if (!signatureRequest) return ErrorResponses.NOT_FOUND('签名请求');

    const signatures = signatureRequest.signatures.map((signature) => {
      let isValid: boolean | null = null;
      if (
        signature.status === DocumentSignatureStatus.SIGNED
        && signature.signatureAlg
        && signature.signatureValue
        && signature.publicKeyPem
        && signature.documentHash
      ) {
        try {
          isValid = verifyDocumentSignature({
            algorithm: signature.signatureAlg,
            publicKeyPem: signature.publicKeyPem,
            documentHashHex: signature.documentHash,
            signatureBase64: signature.signatureValue,
          });
        } catch {
          isValid = false;
        }
      }

      return {
        id: signature.id,
        signerUserId: signature.signerUserId,
        signer: signature.signer,
        status: signature.status,
        signedAt: signature.signedAt,
        signatureAlg: signature.signatureAlg,
        signatureHash: signature.signatureHash,
        documentHash: signature.documentHash,
        isValid,
      };
    });

    return createSuccessResponse(
      {
        traceId,
        documentId,
        caseId: access.document.caseId,
        signatureRequest: {
          id: signatureRequest.id,
          status: signatureRequest.status,
          provider: signatureRequest.provider,
          requestedAt: signatureRequest.requestedAt,
          completedAt: signatureRequest.completedAt,
          requestedByUser: signatureRequest.requestedByUser,
          metadata: signatureRequest.metadata,
          signatures,
        },
      },
      '获取签名请求详情成功'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '获取签名请求详情失败');
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

