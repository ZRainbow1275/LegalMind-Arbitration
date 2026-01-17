// dev/src/app/api/cases/[id]/submit/route.ts
// 提交案件：补齐“案件审核流程”的后端闭环入口
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { CaseReviewStatus, CaseStatus, type Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const submitSchema = z.object({
  confirm: z.boolean().optional(),
});

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
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    // 允许前端显式确认（无确认字段也可提交）
    const bodyValidation = await request
      .json()
      .then((v) => submitSchema.safeParse(v))
      .catch(() => submitSchema.safeParse({}));

    if (!bodyValidation.success) {
      return ErrorResponses.VALIDATION_ERROR(bodyValidation.error.flatten().fieldErrors);
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.arbitrationCase.findUnique({
        where: { id: caseId },
        select: { id: true, applicantId: true, status: true, submittedAt: true },
      });

      if (!existing) return { kind: 'not_found' as const };
      if (existing.applicantId !== authUser.id) return { kind: 'forbidden' as const };
      if (existing.status !== CaseStatus.DRAFT) return { kind: 'conflict' as const };

      const caseUpdate: Prisma.ArbitrationCaseUpdateInput = {
        status: CaseStatus.SUBMITTED,
        submittedAt: existing.submittedAt ?? now,
      };

      const updatedCase = await tx.arbitrationCase.update({
        where: { id: caseId },
        data: caseUpdate,
        select: { id: true, status: true, submittedAt: true, acceptedAt: true },
      });

      const review = await tx.caseReview.upsert({
        where: { caseId },
        create: {
          caseId,
          status: CaseReviewStatus.SUBMITTED,
          submittedByUserId: authUser.id,
          submittedAt: now,
        },
        update: {
          status: CaseReviewStatus.SUBMITTED,
          submittedByUserId: authUser.id,
          submittedAt: now,
          decidedByUserId: null,
          decidedAt: null,
          decisionReason: null,
        },
      });

      await appendCaseEvent(
        {
          caseId,
          eventType: 'CASE_SUBMITTED',
          actorUserId: authUser.id,
          traceId,
          payload: { caseId, submittedAt: now.toISOString() },
        },
        tx
      );

      return { kind: 'ok' as const, updatedCase, review };
    });

    if (updated.kind === 'not_found') return ErrorResponses.NOT_FOUND('案件');
    if (updated.kind === 'forbidden') return ErrorResponses.FORBIDDEN_MESSAGE('仅申请人可提交案件');
    if (updated.kind === 'conflict') return ErrorResponses.RESOURCE_CONFLICT('仅草稿案件可提交');

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_REVIEW_SUBMITTED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'cases',
      action: 'submit',
      details: { traceId, caseId },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      { case: updated.updatedCase, review: updated.review },
      '案件已提交'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '提交案件失败');
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

