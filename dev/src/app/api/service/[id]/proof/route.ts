// dev/src/app/api/service/[id]/proof/route.ts
// 送达证明链导出：可重复验证 proofHash，并以 CaseEvent 哈希链作为锚点
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { buildServiceProof } from '@/lib/service-of-process';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { getTraceId } from '@/lib/case-events';
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
    const { id: serviceId } = pathValidation.data;

    const service = await prisma.serviceOfProcess.findUnique({
      where: { id: serviceId },
      include: {
        attempts: { orderBy: { attemptNumber: 'asc' } },
        case: {
          select: {
            id: true,
            caseNumber: true,
            applicantId: true,
            respondentId: true,
            participants: { where: { userId: authUser.id, isActive: true }, select: { id: true } },
          },
        },
      },
    });
    if (!service) return ErrorResponses.NOT_FOUND('送达记录');

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser)
      || service.case.applicantId === authUser.id
      || service.case.respondentId === authUser.id
      || service.case.participants.length > 0;

    if (!hasAccess) return ErrorResponses.FORBIDDEN();

    const { payload, proofHash, signature } = buildServiceProof({
      service,
      attempts: service.attempts,
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.SERVICE_OF_PROCESS_PROOF_VIEWED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'service_of_process',
      action: 'export_proof',
      details: { traceId, serviceId: service.id, caseId: service.caseId, storedProofHash: service.proofHash ?? null },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        proof: {
          algorithm: 'SHA-256',
          proofHash,
          signatureAlgorithm: 'HMAC-SHA256(AUDIT_LOG_SECRET, proofHash.generatedAt)',
          signature,
          generatedAt: payload.generatedAt,
        },
        payload,
        verification: {
          storedProofHash: service.proofHash ?? null,
          storedGeneratedAt: service.proofGeneratedAt ? service.proofGeneratedAt.toISOString() : null,
          matchesStoredHash: service.proofHash ? service.proofHash === proofHash : null,
        },
      },
      '送达证明链已生成'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '导出送达证明链失败');
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

