// dev/src/app/api/admin/users/route.ts
// 运维后台：用户列表查询（仅 OPS_ADMIN）
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

async function requireOpsAdmin(request: NextRequest) {
  const guard = await requireAuthenticatedUser(request, {
    csrf: false,
    anyRole: [Role.OPS_ADMIN],
    forbiddenMessage: '需要运维管理员权限',
  });
  if (!guard.ok) return guard;
  return { ok: true as const, authUser: guard.user };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOpsAdmin(request);
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
        lastLoginAt: true,
        createdAt: true,
        roles: {
          select: {
            id: true,
            role: true,
            isActive: true,
            assignedAt: true,
            assignedBy: true,
          },
          orderBy: [{ role: 'asc' }, { assignedAt: 'desc' }],
        },
      },
    });

    return createPaginatedResponse(
      users.map((u) => ({
        ...u,
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        roles: u.roles.map((r) => ({
          ...r,
          assignedAt: r.assignedAt.toISOString(),
        })),
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
