// dev/src/app/api/arbitrators/profile/submit/route.ts
// 提交仲裁员资质：将资料状态从 DRAFT/REJECTED 提交为 SUBMITTED
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { ArbitratorProfileStatus, type Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const existing = await prisma.arbitratorProfile.findUnique({
      where: { userId: authUser.id },
      select: { id: true, status: true, metadata: true, title: true, experienceYears: true },
    });
    if (!existing) return ErrorResponses.BAD_REQUEST_MESSAGE('请先完善仲裁员资料再提交');

    if (
      existing.status === ArbitratorProfileStatus.SUBMITTED
      || existing.status === ArbitratorProfileStatus.UNDER_REVIEW
    ) {
      return createSuccessResponse({ traceId, profileId: existing.id, status: existing.status }, '资料已提交');
    }

    if (existing.status === ArbitratorProfileStatus.APPROVED) {
      return ErrorResponses.RESOURCE_CONFLICT('资料已通过审核');
    }

    const nextMetadata = {
      ...(isPlainObject(existing.metadata) ? (existing.metadata as Record<string, unknown>) : {}),
      traceId,
      submittedAt: new Date().toISOString(),
    };

    const updated = await prisma.arbitratorProfile.update({
      where: { userId: authUser.id },
      data: { status: ArbitratorProfileStatus.SUBMITTED, metadata: toPrismaJson(nextMetadata) },
      select: { id: true, userId: true, status: true, updatedAt: true },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.ARBITRATOR_PROFILE_SUBMITTED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'arbitrator_profiles',
      action: 'submit',
      details: { traceId, profileId: updated.id },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      { traceId, profileId: updated.id, status: updated.status, submittedAt: updated.updatedAt },
      '仲裁员资料已提交'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '提交仲裁员资料失败');
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

