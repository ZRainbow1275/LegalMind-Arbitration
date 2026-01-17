// dev/src/app/api/users/[id]/route.ts
// 用户详情与更新：对齐 docs/API_REFERENCE.md 的 /api/users/:id
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { ProfileType, Role, VerificationStatus } from '@/generated/prisma';
import { logger } from '@/lib/logger';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

const updateSchema = z
  .object({
    name: z
      .string()
      .max(200, 'name 过长')
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
    phone: z
      .string()
      .max(20, 'phone 过长')
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  })
  .refine((v) => v.name !== undefined || v.phone !== undefined, {
    message: '至少提供一个更新字段',
  });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: userId } = pathValidation.data;

    const isPrivileged =
      PermissionCheckers.isAdmin(authUser)
      || authUser.roles.includes(Role.OPS_ADMIN);

    if (!isPrivileged && authUser.id !== userId) {
      return ErrorResponses.FORBIDDEN_MESSAGE('只能查看自己的用户信息');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        userType: true,
        status: true,
        createdAt: true,
        profile: {
          select: {
            profileType: true,
            realName: true,
            companyName: true,
            verificationStatus: true,
            verifiedAt: true,
          },
        },
        roles: {
          where: { isActive: true },
          select: { role: true },
          orderBy: [{ role: 'asc' }],
        },
      },
    });

    if (!user) return ErrorResponses.NOT_FOUND('用户');

    return createSuccessResponse(
      {
        id: user.id,
        email: user.email,
        phone: maskPhone(user.phone ?? null),
        userType: user.userType,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        name: user.profile?.profileType === 'ENTERPRISE' ? user.profile?.companyName : user.profile?.realName,
        verified: user.profile?.verificationStatus === VerificationStatus.VERIFIED,
        verifiedAt: user.profile?.verifiedAt ? user.profile.verifiedAt.toISOString() : null,
        role: user.roles[0]?.role ?? null,
        roles: user.roles.map((r) => r.role),
      },
      '用户详情获取成功'
    );
  } catch (error) {
    logger.error({ err: error }, '获取用户详情失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;
    const { id: userId } = pathValidation.data;

    const isPrivileged =
      PermissionCheckers.isAdmin(authUser)
      || authUser.roles.includes(Role.OPS_ADMIN);

    if (!isPrivileged && authUser.id !== userId) {
      return ErrorResponses.FORBIDDEN_MESSAGE('只能更新自己的用户信息');
    }

    const bodyValidation = await validateRequestBody(request, updateSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, phone: true, userType: true },
      });
      if (!existing) return null;

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...(bodyValidation.data.phone ? { phone: bodyValidation.data.phone } : {}),
        },
        select: {
          id: true,
          email: true,
          phone: true,
          userType: true,
          status: true,
          createdAt: true,
          profile: {
            select: {
              profileType: true,
              realName: true,
              companyName: true,
              verificationStatus: true,
              verifiedAt: true,
            },
          },
          roles: { where: { isActive: true }, select: { role: true }, orderBy: [{ role: 'asc' }] },
        },
      });

      if (bodyValidation.data.name) {
        const profileType = user.profile?.profileType;
        if (profileType === ProfileType.ENTERPRISE) {
          await tx.userProfile.upsert({
            where: { userId },
            create: { userId, profileType: ProfileType.ENTERPRISE, companyName: bodyValidation.data.name },
            update: { companyName: bodyValidation.data.name },
          });
        } else if (profileType === ProfileType.INDIVIDUAL) {
          await tx.userProfile.upsert({
            where: { userId },
            create: { userId, profileType: ProfileType.INDIVIDUAL, realName: bodyValidation.data.name },
            update: { realName: bodyValidation.data.name },
          });
        }
      }

      return await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          userType: true,
          status: true,
          createdAt: true,
          profile: {
            select: {
              profileType: true,
              realName: true,
              companyName: true,
              verificationStatus: true,
              verifiedAt: true,
            },
          },
          roles: { where: { isActive: true }, select: { role: true }, orderBy: [{ role: 'asc' }] },
        },
      });
    });

    if (!updated) return ErrorResponses.NOT_FOUND('用户');

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.USER_UPDATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'users',
      action: 'update',
      details: { targetUserId: userId },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        id: updated.id,
        email: updated.email,
        phone: maskPhone(updated.phone ?? null),
        userType: updated.userType,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        name:
          updated.profile?.profileType === 'ENTERPRISE'
            ? updated.profile?.companyName
            : updated.profile?.realName,
        verified: updated.profile?.verificationStatus === VerificationStatus.VERIFIED,
        verifiedAt: updated.profile?.verifiedAt ? updated.profile.verifiedAt.toISOString() : null,
        role: updated.roles[0]?.role ?? null,
        roles: updated.roles.map((r) => r.role),
      },
      '用户信息更新成功'
    );
  } catch (error) {
    logger.error({ err: error }, '更新用户信息失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function POST() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
