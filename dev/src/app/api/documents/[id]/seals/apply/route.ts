// dev/src/app/api/documents/[id]/seals/apply/route.ts
// 对文档应用印章：记录 SealUsage（可审计、可追溯到案件/文档）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { Role, SealStatus, SealUsageStatus, type Prisma } from '@/generated/prisma';
import { requireDocumentAccess } from '@/lib/document-guard';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ id: uuidSchema });

const applySealSchema = z
  .object({
    sealId: uuidSchema,
    signatureRequestId: uuidSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

    const bodyValidation = await validateRequestBody(request, applySealSchema);
    if (!bodyValidation.success) return bodyValidation.error;
    const { sealId, signatureRequestId, metadata } = bodyValidation.data;

    const seal = await prisma.seal.findUnique({
      where: { id: sealId },
      select: { id: true, ownerUserId: true, status: true },
    });
    if (!seal) return ErrorResponses.NOT_FOUND('印章');
    if (seal.status !== SealStatus.ACTIVE) {
      return ErrorResponses.RESOURCE_CONFLICT('印章不可用');
    }

    const isOwner = seal.ownerUserId === authUser.id;
    const isAdmin = authUser.roles.includes(Role.ADMIN);
    if (!isOwner && !isAdmin) {
      return ErrorResponses.FORBIDDEN_MESSAGE('仅印章所有者或管理员可应用印章');
    }

    if (signatureRequestId) {
      const req = await prisma.documentSignatureRequest.findUnique({
        where: { id: signatureRequestId },
        select: { id: true, documentId: true, caseId: true },
      });
      if (!req) return ErrorResponses.NOT_FOUND('签名请求');
      if (req.documentId !== documentId) {
        return ErrorResponses.BAD_REQUEST_MESSAGE('signatureRequestId 不属于该文档');
      }
      if (req.caseId !== access.document.caseId) {
        return ErrorResponses.BAD_REQUEST_MESSAGE('signatureRequestId 不属于该案件');
      }
    }

    const now = new Date();
    const created = await prisma.$transaction(async (tx) => {
      const usage = await tx.sealUsage.create({
        data: {
          sealId,
          caseId: access.document.caseId,
          documentId,
          signatureRequestId: signatureRequestId ?? null,
          usedByUserId: authUser.id,
          status: SealUsageStatus.APPLIED,
          usedAt: now,
          metadata: metadata ? toPrismaJson(metadata) : undefined,
        },
      });

      await appendCaseEvent(
        {
          caseId: access.document.caseId,
          eventType: 'SEAL_APPLIED',
          actorUserId: authUser.id,
          traceId,
          payload: { documentId, sealId, sealUsageId: usage.id, signatureRequestId: signatureRequestId ?? null },
        },
        tx
      );

      return usage;
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.SEAL_APPLIED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'seal_usages',
      action: 'apply',
      details: {
        traceId,
        caseId: access.document.caseId,
        documentId,
        sealId,
        sealUsageId: created.id,
        signatureRequestId: signatureRequestId ?? null,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(created, '印章已应用');
  } catch (error) {
    logger.error({ err: error, traceId }, '应用印章失败');
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
