// dev/src/app/api/auth/register/route.ts
// 用户注册API端点 - 支持AI系统接入和外部系统集成

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequestBody } from '@/lib/validation';
import { userRegistrationSchema } from '@/lib/validation';
import { ACCESS_TOKEN_COOKIE_NAME, generateToken, hashPassword } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { CSRFProtection } from '@/lib/security/middleware';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { computeUserCapabilities, type PlatformRoleKey } from '@/lib/capabilities';
import { logger } from '@/lib/logger';
import { Prisma, ProfileType, Role, UserType } from '@/generated/prisma';

/**
 * 用户注册
 * POST /api/auth/register
 * 支持AI系统自动注册和外部系统集成
 */
export async function POST(request: NextRequest) {
  try {
    // 验证请求体
    const validation = await validateRequestBody(request, userRegistrationSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { email, phone, password, userType } = validation.data;
    const normalizedUserType = userType === 'ENTERPRISE' ? UserType.ENTERPRISE : UserType.INDIVIDUAL;

    // 哈希密码
    const passwordHash = await hashPassword(password);

    // 创建用户和相关数据
    const user = await prisma.$transaction(async (tx) => {
      // 创建用户
      const newUser = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          userType: normalizedUserType,
        },
      });

      // 创建用户档案
      await tx.userProfile.create({
        data: {
          userId: newUser.id,
          profileType: normalizedUserType === UserType.INDIVIDUAL ? ProfileType.INDIVIDUAL : ProfileType.ENTERPRISE,
        },
      });

      // 分配默认角色 - 为AI系统和外部系统预留角色扩展
      const defaultRole = Role.END_USER;
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          role: defaultRole,
          permissions: {
            // 预留AI系统权限配置
            aiAssistant: true,
            documentOCR: true,
            voiceRecognition: true,
            smartRecommendation: true,
            // 预留外部系统集成权限
            courtSystemAccess: false,
            notarySystemAccess: false,
            legalDatabaseAccess: false,
          },
        },
      });

      return newUser;
    });

    // 获取用户完整信息（包含角色）
    const userWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: true,
        profile: true,
      },
    });

    if (!userWithRoles) {
      return ErrorResponses.INTERNAL_ERROR();
    }

    const platformRoles = userWithRoles.roles
      .filter((r) => r.isActive)
      .map((r) => r.role) as unknown as PlatformRoleKey[];
    const capabilities = computeUserCapabilities(platformRoles);

    // 生成JWT Token
    const { token, tokenId, expiresIn } = generateToken({
      userId: user.id,
      email: user.email,
      userType: user.userType,
      roles: userWithRoles.roles.filter((r) => r.isActive).map((r) => r.role),
      status: user.status,
    });

    // 返回成功响应（不包含敏感信息）
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        roles: userWithRoles.roles.map(r => r.role),
        createdAt: user.createdAt,
      },
      token,
      expiresIn,
      // AI系统集成信息
      integrations: {
        aiAssistantEnabled: !!process.env.OPENAI_API_KEY,
        availableServices: [
          ...(process.env.OPENAI_API_KEY ? ['AI_ASSISTANT'] : []),
          ...(process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY ? ['OCR'] : []),
          ...(process.env.IFLYTEK_APP_ID ? ['VOICE_RECOGNITION'] : []),
        ],
        // 外部系统集成状态
        externalSystems: {
          courtSystem: { enabled: false, status: 'pending_approval' },
          notarySystem: { enabled: false, status: 'pending_approval' },
          legalDatabase: { enabled: false, status: 'pending_approval' },        
        },
      },
      platformRoles,
      capabilities,
    };

    const response = createSuccessResponse(responseData, '注册成功');

    // 写入 HttpOnly Cookie（避免前端持久化 token）
    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    // CSRF Token（双提交：cookie + header）
    const csrfToken = CSRFProtection.generateToken(tokenId);
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.USER_CREATED,
      userId: user.id,
      userName: user.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'auth',
      action: 'register',
      details: {
        userType: user.userType,
      },
      result: 'SUCCESS',
    });

    return response;

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target;
      const targets = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
      if (targets.includes('email')) {
        return ErrorResponses.DUPLICATE_RESOURCE('邮箱已被注册');
      }
      if (targets.includes('phone')) {
        return ErrorResponses.DUPLICATE_RESOURCE('手机号已被注册');
      }
      return ErrorResponses.DUPLICATE_RESOURCE('用户已存在');
    }

    logger.error({ err: error }, '用户注册失败');

    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 不支持的请求方法
 */
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
