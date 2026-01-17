// dev/src/app/api/auth/oidc/start/route.ts
// OIDC 登录起始入口（D2B）：生成 state + PKCE 并跳转到 IdP

import { NextRequest, NextResponse } from 'next/server';
import { createAuthorizationUrl, type OidcClientKind } from '@/lib/security/oidc';
import { ErrorResponses } from '@/lib/api-response';
import { logger } from '@/lib/logger';

function isSafeReturnTo(value: string): boolean {
  // 只允许站内相对路径，避免 open redirect
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('://');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnToRaw = searchParams.get('returnTo') || '/role-selection';
    const client = (searchParams.get('client') || 'app') as OidcClientKind;

    const returnTo = isSafeReturnTo(returnToRaw) ? returnToRaw : '/role-selection';

    if (client !== 'app' && client !== 'ops') {
      return ErrorResponses.BAD_REQUEST_MESSAGE('无效的 client 参数');
    }

    const { authorizationUrl } = await createAuthorizationUrl({ clientKind: client, returnTo });
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    logger.error({ err: error }, 'OIDC start 失败');
    return ErrorResponses.INTERNAL_SERVER_ERROR('OIDC 登录初始化失败，请联系管理员');
  }
}

export async function POST() {
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
