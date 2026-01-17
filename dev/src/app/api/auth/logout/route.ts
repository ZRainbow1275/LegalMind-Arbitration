// dev/src/app/api/auth/logout/route.ts
// 用户登出：对齐 docs/API_REFERENCE.md 的 POST /api/auth/logout
//
// 说明：
// - Cookie 会话必须做 CSRF 校验（双提交 Cookie + header）
// - 采用 JWT jti 黑名单撤销，避免“仅清 Cookie = 仍可复用已泄露 token”
import { NextRequest } from 'next/server';

import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  getTokenPayloadFromRequest,
  requireAuthenticatedUser,
  revokeToken,
} from '@/lib/auth';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const guard = await requireAuthenticatedUser(request, { csrf: true });
  if (!guard.ok) return guard.response;

  const authUser = guard.user;
  const tokenPayload = getTokenPayloadFromRequest(request);

  let tokenRevoked = false;
  try {
    await revokeToken(authUser.tokenId, tokenPayload?.exp);
    tokenRevoked = true;
  } catch (error) {
    logger.error({ err: error, tokenId: authUser.tokenId }, 'Logout token revoke failed');
  }

  try {
    await AuditLogger.log({
      level: tokenRevoked ? AuditLevel.INFO : AuditLevel.WARNING,
      eventType: AuditEventType.USER_LOGOUT,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'auth',
      action: 'logout',
      details: { tokenRevoked },
      result: tokenRevoked ? 'SUCCESS' : 'FAILURE',
      errorMessage: tokenRevoked ? undefined : 'TOKEN_REVOCATION_FAILED',
    });
  } catch {
    // 避免登出流程因审计写入失败而阻断
  }

  const response = createSuccessResponse(
    { ok: true, tokenRevoked },
    tokenRevoked ? '退出登录成功' : '已退出登录（服务端注销失败）'
  );

  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('csrf-token', '', {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
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
