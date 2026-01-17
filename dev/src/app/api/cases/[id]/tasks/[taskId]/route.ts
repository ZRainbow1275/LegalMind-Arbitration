// dev/src/app/api/cases/[id]/tasks/[taskId]/route.ts
// 任务详情：更新状态/截止时间/描述等（后端闭环）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { CaseTaskStatus, Priority } from '@/generated/prisma';
import { requireCaseAccess } from '@/lib/case-guard';
import { logger } from '@/lib/logger';

const taskIdSchema = z.object({ id: uuidSchema, taskId: uuidSchema });

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.nativeEnum(CaseTaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, taskIdSchema);
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId, taskId } = pathValidation.data;

    const access = await requireCaseAccess({ caseId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const bodyValidation = await validateRequestBody(request, patchSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const task = await prisma.caseTask.findFirst({
      where: { id: taskId, caseId },
      include: {
        assignments: { where: { unassignedAt: null }, select: { userId: true } },
      },
    });
    if (!task) return ErrorResponses.NOT_FOUND('任务');

    const isAssignee = task.assignments.some((a) => a.userId === authUser.id);
    const canManage = PermissionCheckers.canManageCase(authUser);
    const isCreator = task.createdByUserId === authUser.id;

    if (!canManage && !isAssignee && !isCreator) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有修改此任务的权限');
    }

    const { title, description, status, priority, dueAt } = bodyValidation.data;
    const dueAtDate = dueAt === null ? null : dueAt ? new Date(dueAt) : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.caseTask.update({
        where: { id: taskId },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(priority !== undefined ? { priority } : {}),
          ...(dueAtDate !== undefined ? { dueAt: dueAtDate } : {}),
          ...(status === CaseTaskStatus.DONE ? { completedAt: new Date() } : {}),
        },
        include: {
          assignments: { where: { unassignedAt: null }, include: { user: { select: { id: true, email: true } } } },
          _count: { select: { comments: true } },
        },
      });

      await appendCaseEvent(
        {
          caseId,
          eventType: 'TASK_UPDATED',
          actorUserId: authUser.id,
          traceId,
          payload: {
            taskId,
            patch: {
              title: title ?? undefined,
              description: description === undefined ? undefined : description,
              status: status ?? undefined,
              priority: priority ?? undefined,
              dueAt: dueAtDate === undefined ? undefined : dueAtDate?.toISOString() ?? null,
            },
          },
        },
        tx
      );

      return updatedTask;
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_TASK_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'case_tasks',
      action: 'update',
      details: { traceId, caseId, taskId },
      result: 'SUCCESS',
    });

    return createSuccessResponse(updated, '任务已更新');
  } catch (error) {
    logger.error({ err: error, traceId }, '更新任务失败');
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
