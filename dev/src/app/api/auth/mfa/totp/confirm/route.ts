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
import { generateRecoveryCodes } from '@/lib/security/mfa';
import { verifyTotpCode } from '@/lib/security/totp';

const confirmSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(1),
    code: z.string().trim().min(6).max(64),
  })
  .strict();

export async function POST(request: NextRequest) {
  const validation = await validateRequestBody(request, confirmSchema);
  if (!validation.success) return validation.error;

  const { email, password, code } = validation.data;

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

  if (!user.mfa?.totpSecretEnc) {
    return ErrorResponses.BAD_REQUEST_MESSAGE('请先生成 MFA 密钥');
  }

  if (user.mfa.enabled) {
    return ErrorResponses.RESOURCE_CONFLICT('MFA 已启用');
  }

  const secretBase32 = EncryptionUtil.decrypt(user.mfa.totpSecretEnc);
  const totp = verifyTotpCode({ secretBase32, code, window: 1 });
  if (!totp.ok) {
    return ErrorResponses.MFA_INVALID({ reason: totp.reason });
  }

  const { recoveryCodes, stored } = generateRecoveryCodes(10);

  await prisma.userMfa.update({
    where: { userId: user.id },
    data: {
      enabled: true,
      verifiedAt: new Date(),
      recoveryCodes: stored,
    },
  });

  await AuditLogger.log({
    level: AuditLevel.INFO,
    eventType: AuditEventType.USER_MFA_ENABLED,
    userId: actor?.id ?? user.id,
    userName: actor?.email ?? user.email,
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
    resource: 'auth/mfa/totp',
    action: 'confirm',
    details: {
      targetUserId: user.id,
      targetEmail: user.email,
    },
    result: 'SUCCESS',
  });

  return createSuccessResponse(
    {
      enabled: true,
      recoveryCodes,
    },
    'MFA 已启用'
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

