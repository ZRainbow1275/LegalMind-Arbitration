import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { requireAuthenticatedUser, verifyPassword } from '@/lib/auth';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { EncryptionUtil } from '@/lib/security/encryption';
import { parseStoredRecoveryCodes, verifyAndConsumeRecoveryCode } from '@/lib/security/mfa';
import { verifyTotpCode } from '@/lib/security/totp';

const disableSchema = z
  .object({
    password: z.string().min(1),
    code: z.string().trim().min(6).max(64),
  })
  .strict();

export async function POST(request: NextRequest) {
  const guard = await requireAuthenticatedUser(request, { csrf: true });
  if (!guard.ok) return guard.response;
  const authUser = guard.user;

  const validation = await validateRequestBody(request, disableSchema);
  if (!validation.success) return validation.error;

  const { password, code } = validation.data;

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { mfa: true },
  });
  if (!user) return ErrorResponses.NOT_FOUND('用户');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return ErrorResponses.BAD_REQUEST_MESSAGE('密码错误');

  if (!user.mfa?.enabled || !user.mfa.totpSecretEnc) {
    return ErrorResponses.RESOURCE_CONFLICT('MFA 未启用');
  }

  const secretBase32 = EncryptionUtil.decrypt(user.mfa.totpSecretEnc);
  const totp = verifyTotpCode({ secretBase32, code, window: 1 });
  if (!totp.ok) {
    const storedRecovery = parseStoredRecoveryCodes(user.mfa.recoveryCodes);
    if (!storedRecovery) return ErrorResponses.MFA_INVALID({ reason: totp.reason });

    const recovery = verifyAndConsumeRecoveryCode({ stored: storedRecovery, code });
    if (!recovery.ok) return ErrorResponses.MFA_INVALID({ totpReason: totp.reason, recoveryReason: recovery.reason });
  }

  await prisma.userMfa.delete({ where: { userId: user.id } });

  await AuditLogger.log({
    level: AuditLevel.INFO,
    eventType: AuditEventType.USER_MFA_DISABLED,
    userId: authUser.id,
    userName: authUser.email,
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
    resource: 'auth/mfa/totp',
    action: 'disable',
    result: 'SUCCESS',
  });

  return createSuccessResponse({ enabled: false }, 'MFA 已禁用');
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

