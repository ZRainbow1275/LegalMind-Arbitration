// dev/src/app/api/service/[id]/route.ts
// 送达记录详情：用于查看送达状态与尝试记录
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { logger } from '@/lib/logger';

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
    const { id: serviceId } = pathValidation.data;

    const service = await prisma.serviceOfProcess.findUnique({
      where: { id: serviceId },
      include: {
        attempts: { orderBy: { attemptNumber: 'asc' } },
        document: { select: { id: true, originalName: true, fileHash: true } },
        case: {
          select: {
            id: true,
            caseNumber: true,
            applicantId: true,
            respondentId: true,
            participants: { where: { userId: authUser.id, isActive: true }, select: { id: true } },
          },
        },
      },
    });

    if (!service) return ErrorResponses.NOT_FOUND('送达记录');

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser)
      || service.case.applicantId === authUser.id
      || service.case.respondentId === authUser.id
      || service.case.participants.length > 0;

    if (!hasAccess) return ErrorResponses.FORBIDDEN();

    return createSuccessResponse({ service }, '送达记录获取成功');
  } catch (error) {
    logger.error({ err: error }, '获取送达记录失败');
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

