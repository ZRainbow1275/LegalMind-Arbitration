// dev/src/lib/auth.ts
// JWT 认证与授权工具（BFF Cookie + Bearer 兼容）

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { Role, UserStatus, UserType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { getRedisManager } from '@/lib/redis';
import { ErrorResponses } from '@/lib/api-response';
import { CSRFProtection } from '@/lib/security/middleware';

export const ACCESS_TOKEN_COOKIE_NAME = 'lm_access_token';

const JWT_ISSUER = 'legalmind-arbitration';
const JWT_AUDIENCE = 'legalmind-users';

const JWT_REVOKED_PREFIX = 'jwt_revoked:'; // 会自动加上 Redis keyPrefix
const AUTH_CONTEXT_CACHE_PREFIX = 'auth:ctx:';
const AUTH_CONTEXT_CACHE_TTL_SECONDS = 60;

/**
 * JWT 载荷（仅用于服务端解包；最终权限以 DB 为准）
 */
export interface JwtPayload {
  userId: string;
  email: string;
  userType: UserType;
  roles: Role[];
  status: UserStatus;
  jti: string;
  iat?: number;
  exp?: number;
}

/**
 * 认证用户信息（服务端最终态）
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: UserType;
  roles: Role[];
  status: UserStatus;
  tokenId: string;
}

export interface GeneratedJwtToken {
  token: string;
  tokenId: string;
  expiresIn: string;
}

export interface AuthRequirements {
  csrf?: boolean;
  anyRole?: Role[];
  allRoles?: Role[];
  forbiddenMessage?: string;
}

export type AuthGuardResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: ReturnType<typeof ErrorResponses.UNAUTHORIZED> };

const jwtPayloadSchema: z.ZodType<JwtPayload> = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  userType: z.nativeEnum(UserType),
  roles: z.array(z.nativeEnum(Role)),
  status: z.nativeEnum(UserStatus),
  jti: z.string().uuid(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

const authenticatedUserSchema: z.ZodType<AuthenticatedUser> = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  userType: z.nativeEnum(UserType),
  roles: z.array(z.nativeEnum(Role)),
  status: z.nativeEnum(UserStatus),
  tokenId: z.string().uuid(),
});

/**
 * 生成 JWT Token（用于浏览器 Cookie 会话与外部系统 Bearer 调用）
 */
export function generateToken(
  payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>
): GeneratedJwtToken {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET环境变量未设置');
  }

    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const tokenId = crypto.randomUUID();
    const token = jwt.sign(payload, secret, {
      expiresIn: expiresIn as SignOptions['expiresIn'],
      jwtid: tokenId,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

  return { token, tokenId, expiresIn };
}

/**
 * 验证 JWT Token（仅校验签名与基础 claims；授权以 DB 为准）
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET环境变量未设置');
    }

    const decoded = jwt.verify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    const parsed = jwtPayloadSchema.safeParse(decoded);
    if (!parsed.success) return null;

    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * 从请求中提取 Token（优先 Bearer，其次 Cookie）
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value || null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return authHeader.trim() || null;
}

export function getTokenPayloadFromRequest(request: NextRequest): JwtPayload | null {
  const token = extractTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export async function revokeToken(tokenId: string, exp?: number): Promise<void> {
  const redis = getRedisManager();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds = exp ? Math.max(1, exp - nowSeconds) : 7 * 24 * 60 * 60;

  await redis.set(`${JWT_REVOKED_PREFIX}${tokenId}`, { revokedAt: Date.now() }, ttlSeconds);
  await redis.del(`${AUTH_CONTEXT_CACHE_PREFIX}${tokenId}`);
}

/**
 * 从请求中获取认证用户信息：
 * - 校验 Token（签名/iss/aud）
 * - 校验注销（jti 黑名单）
 * - 以 DB 为准加载用户状态与角色（避免 token 长时效导致的越权）
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const payload = getTokenPayloadFromRequest(request);
  if (!payload) return null;

  const redis = getRedisManager();
  if (await redis.exists(`${JWT_REVOKED_PREFIX}${payload.jti}`)) {
    return null;
  }

  const cached = await redis.get<AuthenticatedUser>(`${AUTH_CONTEXT_CACHE_PREFIX}${payload.jti}`);
  if (cached) {
    const parsed = authenticatedUserSchema.safeParse(cached);
    if (parsed.success) return parsed.data;
    await redis.del(`${AUTH_CONTEXT_CACHE_PREFIX}${payload.jti}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { roles: true },
  });
  if (!user) return null;
  if (user.status !== UserStatus.ACTIVE) return null;

  const roles = user.roles.filter((r) => r.isActive).map((r) => r.role);
  const authUser: AuthenticatedUser = {
    id: user.id,
    email: user.email,
    userType: user.userType,
    roles,
    status: user.status,
    tokenId: payload.jti,
  };

  await redis.set(`${AUTH_CONTEXT_CACHE_PREFIX}${payload.jti}`, authUser, AUTH_CONTEXT_CACHE_TTL_SECONDS);
  return authUser;
}

/**
 * 密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 检查用户是否具有指定角色
 */
export function hasRole(user: AuthenticatedUser, role: Role): boolean {
  return user.roles.includes(role);
}

/**
 * 检查用户是否具有任一指定角色
 */
export function hasAnyRole(user: AuthenticatedUser, roles: Role[]): boolean {
  return roles.some((role) => user.roles.includes(role));
}

/**
 * 检查用户是否具有所有指定角色
 */
export function hasAllRoles(user: AuthenticatedUser, roles: Role[]): boolean {
  return roles.every((role) => user.roles.includes(role));
}

/**
 * 检查用户是否为业务管理员（不包含运维）
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return hasRole(user, Role.ADMIN);
}

/**
 * 检查用户是否为运维管理员
 */
export function isOpsAdmin(user: AuthenticatedUser): boolean {
  return hasRole(user, Role.OPS_ADMIN);
}

/**
 * 检查用户是否为仲裁员
 */
export function isArbitrator(user: AuthenticatedUser): boolean {
  return hasRole(user, Role.ARBITRATOR);
}

/**
 * 检查用户是否为调解员
 */
export function isMediator(user: AuthenticatedUser): boolean {
  return hasRole(user, Role.MEDIATOR);
}

/**
 * 检查用户状态是否有效
 */
export function isUserActive(user: AuthenticatedUser): boolean {
  return user.status === UserStatus.ACTIVE;
}

/**
 * 权限检查装饰器类型
 */
export type PermissionChecker = (user: AuthenticatedUser) => boolean;

/**
 * 常用权限检查器（保持与既有 API 代码兼容）
 */
export const PermissionCheckers = {
  isAuthenticated: (user: AuthenticatedUser) => isUserActive(user),
  isAdmin: (user: AuthenticatedUser) => isAdmin(user) && isUserActive(user),

  isArbitrator: (user: AuthenticatedUser) => isArbitrator(user) && isUserActive(user),
  isMediator: (user: AuthenticatedUser) => isMediator(user) && isUserActive(user),

  canCreateCase: (user: AuthenticatedUser) => {
    return isUserActive(user) && hasAnyRole(user, [Role.END_USER, Role.LAWYER, Role.ADMIN]);
  },

  canManageCase: (user: AuthenticatedUser) => {
    return isUserActive(user) && hasAnyRole(user, [Role.ADMIN, Role.ARBITRATOR, Role.MEDIATOR]);
  },

  canViewAllCases: (user: AuthenticatedUser) => {
    return (
      isUserActive(user)
      && hasAnyRole(user, [
        Role.ADMIN,
        Role.ARBITRATOR,
        Role.MEDIATOR,
        Role.AUDITOR_READONLY,
      ])
    );
  },

  canUploadDocument: (user: AuthenticatedUser) => {
    return isUserActive(user);
  },

  canManageDocuments: (user: AuthenticatedUser) => {
    return isUserActive(user) && hasAnyRole(user, [Role.ADMIN, Role.ARBITRATOR, Role.MEDIATOR]);
  },
};

/**
 * 生成随机密码重置 Token（服务端流转用；禁止暴露日志）
 */
export function generateResetToken(): string {
  return `${crypto.randomBytes(32).toString('hex')}${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * 生成邮箱验证 Token（服务端流转用；禁止暴露日志）
 */
export function generateVerificationToken(): string {
  return `${crypto.randomBytes(32).toString('hex')}${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * 统一鉴权守卫：集中处理 UNAUTHORIZED / CSRF / 角色校验。
 *
 * 注意：仅在调用方显式要求时校验 CSRF；对于 Bearer 调用，CSRFProtection 会自动跳过。
 */
export async function requireAuthenticatedUser(
  request: NextRequest,
  requirements: AuthRequirements = {}
): Promise<AuthGuardResult> {
  const user = await getAuthenticatedUser(request);
  if (!user) return { ok: false, response: ErrorResponses.UNAUTHORIZED() };

  if (requirements.csrf) {
    const ok = CSRFProtection.protect(request, user.tokenId);
    if (!ok) return { ok: false, response: ErrorResponses.CSRF_INVALID() };
  }

  if (requirements.anyRole && requirements.anyRole.length > 0) {
    if (!hasAnyRole(user, requirements.anyRole)) {
      return {
        ok: false,
        response: ErrorResponses.FORBIDDEN_MESSAGE(
          requirements.forbiddenMessage || '权限不足'
        ),
      };
    }
  }

  if (requirements.allRoles && requirements.allRoles.length > 0) {
    if (!hasAllRoles(user, requirements.allRoles)) {
      return {
        ok: false,
        response: ErrorResponses.FORBIDDEN_MESSAGE(
          requirements.forbiddenMessage || '权限不足'
        ),
      };
    }
  }

  return { ok: true, user };
}
