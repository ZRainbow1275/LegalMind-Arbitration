// dev/src/app/api/auth/sso/[provider]/callback/route.ts
// SSO回调处理API端点

import { NextRequest } from 'next/server';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/auth';
import { CSRFProtection } from '@/lib/security/middleware';
import { getSSOManager } from '@/lib/sso';
import { logger } from '@/lib/logger';

/**
 * 处理SSO回调
 * GET /api/auth/sso/[provider]/callback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  let providerForLog: string | undefined;
  try {
    const { provider } = await params;
    providerForLog = provider;
    const { searchParams } = new URL(request.url);
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // 检查是否有错误
    if (error) {
      logger.error({ provider, error, errorDescription }, 'SSO回调错误');
      return ErrorResponses.BAD_REQUEST(`SSO登录失败: ${errorDescription || error}`);
    }

    // 检查必需参数
    if (!code) {
      return ErrorResponses.BAD_REQUEST('缺少授权码');
    }

    if (!state) {
      return ErrorResponses.BAD_REQUEST('缺少状态参数');
    }

    const ssoManager = getSSOManager();

    // 验证状态参数
    if (!ssoManager.validateState(state)) {
      return ErrorResponses.BAD_REQUEST('无效的状态参数');
    }

    // 处理SSO回调
    const result = await ssoManager.handleCallback(provider, code, state);

    // 解析状态参数获取返回URL
    let returnUrl = '/';
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
      returnUrl = stateData.returnUrl || '/';
    } catch (error) {
      logger.warn('解析状态参数失败，使用默认返回URL');
    }

    const responseData = {
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatar: result.user.avatar,
        provider: result.user.provider,
      },
      token: result.token,
      expiresIn: result.expiresIn,
      isNewUser: result.isNewUser,
      returnUrl,
      loginMethod: 'sso',
      message: result.isNewUser ? '欢迎加入LegalMind！您的账户已自动创建。' : '欢迎回来！',
    };

    // 设置Cookie（可选）
    const response = createSuccessResponse(responseData, 'SSO登录成功');
    
    // 设置统一会话 Cookie（与 /api/auth/login 口径一致）
    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    // CSRF Token（双提交：cookie + header）
    const csrfToken = CSRFProtection.generateToken(result.tokenId);
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    return response;

  } catch (error) {
    logger.error({ err: error, provider: providerForLog ?? 'unknown' }, 'SSO回调处理失败');

    if (error instanceof Error) {
      if (error.message.includes('未配置')) {
        return ErrorResponses.BAD_REQUEST(error.message);
      }
      if (error.message.includes('Token exchange failed')) {
        return ErrorResponses.BAD_REQUEST('授权码交换失败，请重试');
      }
      if (error.message.includes('Failed to fetch user info')) {
        return ErrorResponses.BAD_REQUEST('获取用户信息失败，请重试');
      }
    }
    
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 不支持的请求方法
 */
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
