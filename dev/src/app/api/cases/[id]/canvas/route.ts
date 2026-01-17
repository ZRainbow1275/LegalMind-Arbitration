// dev/src/app/api/cases/[id]/canvas/route.ts
// 案件画布持久化（Prototype 依赖）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getRedisManager } from '@/lib/redis';
import { getAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { CSRFProtection } from '@/lib/security/middleware';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import type { Prisma } from '@/generated/prisma';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { logger } from '@/lib/logger';

const canvasUpsertSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  canvasState: z.unknown(),
  options: z.record(z.string(), z.unknown()).optional(),
});

type CaseEvent = {
  type: string;
  caseId: string;
  timestamp: string;
  data?: unknown;
};

function buildCaseEvent(caseId: string, type: string, data?: unknown): CaseEvent {
  return { type, caseId, timestamp: new Date().toISOString(), data };
}

async function publishCaseEvent(caseId: string, event: CaseEvent) {
  const redis = getRedisManager().getClient();
  await redis.publish(`case-events:${caseId}`, JSON.stringify(event));
}

async function assertCaseAccess(caseId: string, userId: string, canViewAll: boolean) {
  const arbitrationCase = await prisma.arbitrationCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      applicantId: true,
      respondentId: true,
      participants: {
        where: { userId, isActive: true },
        select: { id: true },
      },
    },
  });

  if (!arbitrationCase) {
    return { ok: false as const, error: ErrorResponses.NOT_FOUND('案件') };
  }

  const hasAccess = canViewAll ||
    arbitrationCase.applicantId === userId ||
    arbitrationCase.respondentId === userId ||
    arbitrationCase.participants.length > 0;

  if (!hasAccess) {
    return { ok: false as const, error: ErrorResponses.FORBIDDEN() };
  }

  return { ok: true as const };
}

