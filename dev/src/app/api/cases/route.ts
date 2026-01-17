// dev/src/app/api/cases/route.ts
// 案件管理API端点 - 支持AI智能辅助和外部系统集成

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validateRequestBody, validateSearchParams } from '@/lib/validation';
import { caseCreationSchema, paginationSchema } from '@/lib/validation';
import { calculatePagination, createSuccessResponse, createPaginatedResponse, ErrorResponses } from '@/lib/api-response';
import { CaseStatus, Priority, ParticipantType, type Prisma } from '@/generated/prisma';

/**
 * 创建新案件
 * POST /api/cases
 * 需要认证，支持AI智能辅助创建
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 检查创建案件权限
    if (!PermissionCheckers.canCreateCase(authUser)) {
      return ErrorResponses.FORBIDDEN();
    }

    // 验证请求体
    const validation = await validateRequestBody(request, caseCreationSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { title, description, caseType, disputeAmount, currency, respondentInfo } = validation.data;

    // 创建案件和相关数据
    const newCase = await prisma.$transaction(async (tx) => {
      // 生成案件编号（格式：LMYYYY-NNNNNN）- 放入事务避免竞态
      const currentYear = new Date().getFullYear();
      const caseCount = await tx.arbitrationCase.count({
        where: {
          createdAt: {
            gte: new Date(`${currentYear}-01-01`),
            lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
      });
      const caseNumber = `LM${currentYear}-${String(caseCount + 1).padStart(6, '0')}`;

      // 创建案件
      const arbitrationCase = await tx.arbitrationCase.create({
        data: {
          caseNumber,
          title,
          description,
          caseType,
          disputeAmount,
          currency,
          applicantId: authUser.id,
          respondentInfo,
          status: CaseStatus.DRAFT,
          priority: Priority.MEDIUM,
          metadata: {
            // AI系统元数据
            aiAssisted: true,
            createdVia: 'web_platform',
            // 外部系统集成预留
            externalSystemRefs: {},
            // 智能推荐标签
            suggestedTags: [], // AI可以在这里添加智能标签
            riskAssessment: null, // AI风险评估结果
          },
        },
      });

      // 添加申请人为案件参与者
      await tx.caseParticipant.create({
        data: {
          caseId: arbitrationCase.id,
          userId: authUser.id,
          participantType: ParticipantType.APPLICANT,
          roleDescription: '申请人',
          isActive: true,
        },
      });

      return arbitrationCase;
    });

    // 获取创建的案件完整信息
    const caseWithDetails = await prisma.arbitrationCase.findUnique({
      where: { id: newCase.id },
      include: {
        applicant: {
          select: {
            id: true,
            email: true,
            userType: true,
            profile: {
              select: {
                realName: true,
                companyName: true,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    realName: true,
                    companyName: true,
                  },
                },
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            documentType: true,
            createdAt: true,
          },
        },
      },
    });

    // 返回成功响应
    const responseData = {
      case: caseWithDetails,
      // AI系统建议
      aiSuggestions: {
        recommendedActions: [
          '上传仲裁协议',
          '完善案件描述',
          '添加相关证据文件',
        ],
        estimatedProcessingTime: '30-45个工作日',
        suggestedArbitrators: [], // AI可以推荐合适的仲裁员
      },
      // 外部系统集成状态
      externalSystemStatus: {
        courtSystemNotification: 'pending',
        notarySystemVerification: 'not_required',
      },
    };

    return createSuccessResponse(responseData, '案件创建成功');

  } catch (error) {
    logger.error({ err: error }, '创建案件失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 获取案件列表
 * GET /api/cases
 * 需要认证，支持分页和筛选
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const paginationValidation = validateSearchParams(searchParams, paginationSchema);
    if (!paginationValidation.success) {
      return paginationValidation.error;
    }

    const { page, limit } = paginationValidation.data;
    const status = searchParams.get('status') as CaseStatus | null;
    const caseType = searchParams.get('caseType');
    const search = searchParams.get('search');

    // 构建查询条件
    const where: Prisma.ArbitrationCaseWhereInput = {};

    // 根据用户角色过滤案件
    if (PermissionCheckers.canViewAllCases(authUser)) {
      // 管理员、仲裁员、调解员可以查看所有案件
    } else {
      // 普通用户只能查看自己参与的案件
      where.OR = [
        { applicantId: authUser.id },
        { respondentId: authUser.id },
        {
          participants: {
            some: {
              userId: authUser.id,
              isActive: true,
            },
          },
        },
      ];
    }

    // 添加其他筛选条件
    if (status) {
      where.status = status;
    }
    if (caseType) {
      where.caseType = { contains: caseType, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search, mode: 'insensitive' } },
        { caseNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 查询案件总数
    const total = await prisma.arbitrationCase.count({ where });

    // 查询案件列表
    const cases = await prisma.arbitrationCase.findMany({
      where,
      include: {
        applicant: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                realName: true,
                companyName: true,
              },
            },
          },
        },
        respondent: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                realName: true,
                companyName: true,
              },
            },
          },
        },
        _count: {
          select: {
            documents: true,
            participants: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 计算分页信息
    const pagination = calculatePagination(total, page, limit);

    return createPaginatedResponse(cases, pagination, '获取案件列表成功');

  } catch (error) {
    logger.error({ err: error }, '获取案件列表失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 不支持的请求方法
 */
export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
