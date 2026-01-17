// dev/src/app/api/cases/[id]/tasks/[taskId]/assign/route.ts
// 任务分配：指派/取消指派（案件管理者）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { requireCaseAccess } from '@/lib/case-guard';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ id: uuidSchema, taskId: uuidSchema });

const assignSchema = z.object({
  userId: uuidSchema,
  action: z.enum(['ASSIGN', 'UNASSIGN']).default('ASSIGN'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    if (!PermissionCheckers.canManageCase(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('需要案件管理权限才能分配任务');
    }

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId, taskId } = pathValidation.data;

    const access = await requireCaseAccess({ caseId, authUser, mode: 'manage' });
    if (!access.ok) return access.response;

    const bodyValidation = await validateRequestBody(request, assignSchema);
    if (!bodyValidation.success) return bodyValidation.error;
    const { userId, action } = bodyValidation.data;

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const task = await tx.caseTask.findFirst({
        where: { id: taskId, caseId },
        select: { id: true, caseId: true, title: true },
      });
      if (!task) return { kind: 'not_found' as const };

      if (action === 'UNASSIGN') {
        const assignment = await tx.taskAssignment.findUnique({
          where: { taskId_userId: { taskId, userId } },
        });
        if (!assignment) return { kind: 'ok' as const };

        await tx.taskAssignment.update({
          where: { taskId_userId: { taskId, userId } },
          data: { unassignedAt: now },
        });

        await appendCaseEvent(
          {
            caseId,
            eventType: 'TASK_UNASSIGNED',
            actorUserId: authUser.id,
            traceId,
            payload: { taskId, userId, at: now.toISOString() },
          },
          tx
        );

        return { kind: 'ok' as const };
      }

      await tx.taskAssignment.upsert({
        where: { taskId_userId: { taskId, userId } },
        create: {
          taskId,
          userId,
          assignedByUserId: authUser.id,
          assignedAt: now,
          unassignedAt: null,
        },
        update: {
          assignedByUserId: authUser.id,
          assignedAt: now,
          unassignedAt: null,
        },
      });

      await appendCaseEvent(
        {
          caseId,
          eventType: 'TASK_ASSIGNED',
          actorUserId: authUser.id,
          traceId,
          payload: { taskId, userId, at: now.toISOString() },
        },
        tx
      );

      return { kind: 'ok' as const };
    });

    if (updated.kind === 'not_found') return ErrorResponses.NOT_FOUND('任务');  

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType:
        action === 'UNASSIGN'
          ? AuditEventType.CASE_TASK_UNASSIGNED
          : AuditEventType.CASE_TASK_ASSIGNED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'case_tasks',
      action: 'assign',
      details: { traceId, caseId, taskId, userId, action },
      result: 'SUCCESS',
    });

    return createSuccessResponse({ ok: true, taskId, userId, action }, '任务分配已更新');
  } catch (error) {
    logger.error({ err: error, traceId }, '任务分配失败');
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
