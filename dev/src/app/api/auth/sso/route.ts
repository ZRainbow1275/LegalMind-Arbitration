// dev/src/app/api/auth/sso/route.ts
// SSO单点登录API端点 - 支持多种SSO提供商

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getSSOManager } from '@/lib/sso';
import { logger } from '@/lib/logger';

const startSsoSchema = z
  .object({
    provider: z.string().min(1).max(50),
    returnUrl: z.string().max(2000).optional(),
  })
  .strict();

function normalizeReturnUrl(input: string | undefined): string {
  if (!input) return '/';
  if (!input.startsWith('/')) return '/';
  if (input.startsWith('//')) return '/';
  return input;
}

/**
 * 获取可用的SSO提供商
 * GET /api/auth/sso
 */
export async function GET(_request: NextRequest) {
  try {
    const ssoManager = getSSOManager();
    
    // 获取可用的SSO提供商
    const providers = ssoManager.getAvailableProviders();
    
    // 获取SSO统计信息
    const stats = await ssoManager.getSSOStats();
    
    const responseData = {
      providers,
      stats,
      supportedFeatures: [
        'OAuth2.0',
        'OpenID Connect',
        '自动用户创建',
        '角色映射',
        '会话管理',
      ],
      configuration: {
        sessionTimeout: '7天',
        autoUserCreation: true,
        defaultRole: 'END_USER',
        emailVerification: false, // SSO用户默认已验证
      },
    };

    return createSuccessResponse(responseData, '获取SSO配置成功');

  } catch (error) {
    logger.error({ err: error }, '获取SSO配置失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 启动SSO登录流程
 * POST /api/auth/sso
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = startSsoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('请求参数无效', parsed.error.issues);
    }

    const { provider } = parsed.data;
    const returnUrl = normalizeReturnUrl(parsed.data.returnUrl);

    const ssoManager = getSSOManager();

    // 生成状态参数（包含返回URL）
    const state = Buffer.from(
      JSON.stringify({
        timestamp: Date.now(),
        returnUrl,
        nonce: crypto.randomUUID(),
      })
    ).toString('base64url');

    // 生成授权URL
    const authUrl = ssoManager.generateAuthUrl(provider, state);

    const responseData = {
      provider,
      authUrl,
      state,
      instructions: [
        '点击授权URL进行SSO登录',
        '登录成功后将自动跳转回应用',
        '如果是新用户，系统将自动创建账户',
      ],
    };

    return createSuccessResponse(responseData, 'SSO登录URL生成成功');

  } catch (error) {
    logger.error({ err: error }, '启动SSO登录失败');

    if (error instanceof Error && error.message.includes('未配置')) {
      return ErrorResponses.BAD_REQUEST(error.message);
    }

    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 不支持的请求方法
 */
export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
