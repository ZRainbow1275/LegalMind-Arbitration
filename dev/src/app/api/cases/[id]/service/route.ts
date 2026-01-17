// dev/src/app/api/cases/[id]/service/route.ts
// 电子送达：创建送达任务 + 查询送达记录（Phase 5.3 合规硬链路）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validatePathParams, validateRequestBody, validateSearchParams, uuidSchema } from '@/lib/validation';
import {
  calculatePagination,
  createPaginatedResponse,
  createSuccessResponse,
  ErrorResponses,
  parsePaginationParams,
} from '@/lib/api-response';
import { ServiceChannel, ServiceStatus, type Prisma } from '@/generated/prisma';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { enqueueServiceDelivery } from '@/lib/queue';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(ServiceStatus).optional(),
  channel: z.nativeEnum(ServiceChannel).optional(),
});

const createServiceSchema = z
  .object({
    documentId: z.string().uuid().optional(),
    channel: z.nativeEnum(ServiceChannel).optional().default(ServiceChannel.EMAIL),
    recipient: z
      .object({
        name: z.string().max(200).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(20).optional(),
      })
      .strict(),
    subject: z.string().max(200).optional(),
    message: z.string().max(20000).optional(),
    legalBasis: z.string().max(200).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.channel === ServiceChannel.EMAIL && !data.recipient.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipient', 'email'],
        message: 'EMAIL 送达需要提供收件邮箱',
      });
    }
    if (data.channel === ServiceChannel.SMS && !data.recipient.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipient', 'phone'],
        message: 'SMS 送达需要提供手机号',
      });
    }
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
        participants: {
          where: { userId: authUser.id, isActive: true },
          select: { id: true },
        },
      },
    });
    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const hasCaseAccess =
      PermissionCheckers.canViewAllCases(authUser)
      || arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id
      || arbitrationCase.participants.length > 0;

    if (!hasCaseAccess) return ErrorResponses.FORBIDDEN();

    const { page, limit } = parsePaginationParams(searchParams);

    const where: Prisma.ServiceOfProcessWhereInput = {
      caseId,
      ...(queryValidation.data.status ? { status: queryValidation.data.status } : {}),
      ...(queryValidation.data.channel ? { channel: queryValidation.data.channel } : {}),
    };

    const total = await prisma.serviceOfProcess.count({ where });
    const pagination = calculatePagination(total, page, limit);

    const records = await prisma.serviceOfProcess.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { attempts: true } },
        document: { select: { id: true, originalName: true, fileHash: true } },
      },
    });

    return createPaginatedResponse(records, pagination, '送达记录获取成功');
  } catch (error) {
    logger.error({ err: error }, '获取送达记录失败');
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
      return ErrorResponses.FORBIDDEN_MESSAGE('仅仲裁机构/仲裁员/调解员可发起送达');
    }

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: caseId } = pathValidation.data;

    const validation = await validateRequestBody(request, createServiceSchema);
    if (!validation.success) return validation.error;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        title: true,
      },
    });
    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const channel = validation.data.channel;
    const recipientName = validation.data.recipient.name?.trim() || null;
    const recipientEmail = validation.data.recipient.email?.trim() || null;
    const recipientPhone = validation.data.recipient.phone?.trim() || null;

    let document: { id: string; originalName: string; fileHash: string | null } | null = null;
    if (validation.data.documentId) {
      document = await prisma.caseDocument.findFirst({
        where: { id: validation.data.documentId, caseId },
        select: { id: true, originalName: true, fileHash: true },
      });
      if (!document) return ErrorResponses.BAD_REQUEST_MESSAGE('送达文档不存在或不属于该案件');
    }

    const subject =
      (validation.data.subject && validation.data.subject.trim()) ||
      `【LegalMind】案件电子送达：${arbitrationCase.caseNumber}`;

    const message =
      (validation.data.message && validation.data.message.trim()) ||
      [
        `案件编号：${arbitrationCase.caseNumber}`,
        arbitrationCase.title ? `案件标题：${arbitrationCase.title}` : null,
        document ? `送达文档：${document.originalName}` : null,
        '请登录系统查收并留存。',
      ]
        .filter(Boolean)
        .join('\n');

    const legalBasis = validation.data.legalBasis?.trim() || null;

    const created = await prisma.$transaction(async (tx) => {
      const service = await tx.serviceOfProcess.create({
        data: {
          caseId,
          documentId: document?.id,
          channel,
          status: ServiceStatus.PENDING,
          recipientName,
          recipientEmail,
          recipientPhone,
          subject,
          message,
          legalBasis,
          requestedByUserId: authUser.id,
          traceId,
        },
      });

      await appendCaseEvent(
        {
          caseId,
          eventType: 'SERVICE_REQUESTED',
          actorUserId: authUser.id,
          traceId,
          payload: {
            serviceId: service.id,
            channel,
            recipient: {
              name: recipientName,
              email: recipientEmail,
              phone: recipientPhone,
            },
            documentId: document?.id ?? null,
          },
        },
        tx
      );

      return service;
    });

    try {
      await enqueueServiceDelivery({ serviceId: created.id, traceId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, traceId, serviceId: created.id }, '送达任务入队失败');

      await prisma.serviceOfProcess.update({
        where: { id: created.id },
        data: { status: ServiceStatus.FAILED, lastError: `QUEUE_ENQUEUE_FAILED: ${message}`.slice(0, 1000) },
      });

      await appendCaseEvent({
        caseId,
        eventType: 'SERVICE_ENQUEUE_FAILED',
        actorUserId: authUser.id,
        traceId,
        payload: { serviceId: created.id, error: message },
      });

      return ErrorResponses.INTERNAL_ERROR();
    }

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.SERVICE_OF_PROCESS_CREATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'service_of_process',
      action: 'create',
      details: {
        traceId,
        caseId,
        serviceId: created.id,
        channel,
        recipientEmail,
        recipientPhone,
        documentId: document?.id ?? null,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse({ service: created, traceId }, '送达任务已创建并入队');
  } catch (error) {
    logger.error({ err: error, traceId }, '创建送达任务失败');
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

