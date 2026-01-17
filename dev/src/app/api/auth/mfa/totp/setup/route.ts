import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import {
  getAuthenticatedUser,
  requireAuthenticatedUser,
  verifyPassword,
} from '@/lib/auth';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { EncryptionUtil } from '@/lib/security/encryption';
import { generateTotpSecretBase32, buildTotpOtpauthUri } from '@/lib/security/totp';
import { getEnv } from '@/lib/env-validator';
import { Prisma } from '@/generated/prisma';

const setupSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(1),
  })
  .strict();

export async function POST(request: NextRequest) {
  const validation = await validateRequestBody(request, setupSchema);
  if (!validation.success) return validation.error;

  const { email, password } = validation.data;

  const sessionUser = await getAuthenticatedUser(request);
  let targetEmail: string | null = null;
  let actor: { id: string; email: string } | null = null;

  if (sessionUser) {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    targetEmail = guard.user.email;
    actor = { id: guard.user.id, email: guard.user.email };
  } else {
    if (!email) return ErrorResponses.UNAUTHORIZED();
    targetEmail = email;
  }

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    include: { roles: true, mfa: true },
  });

  if (!user) return ErrorResponses.BAD_REQUEST_MESSAGE('邮箱或密码错误');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return ErrorResponses.BAD_REQUEST_MESSAGE('邮箱或密码错误');

  if (user.mfa?.enabled) {
    return ErrorResponses.RESOURCE_CONFLICT('MFA 已启用，无需重复设置');
  }

  const secretBase32 = generateTotpSecretBase32(20);
  const encrypted = EncryptionUtil.encrypt(secretBase32);

  await prisma.userMfa.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      totpSecretEnc: encrypted,
      enabled: false,
      verifiedAt: null,
      recoveryCodes: Prisma.DbNull,
    },
    update: {
      totpSecretEnc: encrypted,
      enabled: false,
      verifiedAt: null,
      recoveryCodes: Prisma.DbNull,
    },
  });

  const env = getEnv();
  const issuer = env.NEXT_PUBLIC_APP_NAME || 'LegalMind';
  const otpauthUri = buildTotpOtpauthUri({
    issuer,
    accountName: user.email,
    secretBase32,
  });

  const actorUserId = actor?.id ?? user.id;

  await AuditLogger.log({
    level: AuditLevel.INFO,
    eventType: AuditEventType.USER_MFA_SETUP_GENERATED,
    userId: actorUserId,
    userName: actor?.email ?? user.email,
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
    resource: 'auth/mfa/totp',
    action: 'setup',
    details: {
      targetUserId: user.id,
      targetEmail: user.email,
    },
    result: 'SUCCESS',
  });

  return createSuccessResponse(
    {
      issuer,
      accountName: user.email,
      secretBase32,
      otpauthUri,
    },
    'MFA 密钥已生成'
  );
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
