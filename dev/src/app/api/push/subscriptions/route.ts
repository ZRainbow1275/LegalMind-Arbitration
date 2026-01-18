import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

const pushSubscriptionUpsertSchema = z.object({
  endpoint: z.string().url().min(1),
  keys: pushSubscriptionKeysSchema,
  expirationTime: z.number().int().nullable().optional(),
});

const pushSubscriptionDisableSchema = z
  .object({
    id: z.string().uuid().optional(),
    endpoint: z.string().url().optional(),
  })
  .refine((data) => !!(data.id || data.endpoint), {
    message: 'id 或 endpoint 至少提供一个',
  });

function hashEndpoint(endpoint: string): string {
  return crypto.createHash('sha256').update(endpoint).digest('hex');
}

/**
 * WebPush 订阅管理（用户级）
 * - GET: 列出当前用户订阅
 * - POST: upsert 当前用户订阅
 * - DELETE: 软禁用订阅（幂等）
 */
export async function GET(request: NextRequest) {
  const guard = await requireAuthenticatedUser(request, { csrf: false });
  if (!guard.ok) return guard.response;

  const subscriptions = await prisma.webPushSubscription.findMany({
    where: { userId: guard.user.id, isActive: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userAgent: true,
      expirationTime: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return createSuccessResponse({ subscriptions }, 'OK');
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;

    const traceId = getTraceId(request.headers);

    const validation = await validateRequestBody(request, pushSubscriptionUpsertSchema);
    if (!validation.success) return validation.error;

    const endpointHash = hashEndpoint(validation.data.endpoint);

    const expirationTimeCandidate =
      typeof validation.data.expirationTime === 'number'
        ? new Date(validation.data.expirationTime)
        : null;
    const expirationTime =
      expirationTimeCandidate && !Number.isNaN(expirationTimeCandidate.getTime())
        ? expirationTimeCandidate
        : null;

    const subscription = await prisma.webPushSubscription.upsert({
      where: { endpoint: validation.data.endpoint },
      create: {
        userId: guard.user.id,
        endpoint: validation.data.endpoint,
        p256dh: validation.data.keys.p256dh,
        auth: validation.data.keys.auth,
        userAgent: request.headers.get('user-agent') ?? undefined,
        expirationTime,
        isActive: true,
        disabledAt: null,
      },
      update: {
        userId: guard.user.id,
        p256dh: validation.data.keys.p256dh,
        auth: validation.data.keys.auth,
        userAgent: request.headers.get('user-agent') ?? undefined,
        expirationTime,
        isActive: true,
        disabledAt: null,
      },
      select: {
        id: true,
        userAgent: true,
        expirationTime: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.WEB_PUSH_SUBSCRIPTION_UPSERTED,
      userId: guard.user.id,
      userName: guard.user.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'web_push_subscriptions',
      action: 'upsert',
      details: {
        traceId,
        subscriptionId: subscription.id,
        endpointHash,
        expirationTime: subscription.expirationTime?.toISOString() ?? null,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse({ subscription }, 'OK');
  } catch (error) {
    logger.error({ err: error }, '保存 WebPush 订阅失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;

    const traceId = getTraceId(request.headers);

    const validation = await validateRequestBody(request, pushSubscriptionDisableSchema);
    if (!validation.success) return validation.error;

    const now = new Date();

    const where = validation.data.id
      ? { id: validation.data.id }
      : { endpoint: validation.data.endpoint! };

    const existing = await prisma.webPushSubscription.findFirst({
      where: { ...where, userId: guard.user.id },
      select: { id: true, endpoint: true },
    });

    if (!existing) {
      return createSuccessResponse({ disabled: false }, 'OK');
    }

    const endpointHash = hashEndpoint(existing.endpoint);

    await prisma.webPushSubscription.update({
      where: { id: existing.id },
      data: { isActive: false, disabledAt: now },
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.WEB_PUSH_SUBSCRIPTION_DISABLED,
      userId: guard.user.id,
      userName: guard.user.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'web_push_subscriptions',
      action: 'disable',
      details: {
        traceId,
        subscriptionId: existing.id,
        endpointHash,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse({ disabled: true }, 'OK');
  } catch (error) {
    logger.error({ err: error }, '禁用 WebPush 订阅失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}
