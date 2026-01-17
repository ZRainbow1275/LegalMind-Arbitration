// dev/src/app/api/cases/[id]/documents/route.ts
// 案件文档列表（Prototype 依赖）：GET /api/cases/:id/documents
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import {
  calculatePagination,
  createPaginatedResponse,
  ErrorResponses,
  parsePaginationParams,
} from '@/lib/api-response';
import { validatePathParams, validateSearchParams, uuidSchema } from '@/lib/validation';
import { DocumentType } from '@/generated/prisma';
import type { Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  documentType: z.nativeEnum(DocumentType).optional(),
  search: z.string().max(200).optional(),
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

    const hasCaseAccess =
      PermissionCheckers.canManageDocuments(authUser)
      || PermissionCheckers.canViewAllCases(authUser)
      || arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id
      || arbitrationCase.participants.length > 0;

    if (!hasCaseAccess) return ErrorResponses.FORBIDDEN();

    const { page, limit } = parsePaginationParams(searchParams);
    const search = queryValidation.data.search?.trim() || undefined;

    const where: Prisma.CaseDocumentWhereInput = {
      caseId,
      ...(queryValidation.data.documentType ? { documentType: queryValidation.data.documentType } : {}),
      ...(search
        ? {
            OR: [
              { originalName: { contains: search, mode: 'insensitive' } },
              { fileName: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // 非管理角色：仅返回公开文档或自己上传的文档，或默认参与者级别
    if (!PermissionCheckers.canManageDocuments(authUser)) {
      where.AND = [
        {
          OR: [
            { isPublic: true },
            { uploadedBy: authUser.id },
            { accessLevel: 'case_participants' },
          ],
        },
      ];
    }

    const total = await prisma.caseDocument.count({ where });
    const pagination = calculatePagination(total, page, limit);

    const documents = await prisma.caseDocument.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    return createPaginatedResponse(documents, pagination, '案件文档获取成功');
  } catch (error) {
    logger.error({ err: error }, '获取案件文档失败');
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
