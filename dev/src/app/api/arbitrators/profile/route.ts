// dev/src/app/api/arbitrators/profile/route.ts
// 仲裁员资料：维护个人资质档案（DRAFT -> SUBMITTED -> REVIEW -> APPROVED/REJECTED）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import { ArbitratorProfileStatus } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validateRequestBody } from '@/lib/validation';
import { getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

const upsertSchema = z
  .object({
    title: z.string().max(200).optional().nullable(),
    bio: z.string().max(10_000).optional().nullable(),
    experienceYears: z.number().int().min(0).max(100).optional(),
    location: z.string().max(100).optional().nullable(),
    languages: z.array(z.string().min(1).max(50)).max(50).optional(),
    specialties: z.array(z.string().min(1).max(100)).max(100).optional(),
    hourlyRate: z.number().min(0).max(1_000_000).optional().nullable(),
    verificationDocuments: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const profile = await prisma.arbitratorProfile.findUnique({
      where: { userId: authUser.id },
      select: {
        id: true,
        userId: true,
        status: true,
        title: true,
        bio: true,
        experienceYears: true,
        location: true,
        languages: true,
        specialties: true,
        hourlyRate: true,
        verificationDocuments: true,
        verifiedAt: true,
        verifiedByUserId: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return createSuccessResponse({ traceId, profile }, '获取仲裁员资料成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '获取仲裁员资料失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function PUT(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const validation = await validateRequestBody(request, upsertSchema);
    if (!validation.success) return validation.error;

    const existing = await prisma.arbitratorProfile.findUnique({
      where: { userId: authUser.id },
      select: { status: true, metadata: true },
    });

    const lockedStatuses: ArbitratorProfileStatus[] = [
      ArbitratorProfileStatus.SUBMITTED,
      ArbitratorProfileStatus.UNDER_REVIEW,
      ArbitratorProfileStatus.APPROVED,
    ];

    if (existing && lockedStatuses.includes(existing.status)) {
      return ErrorResponses.RESOURCE_CONFLICT('资料已提交或审核中，当前不可修改');
    }

    const nextMetadata = {
      ...(isPlainObject(existing?.metadata) ? (existing?.metadata as Record<string, unknown>) : {}),
      ...(validation.data.metadata ? validation.data.metadata : {}),
      traceId,
      updatedAt: new Date().toISOString(),
    };

    const profile = await prisma.arbitratorProfile.upsert({
      where: { userId: authUser.id },
      create: {
        userId: authUser.id,
        status: ArbitratorProfileStatus.DRAFT,
        title: validation.data.title ?? null,
        bio: validation.data.bio ?? null,
        experienceYears: validation.data.experienceYears ?? 0,
        location: validation.data.location ?? null,
        languages: validation.data.languages ? toPrismaJson(validation.data.languages) : undefined,
        specialties: validation.data.specialties ? toPrismaJson(validation.data.specialties) : undefined,
        hourlyRate: validation.data.hourlyRate ?? null,
        verificationDocuments: validation.data.verificationDocuments
          ? toPrismaJson(validation.data.verificationDocuments)
          : undefined,
        metadata: toPrismaJson(nextMetadata),
      },
      update: {
        status: ArbitratorProfileStatus.DRAFT,
        title: validation.data.title ?? null,
        bio: validation.data.bio ?? null,
        ...(typeof validation.data.experienceYears === 'number'
          ? { experienceYears: validation.data.experienceYears }
          : {}),
        location: validation.data.location ?? null,
        ...(validation.data.languages ? { languages: toPrismaJson(validation.data.languages) } : {}),
        ...(validation.data.specialties ? { specialties: toPrismaJson(validation.data.specialties) } : {}),
        hourlyRate: validation.data.hourlyRate ?? null,
        ...(validation.data.verificationDocuments
          ? { verificationDocuments: toPrismaJson(validation.data.verificationDocuments) }
          : {}),
        metadata: toPrismaJson(nextMetadata),
      },
      select: {
        id: true,
        userId: true,
        status: true,
        title: true,
        bio: true,
        experienceYears: true,
        location: true,
        languages: true,
        specialties: true,
        hourlyRate: true,
        verificationDocuments: true,
        verifiedAt: true,
        verifiedByUserId: true,
        metadata: true,
        updatedAt: true,
      },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.USER_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'arbitrator_profiles',
      action: 'update',
      details: { traceId, profileId: profile.id, status: profile.status },
      result: 'SUCCESS',
    });

    return createSuccessResponse(profile, '仲裁员资料已更新');
  } catch (error) {
    logger.error({ err: error, traceId }, '更新仲裁员资料失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function POST() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
