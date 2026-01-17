// dev/src/app/api/cases/[id]/tasks/route.ts
// 案件任务：任务分配与进度跟踪（后端闭环）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { CaseTaskStatus, Priority, type Prisma } from '@/generated/prisma';
import { requireCaseAccess } from '@/lib/case-guard';
import { logger } from '@/lib/logger';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueAt: z.string().datetime().optional(),
  assigneeUserIds: z.array(uuidSchema).max(20).optional(),
});

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
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    const access = await requireCaseAccess({ caseId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const tasks = await prisma.caseTask.findMany({
      where: { caseId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: {
            user: { select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } } },
          },
        },
        _count: { select: { comments: true } },
      },
    });

    return createSuccessResponse({ traceId, tasks }, '获取任务列表成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '获取任务列表失败');
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
      return ErrorResponses.FORBIDDEN_MESSAGE('需要案件管理权限才能创建任务');
    }

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    const access = await requireCaseAccess({ caseId, authUser, mode: 'manage' });
    if (!access.ok) return access.response;

    const bodyValidation = await validateRequestBody(request, createTaskSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const { title, description, priority, dueAt, assigneeUserIds } = bodyValidation.data;
    const now = new Date();
    const dueAtDate = dueAt ? new Date(dueAt) : null;
    const assignees = Array.isArray(assigneeUserIds) ? assigneeUserIds : [];

    const created = await prisma.$transaction(async (tx) => {
      const task = await tx.caseTask.create({
        data: {
          caseId,
          title,
          description,
          status: CaseTaskStatus.TODO,
          priority: priority ?? Priority.MEDIUM,
          dueAt: dueAtDate,
          createdByUserId: authUser.id,
        },
        include: { assignments: true },
      });

      if (assignees.length > 0) {
        await tx.taskAssignment.createMany({
          data: assignees.map((userId) => ({
            taskId: task.id,
            userId,
            assignedByUserId: authUser.id,
            assignedAt: now,
            unassignedAt: null,
          })),
          skipDuplicates: true,
        });
      }

      await appendCaseEvent(
        {
          caseId,
          eventType: 'TASK_CREATED',
          actorUserId: authUser.id,
          traceId,
          payload: { taskId: task.id, title, priority: (priority ?? Priority.MEDIUM) as string, dueAt: dueAtDate?.toISOString() ?? null },
        },
        tx
      );

      return tx.caseTask.findUnique({
        where: { id: task.id },
        include: {
          assignments: { where: { unassignedAt: null }, include: { user: { select: { id: true, email: true } } } },
        },
      });
    });

    if (!created) return ErrorResponses.INTERNAL_ERROR();

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_TASK_CREATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'case_tasks',
      action: 'create',
      details: { traceId, caseId, taskId: created.id },
      result: 'SUCCESS',
    });

    return createSuccessResponse(created, '任务创建成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '创建任务失败');
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

