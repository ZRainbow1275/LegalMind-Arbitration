import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, generateVerificationToken } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getRedisManager } from '@/lib/redis';
import { phoneSchema } from '@/lib/validation';
import { sendSms } from '@/lib/sms';
import { getEnv } from '@/lib/env-validator';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const PHONE_TOKEN_PREFIX = 'phone_verify:token:';
const PHONE_USER_PREFIX = 'phone_verify:user:';
const PHONE_RATE_PREFIX = 'phone_verify:rate:';

const PHONE_TOKEN_TTL_SECONDS = 10 * 60; // 10分钟
const PHONE_RATE_TTL_SECONDS = 60; // 60秒

const requestSchema = z
  .object({
    phone: phoneSchema.optional(),
  })
  .strict();

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

function hashCode(params: { code: string; salt: string }): string {
  return crypto.createHash('sha256').update(`${params.salt}:${params.code}`).digest('hex');
}

function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * 发送手机号验证码（需要登录）
 * POST /api/auth/verify-phone
 */
export async function POST(request: NextRequest) {
  const guard = await requireAuthenticatedUser(request, { csrf: true });
  if (!guard.ok) return guard.response;
  const authUser = guard.user;

  try {
    const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('请求参数无效', parsed.error.issues);
    }

    const redis = getRedisManager();
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, email: true, phone: true, phoneVerified: true },
    });
    if (!user) return ErrorResponses.NOT_FOUND('用户');

    const phone = parsed.data.phone ?? user.phone;
    if (!phone) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('请先设置手机号或在请求中提供 phone');
    }

    if (user.phoneVerified && user.phone === phone) {
      return ErrorResponses.RESOURCE_CONFLICT('手机号已验证');
    }

    const rateKey = `${PHONE_RATE_PREFIX}${user.id}`;
    const rate = await redis.get<string>(rateKey);
    if (rate) {
      const response = createErrorResponse(
        'RATE_LIMITED',
        '请求过于频繁，请稍后再试',
        { retryAfterSeconds: PHONE_RATE_TTL_SECONDS },
        429
      );
      response.headers.set('Retry-After', String(PHONE_RATE_TTL_SECONDS));
      return response;
    }

    const token = generateVerificationToken();
    const userKey = `${PHONE_USER_PREFIX}${user.id}`;

    const existing = await redis.get<string>(userKey);
    if (existing) {
      await redis.del(`${PHONE_TOKEN_PREFIX}${existing}`);
    }

    const code = generateCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const codeHash = hashCode({ code, salt });

    await redis.set(userKey, token, PHONE_TOKEN_TTL_SECONDS);
    await redis.set(
      `${PHONE_TOKEN_PREFIX}${token}`,
      {
        userId: user.id,
        phone,
        codeHash,
        salt,
        issuedAt: new Date().toISOString(),
      },
      PHONE_TOKEN_TTL_SECONDS
    );
    await redis.set(rateKey, '1', PHONE_RATE_TTL_SECONDS);

    try {
      const env = getEnv();
      const templateCode = env.SMS_TEMPLATE_CODE_VERIFY_PHONE ?? env.SMS_TEMPLATE_CODE;
      await sendSms({
        to: phone,
        templateParams: { code },
        templateCode,
        outId: token,
      });
    } catch (error) {
      logger.error({ err: error }, '发送短信验证码失败');
      await redis.del(`${PHONE_TOKEN_PREFIX}${token}`);
      await redis.del(userKey);
      await redis.del(rateKey);
      return error instanceof Error && error.message === 'SERVICE_NOT_CONFIGURED'
        ? ErrorResponses.SERVICE_NOT_CONFIGURED('短信服务')
        : error instanceof Error && error.message === 'NOT_IMPLEMENTED'
          ? ErrorResponses.NOT_IMPLEMENTED('当前 SMS_PROVIDER 尚未实现')
          : ErrorResponses.INTERNAL_ERROR();
    }

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.USER_UPDATED,
      userId: user.id,
      userName: user.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'auth',
      action: 'send_verify_phone',
      details: { phone: maskPhone(phone) },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        sent: true,
        phone: maskPhone(phone),
        expiresInSeconds: PHONE_TOKEN_TTL_SECONDS,
      },
      '短信验证码已发送'
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target;
      const targets = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
      if (targets.includes('phone')) {
        return ErrorResponses.DUPLICATE_RESOURCE('手机号已被占用');
      }
    }

    logger.error({ err: error }, '手机号验证码发送失败');
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
