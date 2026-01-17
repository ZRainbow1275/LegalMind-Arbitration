// dev/src/app/api/arbitrators/profiles/route.ts
// 仲裁员资质后台：查询资料列表（业务管理员）
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
import { validateSearchParams } from '@/lib/validation';
import { ArbitratorProfileStatus, Role, type Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(ArbitratorProfileStatus).optional(),
  search: z.string().max(200).optional(),
});

async function requireBusinessAdmin(request: NextRequest) {
  const guard = await requireAuthenticatedUser(request, {
    csrf: false,
    anyRole: [Role.ADMIN],
    forbiddenMessage: '需要业务管理员权限',
  });
  if (!guard.ok) return guard;
  return { ok: true as const, authUser: guard.user };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireBusinessAdmin(request);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);
    const validation = validateSearchParams(searchParams, querySchema);
    if (!validation.success) return validation.error;

    const { page, limit } = parsePaginationParams(searchParams);
    const search = validation.data.search?.trim() || undefined;

    const where: Prisma.ArbitratorProfileWhereInput = {
      ...(validation.data.status ? { status: validation.data.status } : {}),
      ...(search
        ? {
            OR: [
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { title: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const total = await prisma.arbitratorProfile.count({ where });
    const pagination = calculatePagination(total, page, limit);

    const profiles = await prisma.arbitratorProfile.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        userId: true,
        status: true,
        title: true,
        experienceYears: true,
        location: true,
        verifiedAt: true,
        verifiedByUserId: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } } },
      },
    });

    return createPaginatedResponse(
      profiles,
      pagination,
      '获取仲裁员资料列表成功'
    );
  } catch (error) {
    logger.error({ err: error }, '获取仲裁员资料列表失败');
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

