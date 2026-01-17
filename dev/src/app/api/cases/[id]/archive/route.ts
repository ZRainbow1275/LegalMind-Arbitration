// dev/src/app/api/cases/[id]/archive/route.ts
// 归档包：创建归档任务 + 查询归档记录（Phase 5.3 合规硬链路）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validatePathParams, validateSearchParams, uuidSchema } from '@/lib/validation';
import {
  calculatePagination,
  createPaginatedResponse,
  createSuccessResponse,
  ErrorResponses,
  parsePaginationParams,
} from '@/lib/api-response';
import { ArchiveStatus, type Prisma } from '@/generated/prisma';
import { enqueueArchiveGeneration } from '@/lib/queue';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(ArchiveStatus).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    const { searchParams } = new URL(request.url);
    const queryValidation = validateSearchParams(searchParams, querySchema);
    if (!queryValidation.success) return queryValidation.error;

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

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser)
      || arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id
      || arbitrationCase.participants.length > 0;

    if (!hasAccess) return ErrorResponses.FORBIDDEN();

    const { page, limit } = parsePaginationParams(searchParams);

    const where: Prisma.ArchivePackageWhereInput = {
      caseId,
      ...(queryValidation.data.status ? { status: queryValidation.data.status } : {}),
    };

    const total = await prisma.archivePackage.count({ where });
    const pagination = calculatePagination(total, page, limit);

    const records = await prisma.archivePackage.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        caseId: true,
        status: true,
        createdByUserId: true,
        traceId: true,
        bucket: true,
        objectKey: true,
        fileName: true,
        contentType: true,
        size: true,
        sha256: true,
        manifestHash: true,
        error: true,
        completedAt: true,
        failedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return createPaginatedResponse(records, pagination, '归档记录获取成功');
  } catch (error) {
    logger.error({ err: error }, '获取归档记录失败');
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

    if (!PermissionCheckers.canManageCase(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('仅仲裁机构/仲裁员/调解员可发起归档');
    }

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: { id: true, caseNumber: true },
    });
    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.archivePackage.findFirst({
        where: { caseId, status: { in: [ArchiveStatus.PENDING, ArchiveStatus.PROCESSING] } },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) return existing;

      const pkg = await tx.archivePackage.create({
        data: {
          caseId,
          status: ArchiveStatus.PENDING,
          createdByUserId: authUser.id,
          traceId,
        },
      });

      await appendCaseEvent(
        {
          caseId,
          eventType: 'ARCHIVE_PACKAGE_REQUESTED',
          actorUserId: authUser.id,
          traceId,
          payload: { archivePackageId: pkg.id },
        },
        tx
      );

      return pkg;
    });

    try {
      await enqueueArchiveGeneration({ archivePackageId: created.id, traceId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, traceId, archivePackageId: created.id }, '归档任务入队失败');

      await prisma.archivePackage.update({
        where: { id: created.id },
        data: {
          status: ArchiveStatus.FAILED,
          error: `QUEUE_ENQUEUE_FAILED: ${message}`.slice(0, 2000),
          failedAt: new Date(),
        },
      });

      await appendCaseEvent({
        caseId,
        eventType: 'ARCHIVE_PACKAGE_FAILED',
        actorUserId: authUser.id,
        traceId,
        payload: { archivePackageId: created.id, error: message },
      });

      return ErrorResponses.INTERNAL_ERROR();
    }

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.ARCHIVE_PACKAGE_CREATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'archive_packages',
      action: 'create',
      details: { traceId, caseId, archivePackageId: created.id },
      result: 'SUCCESS',
    });

    return createSuccessResponse({ archivePackage: created, traceId }, '归档任务已创建并入队');
  } catch (error) {
    logger.error({ err: error, traceId }, '创建归档任务失败');
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

