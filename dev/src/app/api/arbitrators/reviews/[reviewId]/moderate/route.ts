// dev/src/app/api/arbitrators/reviews/[reviewId]/moderate/route.ts
// 评价审核：业务管理员发布/隐藏仲裁员评价
import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import { ArbitratorReviewStatus, Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ reviewId: uuidSchema });

const moderateSchema = z
  .object({
    status: z.enum(['PUBLISHED', 'HIDDEN']),
    reason: z.string().max(2000).optional(),
  })
  .strict();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
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
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const reviewId = pathValidation.data.reviewId;

    const bodyValidation = await validateRequestBody(request, moderateSchema);
    if (!bodyValidation.success) return bodyValidation.error;
    const nextStatus =
      bodyValidation.data.status === 'PUBLISHED'
        ? ArbitratorReviewStatus.PUBLISHED
        : ArbitratorReviewStatus.HIDDEN;

    const existing = await prisma.arbitratorReview.findUnique({
      where: { id: reviewId },
      select: { id: true, status: true, metadata: true },
    });
    if (!existing) return ErrorResponses.NOT_FOUND('评价');

    const nextMetadata = {
      ...(isPlainObject(existing.metadata) ? (existing.metadata as Record<string, unknown>) : {}),
      traceId,
      moderatedAt: new Date().toISOString(),
      moderatedByUserId: authUser.id,
      reason: bodyValidation.data.reason ?? null,
    };

    const updated = await prisma.arbitratorReview.update({
      where: { id: reviewId },
      data: { status: nextStatus, metadata: toPrismaJson(nextMetadata) },
      select: { id: true, status: true, updatedAt: true },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.ARBITRATOR_REVIEW_MODERATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'arbitrator_reviews',
      action: 'moderate',
      details: { traceId, reviewId, status: nextStatus, reason: bodyValidation.data.reason ?? null },
      result: 'SUCCESS',
    });

    return createSuccessResponse(updated, '评价状态已更新');
  } catch (error) {
    logger.error({ err: error, traceId }, '审核评价失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function GET() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
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