/**
 * 获取画布状态
 * GET /api/cases/:id/canvas
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) return ErrorResponses.UNAUTHORIZED();

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    const access = await assertCaseAccess(caseId, authUser.id, PermissionCheckers.canViewAllCases(authUser));
    if (!access.ok) return access.error;

    const { searchParams } = new URL(request.url);
    const versionParam = searchParams.get('version');
    const metadataOnly = searchParams.get('metadataOnly') === 'true';

    const canvas = await prisma.caseCanvas.findUnique({
      where: { caseId },
      select: {
        id: true,
        latestVersion: true,
        latestSnapshot: true,
        updatedAt: true,
      },
    });

    if (!canvas) {
      return ErrorResponses.NOT_FOUND('画布');
    }

    if (metadataOnly) {
      return createSuccessResponse(
        {
          canvasState: null,
          metadata: {
            latestVersion: canvas.latestVersion,
            updatedAt: canvas.updatedAt,
          },
        },
        '获取画布元信息成功'
      );
    }

    let snapshot: unknown = canvas.latestSnapshot;
    if (versionParam) {
      const version = Number(versionParam);
      if (!Number.isFinite(version) || version < 1) {
        return ErrorResponses.BAD_REQUEST('version 参数无效');
      }

      const v = await prisma.caseCanvasVersion.findFirst({
        where: { canvasId: canvas.id, version },
        select: { snapshot: true },
      });
      if (!v) {
        return ErrorResponses.NOT_FOUND('画布版本');
      }
      snapshot = v.snapshot;
    }

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.DOCUMENT_VIEWED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'case_canvas',
      action: 'get',
      details: { caseId, version: versionParam || 'latest' },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        canvasState: snapshot,
        metadata: {
          latestVersion: canvas.latestVersion,
          updatedAt: canvas.updatedAt,
        },
      },
      '获取画布成功'
    );
  } catch (error) {
    logger.error({ err: error }, '获取画布失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 保存画布状态
 * PUT /api/cases/:id/canvas
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) return ErrorResponses.UNAUTHORIZED();
    if (!authUser.tokenId) return ErrorResponses.UNAUTHORIZED();

    if (!CSRFProtection.protect(request, authUser.tokenId)) {
      await AuditLogger.log({
        level: AuditLevel.CRITICAL,
        eventType: AuditEventType.CSRF_ATTACK_DETECTED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        resource: 'case_canvas',
        action: 'put',
        result: 'FAILURE',
      });
      return ErrorResponses.CSRF_INVALID();
    }

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    const access = await assertCaseAccess(caseId, authUser.id, PermissionCheckers.canViewAllCases(authUser));
    if (!access.ok) return access.error;

    const bodyValidation = await validateRequestBody(request, canvasUpsertSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const { canvasState, options, expectedVersion } = bodyValidation.data;
    let canvasStateJson: Prisma.InputJsonValue;
    let optionsJson: Prisma.InputJsonValue | undefined;
    try {
      canvasStateJson = JSON.parse(JSON.stringify(canvasState)) as Prisma.InputJsonValue;
      if (options !== undefined) {
        optionsJson = JSON.parse(JSON.stringify(options)) as Prisma.InputJsonValue;
      }
    } catch (error) {
      logger.error({ err: error }, '画布数据序列化失败');
      return ErrorResponses.BAD_REQUEST('canvasState/options 不可序列化');
    }

    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(canvasStateJson))
      .digest('hex');

      const saved = await prisma.$transaction(async (tx) => {
        const existing = await tx.caseCanvas.findUnique({
          where: { caseId },
          select: { id: true, latestVersion: true },
        });

        if (existing) {
          if (existing.latestVersion !== expectedVersion) {
            throw new Error('VERSION_CONFLICT');
          }
        } else if (expectedVersion !== 0) {
          throw new Error('VERSION_CONFLICT');
        }

        const canvas = existing
          ? await tx.caseCanvas.update({
                where: { caseId },
                data: {
                  latestVersion: expectedVersion + 1,
                  latestSnapshot: canvasStateJson,
                  updatedBy: authUser.id,
                },
                select: { id: true, latestVersion: true, updatedAt: true },
              })
          : await tx.caseCanvas.create({
              data: {
                caseId,
                latestVersion: 1,
                latestSnapshot: canvasStateJson,
                createdBy: authUser.id,
                updatedBy: authUser.id,
              },
              select: { id: true, latestVersion: true, updatedAt: true },
            });

        await tx.caseCanvasVersion.create({
          data: {
            canvasId: canvas.id,
            version: canvas.latestVersion,
            snapshot: canvasStateJson,
            checksum,
            createdBy: authUser.id,
            options: optionsJson,
          },
        });

      return canvas;
    });

    await publishCaseEvent(caseId, buildCaseEvent(caseId, 'canvas-update', { version: saved.latestVersion }));

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'case_canvas',
      action: 'put',
      details: { caseId, version: saved.latestVersion, checksum },
      result: 'SUCCESS',
    });

    await appendCaseEvent({
      caseId,
      eventType: 'CANVAS_UPDATED',
      actorUserId: authUser.id,
      traceId,
      payload: { version: saved.latestVersion, checksum },
    });

      return createSuccessResponse(
        {
          version: saved.latestVersion,
          updatedAt: saved.updatedAt,
        },
        '保存画布成功'
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
        return ErrorResponses.RESOURCE_CONFLICT('版本冲突，请刷新后重试');
      }

      logger.error({ err: error }, '保存画布失败');
      return ErrorResponses.INTERNAL_ERROR();
    }
  }

/**
 * 删除画布状态
 * DELETE /api/cases/:id/canvas
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) return ErrorResponses.UNAUTHORIZED();
    if (!authUser.tokenId) return ErrorResponses.UNAUTHORIZED();

    if (!CSRFProtection.protect(request, authUser.tokenId)) {
      await AuditLogger.log({
        level: AuditLevel.CRITICAL,
        eventType: AuditEventType.CSRF_ATTACK_DETECTED,
        userId: authUser.id,
        userName: authUser.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        resource: 'case_canvas',
        action: 'delete',
        result: 'FAILURE',
      });
      return ErrorResponses.CSRF_INVALID();
    }

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    const access = await assertCaseAccess(caseId, authUser.id, PermissionCheckers.canViewAllCases(authUser));
    if (!access.ok) return access.error;

    const existing = await prisma.caseCanvas.findUnique({
      where: { caseId },
      select: { id: true },
    });
    if (!existing) {
      return ErrorResponses.NOT_FOUND('画布');
    }

    await prisma.caseCanvas.delete({ where: { caseId } });

    await publishCaseEvent(caseId, buildCaseEvent(caseId, 'canvas-update', { deleted: true }));

    await appendCaseEvent({
      caseId,
      eventType: 'CANVAS_DELETED',
      actorUserId: authUser.id,
      traceId,
      payload: { deleted: true },
    });

    await AuditLogger.log({
      level: AuditLevel.WARNING,
      eventType: AuditEventType.CASE_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'case_canvas',
      action: 'delete',
      details: { caseId },
      result: 'SUCCESS',
    });

    return createSuccessResponse(null, '删除画布成功');
  } catch (error) {
    logger.error({ err: error }, '删除画布失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}
