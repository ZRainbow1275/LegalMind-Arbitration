// dev/src/app/api/arbitrators/profiles/[id]/review/route.ts
// 业务管理员审核仲裁员资质：APPROVE/REJECT/SUSPEND/UNDER_REVIEW，并同步角色
import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import { ArbitratorProfileStatus, Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ id: uuidSchema });

const reviewSchema = z
  .object({
    action: z.enum(['UNDER_REVIEW', 'APPROVE', 'REJECT', 'SUSPEND']),
    reason: z.string().max(2000).optional(),
  })
  .strict();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

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
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const profileId = pathValidation.data.id;

    const bodyValidation = await validateRequestBody(request, reviewSchema);
    if (!bodyValidation.success) return bodyValidation.error;
    const { action, reason } = bodyValidation.data;

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.arbitratorProfile.findUnique({
        where: { id: profileId },
        select: { id: true, userId: true, status: true, metadata: true },
      });
      if (!existing) return { kind: 'not_found' as const };

      const nextMetadata = {
        ...(isPlainObject(existing.metadata) ? (existing.metadata as Record<string, unknown>) : {}),
        traceId,
        reviewedAt: now.toISOString(),
        reviewedByUserId: authUser.id,
        action,
        reason: reason ?? null,
      };

      let nextStatus: ArbitratorProfileStatus;
      switch (action) {
        case 'UNDER_REVIEW':
          nextStatus = ArbitratorProfileStatus.UNDER_REVIEW;
          break;
        case 'APPROVE':
          nextStatus = ArbitratorProfileStatus.APPROVED;
          break;
        case 'REJECT':
          nextStatus = ArbitratorProfileStatus.REJECTED;
          break;
        case 'SUSPEND':
          nextStatus = ArbitratorProfileStatus.SUSPENDED;
          break;
      }

      const updated = await tx.arbitratorProfile.update({
        where: { id: profileId },
        data: {
          status: nextStatus,
          verifiedByUserId: authUser.id,
          verifiedAt: nextStatus === ArbitratorProfileStatus.APPROVED ? now : null,
          metadata: toPrismaJson(nextMetadata),
        },
        select: { id: true, userId: true, status: true, verifiedAt: true, verifiedByUserId: true, updatedAt: true },
      });

      if (nextStatus === ArbitratorProfileStatus.APPROVED) {
        await tx.userRole.upsert({
          where: { userId_role: { userId: existing.userId, role: Role.ARBITRATOR } },
          create: { userId: existing.userId, role: Role.ARBITRATOR, isActive: true, assignedBy: authUser.id },
          update: { isActive: true, assignedBy: authUser.id, assignedAt: now },
        });
      }

      if (nextStatus === ArbitratorProfileStatus.SUSPENDED) {
        await tx.userRole.updateMany({
          where: { userId: existing.userId, role: Role.ARBITRATOR },
          data: { isActive: false, assignedBy: authUser.id, assignedAt: now },
        });
      }

      return { kind: 'ok' as const, updated };
    });

    if (result.kind === 'not_found') return ErrorResponses.NOT_FOUND('仲裁员资料');

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.ARBITRATOR_PROFILE_DECIDED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'arbitrator_profiles',
      action: 'review',
      details: { traceId, profileId, decision: bodyValidation.data.action, reason: reason ?? null },
      result: 'SUCCESS',
    });

    return createSuccessResponse(result.updated, '审核已提交');
  } catch (error) {
    logger.error({ err: error, traceId }, '审核仲裁员资料失败');
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

