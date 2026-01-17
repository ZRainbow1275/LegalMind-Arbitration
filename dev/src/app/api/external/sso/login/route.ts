// dev/src/app/api/external/sso/login/route.ts
// 兼容 docs/API_REFERENCE.md：POST /api/external/sso/login
//
// 安全说明：
// - SSO 回调必须校验 state（防 CSRF/重放）。本接口要求调用方提供 state。
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/auth';
import { CSRFProtection } from '@/lib/security/middleware';
import { getSSOManager } from '@/lib/sso';
import { logger } from '@/lib/logger';

const schema = z.object({
  provider: z.string().min(1).max(50),
  code: z.string().min(1).max(2000),
  state: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('请求参数无效', parsed.error.issues);
    }

    const { provider, code, state } = parsed.data;
    const ssoManager = getSSOManager();

    if (!ssoManager.validateState(state)) {
      return ErrorResponses.BAD_REQUEST('无效的 state 参数');
    }

    const result = await ssoManager.handleCallback(provider, code, state);

    const response = createSuccessResponse(
      {
        user: result.user,
        token: result.token,
        expiresIn: result.expiresIn,
        isNewUser: result.isNewUser,
        loginMethod: 'sso',
      },
      'SSO 登录成功'
    );

    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    const csrfToken = CSRFProtection.generateToken(result.tokenId);
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error({ err: error }, 'SSO login 失败');
    if (error instanceof Error && error.message.includes('未配置')) {
      return ErrorResponses.BAD_REQUEST(error.message);
    }
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

