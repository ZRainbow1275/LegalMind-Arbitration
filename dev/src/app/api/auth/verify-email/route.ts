import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, generateVerificationToken } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getEnv } from '@/lib/env-validator';
import { getRedisManager } from '@/lib/redis';
import { sendEmail } from '@/lib/email';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

const EMAIL_TOKEN_PREFIX = 'email_verify:token:';
const EMAIL_USER_PREFIX = 'email_verify:user:';
const EMAIL_TOKEN_TTL_SECONDS = 60 * 60; // 1小时

const requestSchema = z
  .object({
    redirectUrl: z.string().url().optional(),
  })
  .strict();

function buildEmailHtml(params: { verificationUrl: string }): string {
  const escaped = params.verificationUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return [
    '<p>请点击以下链接完成邮箱验证（1小时内有效）：</p>',
    `<p><a href="${escaped}">${escaped}</a></p>`,
    '<p>如果这不是你的操作，请忽略此邮件。</p>',
  ].join('\n');
}

/**
 * 发送邮箱验证邮件（需要登录）
 * POST /api/auth/verify-email
 */
export async function POST(request: NextRequest) {
  const guard = await requireAuthenticatedUser(request, { csrf: true });
  if (!guard.ok) return guard.response;
  const authUser = guard.user;

  try {
    const env = getEnv();
    const redis = getRedisManager();

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user) return ErrorResponses.NOT_FOUND('用户');
    if (user.emailVerified) {
      return ErrorResponses.RESOURCE_CONFLICT('邮箱已验证');
    }

    const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('请求参数无效', parsed.error.issues);
    }

    const token = generateVerificationToken();
    const userKey = `${EMAIL_USER_PREFIX}${user.id}`;

    const existing = await redis.get<string>(userKey);
    if (existing) {
      await redis.del(`${EMAIL_TOKEN_PREFIX}${existing}`);
    }

    await redis.set(userKey, token, EMAIL_TOKEN_TTL_SECONDS);
    await redis.set(
      `${EMAIL_TOKEN_PREFIX}${token}`,
      { userId: user.id, email: user.email, issuedAt: new Date().toISOString() },
      EMAIL_TOKEN_TTL_SECONDS
    );

    const appUrl = env.NEXT_PUBLIC_APP_URL;
    const redirectBase = parsed.data.redirectUrl ?? `${appUrl}/verify-email`;
    const verificationUrl = `${redirectBase}${redirectBase.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'LegalMind 邮箱验证',
        text: `请打开链接完成邮箱验证（1小时内有效）：${verificationUrl}`,
        html: buildEmailHtml({ verificationUrl }),
      });
    } catch (error) {
      logger.error({ err: error }, '发送邮箱验证邮件失败');
      await redis.del(`${EMAIL_TOKEN_PREFIX}${token}`);
      await redis.del(userKey);
      return error instanceof Error && error.message === 'SERVICE_NOT_CONFIGURED'
        ? ErrorResponses.SERVICE_NOT_CONFIGURED('SMTP 邮件服务')
        : ErrorResponses.INTERNAL_ERROR();
    }

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.USER_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'auth',
      action: 'send_verify_email',
      details: { email: user.email },
      result: 'SUCCESS',
    });

    return createSuccessResponse({ sent: true }, '验证邮件已发送');
  } catch (error) {
    logger.error({ err: error }, '邮箱验证邮件发送失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 确认邮箱验证（公开端点）
 * GET /api/auth/verify-email?token=...
 */
export async function GET(request: NextRequest) {
  try {
    const redis = getRedisManager();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token')?.trim();
    if (!token) return ErrorResponses.BAD_REQUEST_MESSAGE('缺少 token');

    const payload = await redis.get<{ userId: string; email: string }>(`${EMAIL_TOKEN_PREFIX}${token}`);
    if (!payload?.userId) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('无效或已过期的 token');
    }

    await prisma.user.update({
      where: { id: payload.userId },
      data: { emailVerified: true },
    });

    await redis.del(`${EMAIL_TOKEN_PREFIX}${token}`);
    await redis.del(`${EMAIL_USER_PREFIX}${payload.userId}`);

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.USER_UPDATED,
      userId: payload.userId,
      userName: payload.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'auth',
      action: 'verify_email',
      result: 'SUCCESS',
    });

    return createSuccessResponse({ verified: true }, '邮箱验证成功');
  } catch (error) {
    logger.error({ err: error }, '邮箱验证失败');
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
