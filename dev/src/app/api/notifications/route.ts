// dev/src/app/api/notifications/route.ts
// 通知中心（站内通知为主）：落库 + 严格鉴权 + CSRF（Cookie 会话写操作）
//
// 约束：
// - 禁止写入 user.metadata（会破坏用户表并造成不可控膨胀）
// - 禁止“模拟投递/模拟 AI 分析”：未配置的投递能力应显式返回错误或保持 PENDING，由队列/运维介入

import { NextRequest } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { calculatePagination, createSuccessResponse, ErrorResponses, parsePaginationParams } from '@/lib/api-response';
import { getTraceId } from '@/lib/case-events';
import { enqueueNotificationDelivery } from '@/lib/queue';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { NotificationStatus, NotificationType, Priority, Prisma, Role } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const channelSchema = z.enum(['in_app', 'email', 'sms', 'push']);
type DeliveryChannel = z.infer<typeof channelSchema>;

const notificationCreationSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, '通知标题不能为空').max(200, '通知标题不能超过200个字符'),
  content: z.string().min(1, '通知内容不能为空').max(1000, '通知内容不能超过1000个字符'),
  recipients: z.array(z.string().uuid()).min(1, '至少需要一个接收者'),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  channels: z
    .array(channelSchema)
    .min(1)
    .default(['in_app'])
    .refine((channels) => channels.includes('in_app'), {
      message: 'channels 必须包含 in_app',
    }),
  relatedEntity: z
    .object({
      type: z.string().min(1).optional(),
      id: z.string().uuid().optional(),
    })
    .optional(),
  scheduledAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

const notificationStatusSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1, '至少需要一个通知ID'),
  action: z.enum(['mark_read', 'mark_unread', 'archive']),
});

function buildDeliveryStatus(channels: DeliveryChannel[], opts: { scheduled: boolean }) {
  return {
    in_app: channels.includes('in_app') ? (opts.scheduled ? 'PENDING' : 'DELIVERED') : 'NOT_REQUIRED',
    email: channels.includes('email') ? 'PENDING' : 'NOT_REQUIRED',
    sms: channels.includes('sms') ? 'PENDING' : 'NOT_REQUIRED',
    push: channels.includes('push') ? 'PENDING' : 'NOT_REQUIRED',
  } as const;
}

