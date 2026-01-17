// dev/src/app/api/cases/[id]/review/route.ts
// 案件审核：补齐“提交-审查-裁定-通知-留痕”中的后端裁定环节（管理员）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { CaseReviewStatus, CaseStatus, Role, type Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const decisionSchema = z.object({
  decision: z.enum(['ACCEPT', 'REJECT', 'NEED_MORE_INFO']),
  reason: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, {
      csrf: true,
      anyRole: [Role.ADMIN],
      forbiddenMessage: '需要业务管理员权限',
    });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    const bodyValidation = await validateRequestBody(request, decisionSchema);
    if (!bodyValidation.success) return bodyValidation.error;
    const { decision, reason } = bodyValidation.data;

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.arbitrationCase.findUnique({
        where: { id: caseId },
        select: {
          id: true,
          applicantId: true,
          status: true,
          acceptedAt: true,
          submittedAt: true,
        },
      });
      if (!existing) return { kind: 'not_found' as const };

      if (existing.status !== CaseStatus.SUBMITTED) {
        return { kind: 'conflict' as const, status: existing.status };
      }

      let nextReviewStatus: CaseReviewStatus;
      let nextCaseStatus: CaseStatus;
      const caseUpdate: Prisma.ArbitrationCaseUpdateInput = {};

      switch (decision) {
        case 'ACCEPT':
          nextReviewStatus = CaseReviewStatus.ACCEPTED;
          nextCaseStatus = CaseStatus.ACCEPTED;
          caseUpdate.acceptedAt = existing.acceptedAt ?? now;
          break;
        case 'REJECT':
          nextReviewStatus = CaseReviewStatus.REJECTED;
          nextCaseStatus = CaseStatus.CANCELLED;
          break;
        case 'NEED_MORE_INFO':
          nextReviewStatus = CaseReviewStatus.NEED_MORE_INFO;
          nextCaseStatus = CaseStatus.DRAFT;
          break;
      }

      const updatedCase = await tx.arbitrationCase.update({
        where: { id: caseId },
        data: {
          ...caseUpdate,
          status: nextCaseStatus,
        },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          acceptedAt: true,
          updatedAt: true,
        },
      });

      const review = await tx.caseReview.upsert({
        where: { caseId },
        create: {
          caseId,
          status: nextReviewStatus,
          submittedByUserId: existing.applicantId,
          submittedAt: existing.submittedAt ?? now,
          decidedByUserId: authUser.id,
          decidedAt: now,
          decisionReason: reason,
        },
        update: {
          status: nextReviewStatus,
          decidedByUserId: authUser.id,
          decidedAt: now,
          decisionReason: reason,
        },
      });

      await appendCaseEvent(
        {
          caseId,
          eventType: 'CASE_REVIEW_DECIDED',
          actorUserId: authUser.id,
          traceId,
          payload: { caseId, decision, reason: reason || null, decidedAt: now.toISOString() },
        },
        tx
      );

      return { kind: 'ok' as const, updatedCase, review };
    });

    if (updated.kind === 'not_found') return ErrorResponses.NOT_FOUND('案件');
    if (updated.kind === 'conflict') {
      return ErrorResponses.RESOURCE_CONFLICT(`当前案件状态为 ${updated.status}，无法审核`);
    }

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_REVIEW_DECIDED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'cases',
      action: 'review',
      details: { traceId, caseId, decision, reason: reason || null },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      { case: updated.updatedCase, review: updated.review },
      '案件审核已处理'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '案件审核失败');
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
