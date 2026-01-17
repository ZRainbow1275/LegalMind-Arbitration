// dev/src/app/api/arbitrators/[id]/reviews/route.ts
// 仲裁员评价：案件参与人提交评价（默认待审核），并可查询已发布评价
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { ArbitratorReviewStatus, ParticipantType, Prisma, Role } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ id: uuidSchema });

const createSchema = z
  .object({
    caseId: uuidSchema,
    rating: z.number().int().min(1).max(5),
    content: z.string().max(5000).optional().nullable(),
  })
  .strict();

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
    const arbitratorUserId = pathValidation.data.id;

    const isAdmin = authUser.roles.includes(Role.ADMIN);
    const where = {
      arbitratorUserId,
      ...(isAdmin ? {} : { status: ArbitratorReviewStatus.PUBLISHED }),
    };

    const reviews = await prisma.arbitratorReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        arbitratorUserId: true,
        caseId: true,
        authorUserId: true,
        rating: true,
        content: true,
        status: true,
        createdAt: true,
        author: { select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } } },
        case: { select: { id: true, caseNumber: true, title: true } },
      },
      take: 200,
    });

    const published = reviews.filter((r) => r.status === ArbitratorReviewStatus.PUBLISHED);
    const avgRating =
      published.length > 0
        ? published.reduce((sum, r) => sum + r.rating, 0) / published.length
        : null;

    return createSuccessResponse(
      { traceId, arbitratorUserId, avgRating, reviews },
      '获取评价成功'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '获取评价失败');
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
    const arbitratorUserId = pathValidation.data.id;

    const bodyValidation = await validateRequestBody(request, createSchema);
    if (!bodyValidation.success) return bodyValidation.error;
    const { caseId, rating, content } = bodyValidation.data;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        applicantId: true,
        respondentId: true,
        participants: { where: { userId: authUser.id, isActive: true }, select: { id: true } },
      },
    });
    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const isCaseParticipant =
      arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id
      || arbitrationCase.participants.length > 0;
    if (!isCaseParticipant) return ErrorResponses.FORBIDDEN_MESSAGE('仅案件参与人可评价');

    const arbitratorInCase = await prisma.caseParticipant.findFirst({
      where: {
        caseId,
        userId: arbitratorUserId,
        participantType: { in: [ParticipantType.ARBITRATOR, ParticipantType.PRESIDING_ARBITRATOR] },
      },
      select: { id: true },
    });
    if (!arbitratorInCase) return ErrorResponses.BAD_REQUEST_MESSAGE('该用户不是此案仲裁员');

    let created: {
      id: string;
      arbitratorUserId: string;
      caseId: string | null;
      authorUserId: string;
      rating: number;
      content: string | null;
      status: ArbitratorReviewStatus;
      createdAt: Date;
    };

    try {
      created = await prisma.arbitratorReview.create({
        data: {
          arbitratorUserId,
          caseId,
          authorUserId: authUser.id,
          rating,
          content: content ?? null,
          status: ArbitratorReviewStatus.PENDING_MODERATION,
          metadata: { traceId },
        },
        select: {
          id: true,
          arbitratorUserId: true,
          caseId: true,
          authorUserId: true,
          rating: true,
          content: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return ErrorResponses.DUPLICATE_RESOURCE('评价已存在');
      }
      throw error;
    }

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.ARBITRATOR_REVIEW_CREATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'arbitrator_reviews',
      action: 'create',
      details: { traceId, caseId, arbitratorUserId, reviewId: created.id, rating },
      result: 'SUCCESS',
    });

    return createSuccessResponse(created, '评价已提交，等待审核');
  } catch (error) {
    logger.error({ err: error, traceId }, '提交评价失败');
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
