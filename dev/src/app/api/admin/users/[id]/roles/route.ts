// dev/src/app/api/admin/users/[id]/roles/route.ts
// 运维后台：用户角色启用/停用（仅 OPS_ADMIN）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';
import { Role } from '@/generated/prisma';

const pathSchema = z.object({
  id: uuidSchema, // userId
});

const bodySchema = z.object({
  role: z.nativeEnum(Role),
  isActive: z.boolean(),
  reason: z.string().max(500).optional(),
});

async function requireOpsAdmin(request: NextRequest, csrf: boolean) {
  const guard = await requireAuthenticatedUser(request, {
    csrf,
    anyRole: [Role.OPS_ADMIN],
    forbiddenMessage: '需要运维管理员权限',
  });
  if (!guard.ok) return guard;
  return { ok: true as const, authUser: guard.user };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string | string[]>> }
) {
  const traceId = getTraceId(request.headers);
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const guard = await requireOpsAdmin(request, true);
    if (!guard.ok) return guard.response;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;

    const bodyValidation = await validateRequestBody(request, bodySchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const targetUserId = pathValidation.data.id;
    const { role, isActive, reason } = bodyValidation.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, status: true },
    });
    if (!targetUser) return ErrorResponses.NOT_FOUND('用户');

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.userRole.findMany({
        where: { userId: targetUserId, role },
        select: { id: true, isActive: true },
      });

      const existedCount = existing.length;
      const activeCount = existing.filter((r) => r.isActive).length;
      const previousActive = activeCount > 0;
      const alreadyInDesiredState =
        existedCount === 0
          ? false
          : isActive
            ? activeCount === existedCount
            : activeCount === 0;
      const changed = existedCount === 0 ? isActive : !alreadyInDesiredState;

      let operation: 'CREATED' | 'UPDATED' | 'NOOP' = 'NOOP';

      if (existedCount === 0) {
        if (isActive) {
          await tx.userRole.create({
            data: {
              userId: targetUserId,
              role,
              isActive: true,
              assignedAt: now,
              assignedBy: guard.authUser.id,
            },
          });
          operation = 'CREATED';
        }
      } else {
        if (changed) {
          await tx.userRole.updateMany({
            where: { userId: targetUserId, role },
            data: {
              isActive,
              assignedAt: now,
              assignedBy: guard.authUser.id,
            },
          });
          operation = 'UPDATED';
        }
      }

      const roles = await tx.userRole.findMany({
        where: { userId: targetUserId },
        select: {
          id: true,
          role: true,
          isActive: true,
          assignedAt: true,
          assignedBy: true,
        },
        orderBy: [{ role: 'asc' }, { assignedAt: 'desc' }],
      });

      return {
        operation,
        existedCount,
        previousActive,
        changed,
        roles,
      };
    });

    await AuditLogger.log({
      level: result.existedCount > 1 ? AuditLevel.WARNING : AuditLevel.INFO,
      eventType: AuditEventType.USER_ROLE_CHANGED,
      userId: guard.authUser.id,
      userName: guard.authUser.email,
      ipAddress,
      userAgent,
      resource: 'admin/users',
      action: 'set_role_active',
      details: {
        traceId,
        targetUserId,
        targetUserEmail: targetUser.email,
        role,
        isActive,
        operation: result.operation,
        previousActive: result.previousActive,
        changed: result.changed,
        duplicateRows: Math.max(0, result.existedCount - 1),
        reason: reason ?? null,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        userId: targetUserId,
        roles: result.roles.map((r) => ({
          ...r,
          assignedAt: r.assignedAt.toISOString(),
        })),
        traceId,
      },
      result.operation === 'NOOP' ? '角色状态未发生变化' : '角色已更新'
    );
    } catch (error) {
      logger.error({ err: error, traceId }, '更新用户角色失败');
      await AuditLogger.log({
        level: AuditLevel.ERROR,
        eventType: AuditEventType.USER_ROLE_CHANGED,
      ipAddress,
      userAgent,
      resource: 'admin/users',
      action: 'set_role_active',
      details: { traceId },
      result: 'FAILURE',
      errorMessage: error instanceof Error ? error.message : '未知错误',
    }).catch(() => undefined);
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
