// dev/src/app/api/mediations/route.ts
// 调解管理API端点 - 支持仲裁和调解程序互相转换

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, createPaginatedResponse, ErrorResponses, parsePaginationParams, calculatePagination } from '@/lib/api-response';
import { z } from 'zod';
import { CaseStatus, MediationStatus, Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';
import { serializeMediation, toMediationStatus } from '@/lib/mediation-utils';

// 调解申请Schema
const mediationApplicationSchema = z.object({
  caseId: z.string().uuid('无效的案件ID'),
  applicationType: z.enum(['case_to_mediation', 'mediation_request', 'court_mediation'], { message: '无效的申请类型' }),
  reason: z.string().min(10, '申请理由至少10个字符').max(1000, '申请理由不能超过1000个字符'),
  proposedMediator: z.string().uuid('无效的调解员ID').optional(),
  preferredSchedule: z.object({
    preferredDates: z.array(z.string().datetime()).min(1, '至少提供一个可选时间'),
    timeZone: z.string().default('Asia/Shanghai'),
    duration: z.number().min(60, '调解时长至少60分钟').max(480, '调解时长不能超过8小时').default(120),
  }),
  mediationTerms: z.object({
    location: z.enum(['online', 'offline', 'hybrid']).default('online'),
    language: z.string().default('zh-CN'),
    confidentiality: z.boolean().default(true),
    bindingAgreement: z.boolean().default(false),
  }),
  participantConsent: z.object({
    applicantConsent: z.boolean(),
    respondentConsent: z.boolean().optional(),
    allPartiesAgreed: z.boolean().default(false),
  }),
});

// 调解协议Schema
const mediationAgreementSchema = z.object({
  mediationId: z.string().uuid('无效的调解ID'),
    agreementType: z.enum(['partial', 'full', 'framework'], { message: '无效的协议类型' }),
  terms: z.array(z.object({
    category: z.string().min(1, '条款分类不能为空'),
    content: z.string().min(10, '条款内容至少10个字符'),
    agreedBy: z.array(z.string().uuid()),
    status: z.enum(['proposed', 'agreed', 'disputed']).default('proposed'),
  })).min(1, '至少需要一个协议条款'),
  financialTerms: z.object({
    totalAmount: z.number().optional(),
    paymentSchedule: z.array(z.object({
      amount: z.number(),
      dueDate: z.string().datetime(),
      description: z.string(),
    })).optional(),
    currency: z.string().default('CNY'),
  }).optional(),
  implementationPlan: z.object({
    milestones: z.array(z.object({
      description: z.string(),
      deadline: z.string().datetime(),
      responsible: z.string().uuid(),
    })).optional(),
    monitoringMechanism: z.string().optional(),
  }).optional(),
  judicialConfirmation: z.object({
    requested: z.boolean().default(false),
    court: z.string().optional(),
    expectedDate: z.string().datetime().optional(),
  }).optional(),
});

/**
 * 申请调解
 * POST /api/mediations
 * 支持案件转调解、调解申请等
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 验证请求体
    const validation = await validateRequestBody(request, mediationApplicationSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { 
      caseId, 
      applicationType, 
      reason, 
      proposedMediator, 
      preferredSchedule, 
      mediationTerms, 
      participantConsent 
    } = validation.data;

    // 验证案件存在且用户有权限
    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
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
        participants: {
          where: { userId: authUser.id, isActive: true },
          select: { id: true, participantType: true },
        },
      },
    });

    if (!arbitrationCase) {
      return ErrorResponses.NOT_FOUND('案件');
    }

    // 检查申请权限
    const hasAccess = arbitrationCase.applicantId === authUser.id ||
      arbitrationCase.respondentId === authUser.id ||
      arbitrationCase.participants.length > 0 ||
      PermissionCheckers.canManageCase(authUser);

    if (!hasAccess) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有申请调解的权限');
    }

    // 检查案件状态是否允许调解
    const allowedStatuses: CaseStatus[] = [
      CaseStatus.SUBMITTED,
      CaseStatus.ACCEPTED,
      CaseStatus.IN_PROGRESS,
    ];
    if (!allowedStatuses.includes(arbitrationCase.status)) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('当前案件状态不允许申请调解');
    }

    // 生成调解编号
    const mediationNumber = `M${new Date().getFullYear()}${crypto
      .randomBytes(6)
      .toString('hex')
      .toUpperCase()}`;

    // 创建调解申请
    const mediation = await prisma.$transaction(async (tx) => {
      const record = await tx.mediation.create({
        data: {
          mediationNumber,
          caseId,
          applicationType,
          reason,
          proposedMediator: proposedMediator ?? null,
          preferredSchedule: preferredSchedule as Prisma.InputJsonValue,
          mediationTerms: mediationTerms as Prisma.InputJsonValue,
          participantConsent: participantConsent as Prisma.InputJsonValue,      
          status: MediationStatus.PENDING_APPROVAL,
          applicantId: authUser.id,
        },
      });

      await tx.arbitrationCase.update({
        where: { id: caseId },
        data: { status: CaseStatus.MEDIATION },
      });

      return record;
    });

    return createSuccessResponse(
      { mediation: serializeMediation(mediation) },
      '调解申请提交成功'
    );

  } catch (error) {
    logger.error({ err: error }, '申请调解失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 获取调解列表
 * GET /api/mediations
 * 需要认证，支持分页和筛选
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });     
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const caseId = searchParams.get('caseId');
    const status = searchParams.get('status');
    const applicationType = searchParams.get('applicationType');

    const where: Prisma.MediationWhereInput = {};

    if (!PermissionCheckers.canViewAllCases(authUser)) {
      where.case = {
        OR: [
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
        ],
      };
    }

    if (caseId) {
      const parsed = z.string().uuid().safeParse(caseId);
      if (!parsed.success) return ErrorResponses.BAD_REQUEST('无效的caseId');
      where.caseId = parsed.data;
    }

    if (status) {
      const parsed = z
        .enum([
          'pending_approval',
          'approved',
          'in_progress',
          'agreement_draft',
          'agreement_signed',
          'judicial_confirmation_pending',
          'judicial_confirmed',
          'completed',
          'failed',
        ])
        .safeParse(status);
      if (!parsed.success) return ErrorResponses.BAD_REQUEST_MESSAGE('无效的调解状态');
      where.status = toMediationStatus(parsed.data);
    }

    if (applicationType) {
      where.applicationType = applicationType;
    }

    const [total, mediationRows] = await prisma.$transaction([
      prisma.mediation.count({ where }),
      prisma.mediation.findMany({
        where,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
              applicant: {
                select: {
                  id: true,
                  email: true,
                  profile: { select: { realName: true, companyName: true } },
                },
              },
              respondent: {
                select: {
                  id: true,
                  email: true,
                  profile: { select: { realName: true, companyName: true } },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const mediations = mediationRows.map((row) => ({
      ...serializeMediation(row),
      case: row.case,
    }));

    const pagination = calculatePagination(total, page, limit);
    return createPaginatedResponse(mediations, pagination, '获取调解列表成功');

  } catch (error) {
    logger.error({ err: error }, '获取调解列表失败');
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
