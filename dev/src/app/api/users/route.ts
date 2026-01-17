// dev/src/app/api/users/route.ts
// 用户管理（管理员）：对齐 docs/API_REFERENCE.md 的 /api/users
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/auth';
import {
  calculatePagination,
  createPaginatedResponse,
  ErrorResponses,
  parsePaginationParams,
} from '@/lib/api-response';
import { validateSearchParams, uuidSchema } from '@/lib/validation';
import { Role, UserStatus, UserType } from '@/generated/prisma';
import type { Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().max(200).optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  userType: z.nativeEnum(UserType).optional(),
});

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

async function requireAdmin(request: NextRequest) {
  return requireAuthenticatedUser(request, {
    csrf: false,
    anyRole: [Role.ADMIN, Role.OPS_ADMIN],
    forbiddenMessage: '需要管理员权限',
  });
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const validation = validateSearchParams(searchParams, querySchema);
    if (!validation.success) return validation.error;

    const { page, limit } = parsePaginationParams(searchParams);
    const search = validation.data.search?.trim() || undefined;
    const searchIsUuid = search ? uuidSchema.safeParse(search).success : false;

    const where: Prisma.UserWhereInput = {
      ...(validation.data.status ? { status: validation.data.status } : {}),
      ...(validation.data.userType ? { userType: validation.data.userType } : {}),
      ...(validation.data.role
        ? { roles: { some: { role: validation.data.role, isActive: true } } }
        : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              ...(searchIsUuid ? [{ id: search }] : []),
            ],
          }
        : {}),
    };

    const total = await prisma.user.count({ where });
    const pagination = calculatePagination(total, page, limit);

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
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
          },
        },
        roles: {
          where: { isActive: true },
          select: { role: true },
          orderBy: [{ role: 'asc' }],
        },
      },
    });

    return createPaginatedResponse(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: maskPhone(u.phone ?? null),
        userType: u.userType,
        status: u.status,
        createdAt: u.createdAt.toISOString(),
        name: u.profile?.profileType === 'ENTERPRISE' ? u.profile?.companyName : u.profile?.realName,
        verified: u.profile?.verificationStatus === 'VERIFIED',
        role: u.roles[0]?.role ?? null,
        roles: u.roles.map((r) => r.role),
      })),
      pagination,
      '用户列表获取成功'
    );
  } catch (error) {
    logger.error({ err: error }, '获取用户列表失败');
    return ErrorResponses.INTERNAL_ERROR();
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

