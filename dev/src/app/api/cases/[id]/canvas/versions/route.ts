// dev/src/app/api/cases/[id]/canvas/versions/route.ts
// 画布版本列表（Prototype 依赖）：GET /api/cases/:id/canvas/versions
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, validateSearchParams, uuidSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  limit: z.string().optional(),
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
    const { id: caseId } = pathValidation.data;

    const { searchParams } = new URL(request.url);
    const queryValidation = validateSearchParams(searchParams, querySchema);
    if (!queryValidation.success) return queryValidation.error;

    const limitRaw = queryValidation.data.limit ? Number(queryValidation.data.limit) : 50;
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, limitRaw)) : 50;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        applicantId: true,
        respondentId: true,
        participants: {
          where: { userId: authUser.id, isActive: true },
          select: { id: true },
        },
      },
    });

    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser)
      || arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id
      || arbitrationCase.participants.length > 0;

    if (!hasAccess) return ErrorResponses.FORBIDDEN();

    const canvas = await prisma.caseCanvas.findUnique({
      where: { caseId },
      select: { id: true, latestVersion: true, updatedAt: true },
    });
    if (!canvas) return ErrorResponses.NOT_FOUND('画布');

    const versions = await prisma.caseCanvasVersion.findMany({
      where: { canvasId: canvas.id },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        version: true,
        checksum: true,
        createdBy: true,
        createdAt: true,
        options: true,
      },
    });

    return createSuccessResponse(
      {
        caseId,
        latestVersion: canvas.latestVersion,
        updatedAt: canvas.updatedAt.toISOString(),
        versions: versions.map((v) => ({
          version: v.version,
          checksum: v.checksum,
          createdBy: v.createdBy,
          createdAt: v.createdAt.toISOString(),
          options: v.options ?? null,
        })),
      },
      '画布版本列表获取成功'
    );
  } catch (error) {
    logger.error({ err: error }, '获取画布版本列表失败');
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

