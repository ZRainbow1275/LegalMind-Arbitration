import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getRedisManager } from '@/lib/redis';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const PHONE_TOKEN_PREFIX = 'phone_verify:token:';
const PHONE_USER_PREFIX = 'phone_verify:user:';
const PHONE_RATE_PREFIX = 'phone_verify:rate:';

const confirmSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, '验证码格式不正确'),
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

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * 确认手机号验证码（需要登录）
 * POST /api/auth/verify-phone/confirm
 */
export async function POST(request: NextRequest) {
  const guard = await requireAuthenticatedUser(request, { csrf: true });
  if (!guard.ok) return guard.response;
  const authUser = guard.user;

  try {
    const parsed = confirmSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('请求参数无效', parsed.error.issues);
    }

    const redis = getRedisManager();
    const userKey = `${PHONE_USER_PREFIX}${authUser.id}`;
    const token = await redis.get<string>(userKey);
    if (!token) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('无有效的手机号验证请求，请先发送验证码');
    }

    const payload = await redis.get<{
      userId: string;
      phone: string;
      codeHash: string;
      salt: string;
    }>(`${PHONE_TOKEN_PREFIX}${token}`);

    if (!payload?.userId || payload.userId !== authUser.id) {
      await redis.del(userKey);
      if (token) await redis.del(`${PHONE_TOKEN_PREFIX}${token}`);
      return ErrorResponses.BAD_REQUEST_MESSAGE('验证码已过期或无效，请重新发送');
    }

    const expectedHash = hashCode({ code: parsed.data.code, salt: payload.salt });
    if (!timingSafeEqualHex(expectedHash, payload.codeHash)) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('验证码错误');
    }

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        phone: payload.phone,
        phoneVerified: true,
      },
      select: { id: true, email: true, phone: true, phoneVerified: true },
    });

    await redis.del(`${PHONE_TOKEN_PREFIX}${token}`);
    await redis.del(userKey);
    await redis.del(`${PHONE_RATE_PREFIX}${authUser.id}`);

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.USER_UPDATED,
      userId: updated.id,
      userName: updated.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'auth',
      action: 'verify_phone',
      details: { phone: updated.phone ? maskPhone(updated.phone) : null },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      { verified: true, phone: updated.phone ? maskPhone(updated.phone) : null },
      '手机号验证成功'
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target;
      const targets = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
      if (targets.includes('phone')) {
        return ErrorResponses.DUPLICATE_RESOURCE('手机号已被占用');
      }
    }

    logger.error({ err: error }, '手机号验证失败');
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

