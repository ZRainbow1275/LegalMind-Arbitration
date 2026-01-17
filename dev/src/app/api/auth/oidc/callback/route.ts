// dev/src/app/api/auth/oidc/callback/route.ts
// OIDC 回调：交换 code → 验证 id_token → 映射本地用户 → 签发本系统会话 Cookie

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorResponses } from '@/lib/api-response';
import { ACCESS_TOKEN_COOKIE_NAME, generateToken, hashPassword } from '@/lib/auth';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { CSRFProtection } from '@/lib/security/middleware';
import { consumeOidcState, exchangeCodeForTokens, verifyIdToken, type OidcClientKind } from '@/lib/security/oidc';
import { logger } from '@/lib/logger';
import { Prisma, ProfileType, Role, UserStatus, UserType, VerificationStatus } from '@/generated/prisma';
import crypto from 'crypto';

function safeReturnTo(value: string): string {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('://')) return value;
  return '/role-selection';
}

function pickClaimString(claims: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const val = claims[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return ErrorResponses.BAD_REQUEST_MESSAGE(`OIDC 登录失败: ${errorDescription || error}`);
  }
  if (!code || !state) {
    return ErrorResponses.BAD_REQUEST_MESSAGE('OIDC 回调缺少参数');
  }

  const stateRecord = await consumeOidcState(state);
  if (!stateRecord) {
    return ErrorResponses.BAD_REQUEST_MESSAGE('OIDC 登录状态已过期或无效，请重试');
  }

  try {
    const tokenResult = await exchangeCodeForTokens({
      clientKind: stateRecord.clientKind,
      code,
      codeVerifier: stateRecord.codeVerifier,
    });

    const claims = await verifyIdToken({
      clientKind: stateRecord.clientKind,
      idToken: tokenResult.idToken,
      expectedNonce: stateRecord.nonce,
    });

    const rawClaims = JSON.parse(JSON.stringify(claims)) as Prisma.InputJsonValue;

    const issuer = pickClaimString(claims, ['iss']);
    const subject = pickClaimString(claims, ['sub']);
    if (!issuer || !subject) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('OIDC 身份信息不完整（缺少 iss/sub）');
    }

    const email = pickClaimString(claims, ['email', 'upn']);
    const name = pickClaimString(claims, ['name', 'preferred_username', 'nickname']);
    const emailVerified = claims.email_verified === true;

    // 1) 优先按 (issuer, subject) 找到本地用户
    const existingIdentity = await prisma.externalIdentity.findFirst({
      where: { issuer, subject },
      include: { user: { include: { roles: true, profile: true } } },
    });

    let user = existingIdentity?.user || null;

    // 2) 若未绑定，尝试按 email 找到用户并绑定；否则仅为 END_USER 自动开户
    if (!user) {
      if (email) {
        user = await prisma.user.findUnique({
          where: { email },
          include: { roles: true, profile: true },
        });
      }

      if (user) {
          await prisma.externalIdentity.create({
            data: {
              userId: user.id,
              providerType: 'OIDC',
              issuer,
              subject,
              email,
              emailVerified: email ? emailVerified : null,
              rawClaims,
              lastLoginAt: new Date(),
            },
          });
      } else {
        // 自动开户仅授予普通用户（END_USER），敏感角色必须由运维后台授予
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await hashPassword(randomPassword);

        user = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email: email || `${subject}@oidc.local`,
              passwordHash,
              userType: UserType.INDIVIDUAL,
              status: UserStatus.ACTIVE,
              emailVerified: email ? emailVerified : false,
              phoneVerified: false,
              lastLoginAt: new Date(),
              profile: {
                create: {
                  profileType: ProfileType.INDIVIDUAL,
                  realName: name || null,
                  verificationStatus: VerificationStatus.PENDING,
                },
              },
              roles: {
                create: {
                  role: Role.END_USER,
                  isActive: true,
                },
              },
            },
            include: { roles: true, profile: true },
          });

          await tx.externalIdentity.create({
            data: {
              userId: created.id,
              providerType: 'OIDC',
              issuer,
              subject,
              email,
              emailVerified: email ? emailVerified : null,
              rawClaims,
              lastLoginAt: new Date(),
            },
          });

          return created;
        });
      }
    } else {
        await prisma.externalIdentity.updateMany({
          where: { issuer, subject },
          data: { lastLoginAt: new Date(), rawClaims, email, emailVerified: email ? emailVerified : null },
        });
      }

    if (!user) {
      return ErrorResponses.INTERNAL_SERVER_ERROR('OIDC 用户映射失败');
    }

    if (user.status !== UserStatus.ACTIVE) {
      return ErrorResponses.FORBIDDEN_MESSAGE('账户已被暂停或禁用');
    }

    // 更新用户最后登录时间
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const roles = user.roles.filter((r) => r.isActive).map((r) => r.role);

    const { token, tokenId } = generateToken({
      userId: user.id,
      email: user.email,
      userType: user.userType,
      roles,
      status: user.status,
    });

    // 审计日志（不记录敏感 claims）
    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.USER_LOGIN,
      userId: user.id,
      userName: user.profile?.realName || user.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'auth',
      action: 'oidc_callback',
      details: {
        issuer,
        clientKind: stateRecord.clientKind,
        roles,
      },
      result: 'SUCCESS',
    });

    const isProd = process.env.NODE_ENV === 'production';
    const returnTo = safeReturnTo(stateRecord.returnTo);
    const response = NextResponse.redirect(new URL(returnTo, request.url));

    response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    const csrfToken = CSRFProtection.generateToken(tokenId);
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    // 为运维后台预留：ops client 登录后可在后续强制二次因子
    if (stateRecord.clientKind === 'ops') {
      response.cookies.set('lm_ops', '1', {
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
      });
    }

    return response;
  } catch (error) {
    logger.error({ err: error }, 'OIDC callback 失败');
    try {
      await AuditLogger.log({
        level: AuditLevel.ERROR,
        eventType: AuditEventType.USER_LOGIN_FAILED,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        resource: 'auth',
        action: 'oidc_callback',
        result: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : '未知错误',
      });
    } catch {}

    return ErrorResponses.INTERNAL_SERVER_ERROR('OIDC 登录处理失败，请重试或联系管理员');
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