function computeInitialStatus(opts: { scheduledAt: Date | null }) {
  if (opts.scheduledAt && opts.scheduledAt.getTime() > Date.now()) return NotificationStatus.PENDING;
  return NotificationStatus.DELIVERED;
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, {
      csrf: true,
      anyRole: [Role.ADMIN, Role.OPS_ADMIN],
      forbiddenMessage: '仅允许管理员发送通知',
    });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const traceId = getTraceId(request.headers);

    const validation = await validateRequestBody(request, notificationCreationSchema);
    if (!validation.success) return validation.error;

    const { type, title, content, recipients, priority, channels, relatedEntity, scheduledAt, expiresAt } =
      validation.data;

    const scheduledAtDate = scheduledAt ? new Date(scheduledAt) : null;
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
    const isScheduled = !!(scheduledAtDate && scheduledAtDate.getTime() > Date.now());

    if (expiresAtDate && scheduledAtDate && expiresAtDate <= scheduledAtDate) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('expiresAt 必须晚于 scheduledAt');
    }

    const foundRecipients = await prisma.user.findMany({
      where: { id: { in: recipients } },
      select: { id: true },
    });

    if (foundRecipients.length !== recipients.length) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('部分接收者不存在');
    }

      const deliveryStatus = buildDeliveryStatus(channels, { scheduled: isScheduled });
      const status = computeInitialStatus({ scheduledAt: scheduledAtDate });

      let relatedEntityJson: Prisma.InputJsonValue | undefined;
      if (relatedEntity) {
        try {
          relatedEntityJson = JSON.parse(JSON.stringify(relatedEntity)) as Prisma.InputJsonValue;
        } catch (error) {
          logger.error({ err: error }, '通知 relatedEntity 序列化失败');
          return ErrorResponses.BAD_REQUEST_MESSAGE('relatedEntity 格式无效');
        }
      }

      const created = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const recipient of foundRecipients) {
          results.push(
            await tx.notification.create({
              data: {
                userId: recipient.id,
                type,
                title,
                content,
                status,
                priority,
                channels,
                deliveryStatus,
                relatedEntity: relatedEntityJson,
                scheduledAt: scheduledAtDate,
                expiresAt: expiresAtDate,
                aiAnalysis: Prisma.DbNull,
              },
            })
          );
        }
        return results;
      });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.NOTIFICATION_CREATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'notifications',
      action: 'create',
      details: {
        traceId,
        type,
        recipientsCount: foundRecipients.length,
        channels,
        scheduledAt: scheduledAtDate?.toISOString() ?? null,
      },
      result: 'SUCCESS',
    });

    // 入队：用于延迟投递（scheduledAt）与多渠道投递（email/sms/push）
    const needsQueue =
      isScheduled || channels.some((c) => c === 'email' || c === 'sms' || c === 'push');
    if (needsQueue) {
      try {
        await Promise.all(
          created.map((n) =>
            enqueueNotificationDelivery(
              { notificationId: n.id, traceId },
              { runAt: isScheduled ? scheduledAtDate ?? undefined : undefined }
            )
          )
        );
      } catch (e) {
        await AuditLogger.log({
          level: AuditLevel.ERROR,
          eventType: AuditEventType.QUEUE_JOB_FAILED,
          userId: authUser.id,
          userName: authUser.email,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined,
          resource: 'queue',
          action: 'enqueue_notification_delivery',
          details: {
            traceId,
            notificationIds: created.map((n) => n.id),
            scheduledAt: scheduledAtDate?.toISOString() ?? null,
            channels,
          },
          result: 'FAILURE',
          errorMessage: e instanceof Error ? e.message : 'enqueue failed',
        });
      }
    }

    return createSuccessResponse(
      {
        notifications: created.map((n) => ({
          id: n.id,
          userId: n.userId,
          type: n.type,
          title: n.title,
          content: n.content,
          status: n.status,
          priority: n.priority,
          channels: n.channels,
          relatedEntity: n.relatedEntity,
          scheduledAt: n.scheduledAt,
          expiresAt: n.expiresAt,
          readAt: n.readAt,
          archivedAt: n.archivedAt,
          createdAt: n.createdAt,
        })),
      },
      '通知创建成功'
    );
  } catch (error) {
    logger.error({ err: error }, '创建通知失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);

    const typeRaw = searchParams.get('type');
    const statusRaw = searchParams.get('status');
    const priorityRaw = searchParams.get('priority');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const typeParsed = typeRaw ? z.nativeEnum(NotificationType).safeParse(typeRaw) : null;
    if (typeRaw && !typeParsed?.success) return ErrorResponses.BAD_REQUEST_MESSAGE('type 参数无效');

    const statusParsed = statusRaw ? z.nativeEnum(NotificationStatus).safeParse(statusRaw) : null;
    if (statusRaw && !statusParsed?.success) return ErrorResponses.BAD_REQUEST_MESSAGE('status 参数无效');

    const priorityParsed = priorityRaw ? z.nativeEnum(Priority).safeParse(priorityRaw) : null;
      if (priorityRaw && !priorityParsed?.success) return ErrorResponses.BAD_REQUEST_MESSAGE('priority 参数无效');

      const now = new Date();
      const where: Prisma.NotificationWhereInput = {
        userId: authUser.id,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        ...(typeParsed?.success ? { type: typeParsed.data } : {}),
        ...(statusParsed?.success ? { status: statusParsed.data } : {}),
        ...(priorityParsed?.success ? { priority: priorityParsed.data } : {}),
        ...(unreadOnly ? { status: { not: NotificationStatus.READ } } : {}),
      };

    const [total, notifications, unread] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId: authUser.id,
          status: { not: NotificationStatus.READ },
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        },
      }),
    ]);

    const pagination = calculatePagination(total, page, limit);

    return createSuccessResponse(
      {
        notifications,
        stats: {
          total,
          unread,
        },
      },
      '获取通知列表成功',
      { pagination }
    );
  } catch (error) {
    logger.error({ err: error }, '获取通知列表失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const traceId = getTraceId(request.headers);

    const validation = await validateRequestBody(request, notificationStatusSchema);
    if (!validation.success) return validation.error;

    const { notificationIds, action } = validation.data;

    const now = new Date();

    const updatedCount = await (async () => {
      if (action === 'mark_read') {
        const res = await prisma.notification.updateMany({
          where: { id: { in: notificationIds }, userId: authUser.id },
          data: { status: NotificationStatus.READ, readAt: now },
        });
        return res.count;
      }

      if (action === 'mark_unread') {
        const res = await prisma.notification.updateMany({
          where: { id: { in: notificationIds }, userId: authUser.id },
          data: { status: NotificationStatus.DELIVERED, readAt: null },
        });
        return res.count;
      }

      const res = await prisma.notification.updateMany({
        where: { id: { in: notificationIds }, userId: authUser.id },
        data: { status: NotificationStatus.ARCHIVED, archivedAt: now },
      });
      return res.count;
    })();

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.NOTIFICATION_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'notifications',
      action,
      details: {
        traceId,
        notificationIds,
        updatedCount,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      { updatedCount, action },
      action === 'mark_read'
        ? `成功标记已读 ${updatedCount} 条通知`
        : action === 'mark_unread'
          ? `成功标记未读 ${updatedCount} 条通知`
          : `成功归档 ${updatedCount} 条通知`
    );
  } catch (error) {
    logger.error({ err: error }, '更新通知状态失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
