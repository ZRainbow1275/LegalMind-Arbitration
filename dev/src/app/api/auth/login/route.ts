// dev/src/app/api/auth/login/route.ts
// 用户登录API端点 - 支持AI系统和外部系统集成

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequestBody } from '@/lib/validation';
import { userLoginSchema } from '@/lib/validation';
import { ACCESS_TOKEN_COOKIE_NAME, generateToken, verifyPassword } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { CSRFProtection } from '@/lib/security/middleware';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { computeUserCapabilities, type PlatformRoleKey } from '@/lib/capabilities';
import { EncryptionUtil } from '@/lib/security/encryption';
import { parseStoredRecoveryCodes, verifyAndConsumeRecoveryCode } from '@/lib/security/mfa';
import { verifyTotpCode } from '@/lib/security/totp';
import { logger } from '@/lib/logger';
import { Role, UserStatus } from '@/generated/prisma';

/**
 * 用户登录
 * POST /api/auth/login
 * 支持AI系统和外部系统的统一认证
 */
export async function POST(request: NextRequest) {
  try {
    // 验证请求体
    const validation = await validateRequestBody(request, userLoginSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { email, password, mfaCode } = validation.data;

    // 查找用户（包含角色和档案信息）
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: true,
        profile: true,
        mfa: true,
      },
    });

    if (!user) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.USER_LOGIN_FAILED,
        userName: email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        resource: 'auth',
        action: 'login',
        details: { reason: 'USER_NOT_FOUND' },
        result: 'FAILURE',
      });
      return ErrorResponses.BAD_REQUEST_MESSAGE('邮箱或密码错误');
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.passwordHash);  
    if (!isPasswordValid) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.USER_LOGIN_FAILED,
        userId: user.id,
        userName: user.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        resource: 'auth',
        action: 'login',
        details: { reason: 'INVALID_PASSWORD' },
        result: 'FAILURE',
      });
      return ErrorResponses.BAD_REQUEST_MESSAGE('邮箱或密码错误');
    }

    // 检查用户状态
    if (user.status !== UserStatus.ACTIVE) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.PERMISSION_DENIED,
        userId: user.id,
        userName: user.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        resource: 'auth',
        action: 'login',
        details: { reason: 'USER_STATUS_NOT_ACTIVE', status: user.status },
        result: 'FAILURE',
      });
      return ErrorResponses.FORBIDDEN_MESSAGE('账户已被暂停或禁用');
    }

    const roles = user.roles.filter((r) => r.isActive).map((r) => r.role);
    const isAdminRole = roles.includes(Role.ADMIN) || roles.includes(Role.OPS_ADMIN);

    const mfaEnabled = Boolean(user.mfa?.enabled);
    if (isAdminRole && !mfaEnabled) {
      await AuditLogger.log({
        level: AuditLevel.WARNING,
        eventType: AuditEventType.USER_LOGIN_FAILED,
        userId: user.id,
        userName: user.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        resource: 'auth',
        action: 'login',
        details: { reason: 'MFA_SETUP_REQUIRED', roles },
        result: 'FAILURE',
      });
      return ErrorResponses.MFA_SETUP_REQUIRED();
    }

    let mfaUsed = false;
    if (mfaEnabled) {
      mfaUsed = true;
      if (!mfaCode) {
        await AuditLogger.log({
          level: AuditLevel.WARNING,
          eventType: AuditEventType.USER_LOGIN_FAILED,
          userId: user.id,
          userName: user.email,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined,
          resource: 'auth',
          action: 'login',
          details: { reason: 'MFA_REQUIRED', roles },
          result: 'FAILURE',
        });
        return ErrorResponses.MFA_REQUIRED();
      }

      if (!user.mfa?.totpSecretEnc) {
        await AuditLogger.log({
          level: AuditLevel.ERROR,
          eventType: AuditEventType.USER_LOGIN_FAILED,
          userId: user.id,
          userName: user.email,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined,
          resource: 'auth',
          action: 'login',
          details: { reason: 'MFA_SECRET_MISSING', roles },
          result: 'FAILURE',
        });
        return ErrorResponses.INTERNAL_ERROR();
      }

      const secretBase32 = EncryptionUtil.decrypt(user.mfa.totpSecretEnc);
      const totpCheck = verifyTotpCode({
        secretBase32,
        code: mfaCode,
        window: 1,
      });

      if (!totpCheck.ok) {
        const storedRecovery = parseStoredRecoveryCodes(user.mfa.recoveryCodes);
        if (!storedRecovery) {
          await AuditLogger.log({
            level: AuditLevel.WARNING,
            eventType: AuditEventType.USER_LOGIN_FAILED,
            userId: user.id,
            userName: user.email,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || undefined,
            resource: 'auth',
            action: 'login',
            details: { reason: 'MFA_INVALID', roles, totpReason: totpCheck.reason },
            result: 'FAILURE',
          });
          return ErrorResponses.MFA_INVALID();
        }

        const recoveryCheck = verifyAndConsumeRecoveryCode({
          stored: storedRecovery,
          code: mfaCode,
        });

        if (!recoveryCheck.ok) {
          await AuditLogger.log({
            level: AuditLevel.WARNING,
            eventType: AuditEventType.USER_LOGIN_FAILED,
            userId: user.id,
            userName: user.email,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || undefined,
            resource: 'auth',
            action: 'login',
            details: {
              reason: 'MFA_INVALID',
              roles,
              totpReason: totpCheck.reason,
              recoveryReason: recoveryCheck.reason,
            },
            result: 'FAILURE',
          });
          return ErrorResponses.MFA_INVALID();
        }

        await prisma.userMfa.update({
          where: { userId: user.id },
          data: { recoveryCodes: recoveryCheck.updated },
        });
      }
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const platformRoles = roles as unknown as PlatformRoleKey[];
    const capabilities = computeUserCapabilities(platformRoles);

    // 生成JWT Token（同时用于浏览器 Cookie 会话与外部系统 Bearer 调用）
    const { token, tokenId, expiresIn } = generateToken({
      userId: user.id,
      email: user.email,
      userType: user.userType,
      roles,
      status: user.status,
    });

    // 获取用户权限配置（历史字段：用于旧逻辑兼容；严禁作为唯一授权事实）
    const permissions = user.roles.reduce<Record<string, unknown>>((acc, role) => {
      if (role.permissions && typeof role.permissions === 'object' && !Array.isArray(role.permissions)) {
        return { ...acc, ...(role.permissions as Record<string, unknown>) };
      }
      return acc;
    }, {});

    // 返回成功响应
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        roles: user.roles.map(r => r.role),
        profile: {
          id: user.profile?.id,
          profileType: user.profile?.profileType,
          realName: user.profile?.realName,
          companyName: user.profile?.companyName,
          verificationStatus: user.profile?.verificationStatus,
        },
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
      token,
      expiresIn,
      // AI系统集成信息
      integrations: {
        aiAssistantEnabled: permissions['aiAssistant'] === true,
        availableServices: [
          ...(permissions['documentOCR'] === true ? ['OCR'] : []),
          ...(permissions['voiceRecognition'] === true ? ['VOICE_RECOGNITION'] : []),
          ...(permissions['smartRecommendation'] === true ? ['SMART_RECOMMENDATION'] : []),
        ],
        // 外部系统集成状态
        externalSystems: {
          courtSystem: {
            enabled: permissions['courtSystemAccess'] === true,
            status: permissions['courtSystemAccess'] === true ? 'active' : 'pending_approval'
          },
          notarySystem: {
            enabled: permissions['notarySystemAccess'] === true,
            status: permissions['notarySystemAccess'] === true ? 'active' : 'pending_approval'
          },
          legalDatabase: {
            enabled: permissions['legalDatabaseAccess'] === true,
            status: permissions['legalDatabaseAccess'] === true ? 'active' : 'pending_approval'
          },
        },
      },
      // 用户权限详情
      permissions,
      platformRoles,
      capabilities,
    };

    const response = createSuccessResponse(responseData, '登录成功');

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

    // 审计日志（不记录敏感字段）
    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.USER_LOGIN,
      userId: user.id,
      userName: user.profile?.realName || user.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'auth',
      action: 'login',
      details: {
        roles: platformRoles,
        mfa_used: mfaUsed,
      },
      result: 'SUCCESS',
    });

    return response;

  } catch (error) {
    logger.error({ err: error }, '用户登录失败');

    try {
      await AuditLogger.log({
        level: AuditLevel.ERROR,
        eventType: AuditEventType.USER_LOGIN_FAILED,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        resource: 'auth',
        action: 'login',
        result: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : '未知错误',
      });
    } catch {}

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
