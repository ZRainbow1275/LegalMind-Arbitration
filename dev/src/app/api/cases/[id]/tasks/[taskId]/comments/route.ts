// dev/src/app/api/cases/[id]/tasks/[taskId]/comments/route.ts
// 任务评论：用于协作与留痕（案件参与人）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { requireCaseAccess } from '@/lib/case-guard';
import { logger } from '@/lib/logger';

const pathSchema = z.object({ id: uuidSchema, taskId: uuidSchema });

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId, taskId } = pathValidation.data;

    const access = await requireCaseAccess({ caseId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const task = await prisma.caseTask.findFirst({ where: { id: taskId, caseId }, select: { id: true } });
    if (!task) return ErrorResponses.NOT_FOUND('任务');

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } } } },
    });

    return createSuccessResponse({ traceId, comments }, '获取评论成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '获取任务评论失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId, taskId } = pathValidation.data;

    const access = await requireCaseAccess({ caseId, authUser, mode: 'view' });
    if (!access.ok) return access.response;

    const bodyValidation = await validateRequestBody(request, createCommentSchema);
    if (!bodyValidation.success) return bodyValidation.error;
    const { content } = bodyValidation.data;

    const created = await prisma.$transaction(async (tx) => {
      const task = await tx.caseTask.findFirst({ where: { id: taskId, caseId }, select: { id: true, title: true } });
      if (!task) return { kind: 'not_found' as const };

      const comment = await tx.taskComment.create({
        data: {
          taskId,
          authorUserId: authUser.id,
          content,
        },
        include: { author: { select: { id: true, email: true } } },
      });

      await appendCaseEvent(
        {
          caseId,
          eventType: 'TASK_COMMENTED',
          actorUserId: authUser.id,
          traceId,
          payload: { taskId, commentId: comment.id, at: comment.createdAt.toISOString() },
        },
        tx
      );

      return { kind: 'ok' as const, comment };
    });

    if (created.kind === 'not_found') return ErrorResponses.NOT_FOUND('任务');

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.CASE_TASK_COMMENTED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'case_tasks',
      action: 'comment',
      details: { traceId, caseId, taskId, commentId: created.comment.id },
      result: 'SUCCESS',
    });

    return createSuccessResponse(created.comment, '评论已添加');
  } catch (error) {
    logger.error({ err: error, traceId }, '添加任务评论失败');
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

