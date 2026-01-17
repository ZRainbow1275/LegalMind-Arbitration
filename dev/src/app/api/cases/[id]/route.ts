// dev/src/app/api/cases/[id]/route.ts
// 单个案件详情API端点 - 支持AI智能分析和外部系统集成

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers, type AuthenticatedUser } from '@/lib/auth';
import { validatePathParams, validateRequestBody } from '@/lib/validation';
import { uuidSchema, caseUpdateSchema } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import type { ArbitrationCase } from '@/generated/prisma';
import { getExternalSystemManager } from '@/lib/external-systems';
import { logger } from '@/lib/logger';

/**
 * 获取案件详情
 * GET /api/cases/[id]
 * 需要认证和权限验证
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 验证路径参数
    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { id } = pathValidation.data;

    // 查询案件详情
    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id },
      include: {
        applicant: {
          select: {
            id: true,
            email: true,
            phone: true,
            userType: true,
            profile: {
              select: {
                realName: true,
                companyName: true,
                legalRepresentative: true,
                companyAddress: true,
                verificationStatus: true,
              },
            },
          },
        },
        respondent: {
          select: {
            id: true,
            email: true,
            phone: true,
            userType: true,
            profile: {
              select: {
                realName: true,
                companyName: true,
                legalRepresentative: true,
                companyAddress: true,
                verificationStatus: true,
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
          orderBy: { joinedAt: 'asc' },
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            fileSize: true,
            fileType: true,
            documentType: true,
            category: true,
            description: true,
            isPublic: true,
            version: true,
            uploadedBy: true,
            createdAt: true,
            uploadedByUser: {
              select: {
                profile: {
                  select: {
                    realName: true,
                    companyName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        arbitrationProcess: {
          select: {
            aiAnalysis: true,
          },
        },
        caseEvents: {
          orderBy: { sequence: 'asc' },
          take: 200,
          include: {
            actor: {
              select: {
                id: true,
                email: true,
                profile: { select: { realName: true, companyName: true } },
              },
            },
          },
        },
      },
    });

    if (!arbitrationCase) {
      return ErrorResponses.NOT_FOUND('案件');
    }

    // 检查访问权限
    const hasAccess = PermissionCheckers.canViewAllCases(authUser) ||
      arbitrationCase.applicantId === authUser.id ||
      arbitrationCase.respondentId === authUser.id ||
      arbitrationCase.participants.some(p => p.userId === authUser.id && p.isActive);

    if (!hasAccess) {
      return ErrorResponses.FORBIDDEN();
    }

    const aiAnalysis = arbitrationCase.arbitrationProcess?.aiAnalysis ?? null;

    const externalManager = getExternalSystemManager();
    const externalConfigStatus = externalManager.getSystemStatus();
    const externalReachability = await externalManager.testConnections();
    const externalSystemStatus = Object.fromEntries(
      Object.entries(externalConfigStatus).map(([key, value]) => {
        const reachable = externalReachability[key as keyof typeof externalReachability] === true;
        const status = !value.enabled
          ? 'disabled'
          : !value.configured
            ? 'not_configured'
            : reachable
              ? 'healthy'
              : 'unreachable';

        return [
          key,
          {
            status,
            enabled: value.enabled,
            configured: value.configured,
            endpoint: value.endpoint || null,
            lastCheck: new Date().toISOString(),
          },
        ];
      })
    );

    const baseTimeline = [
      {
        event: 'case_created',
        title: '案件创建',
        description: '案件已创建',
        timestamp: arbitrationCase.createdAt,
        actor: arbitrationCase.applicant.profile?.realName || arbitrationCase.applicant.profile?.companyName || arbitrationCase.applicant.email,
      },
      ...(arbitrationCase.submittedAt
        ? [
            {
              event: 'case_submitted',
              title: '案件提交',
              description: '案件已提交审理',
              timestamp: arbitrationCase.submittedAt,
              actor: '系统',
            },
          ]
        : []),
      ...(arbitrationCase.acceptedAt
        ? [
            {
              event: 'case_accepted',
              title: '案件受理',
              description: '案件已受理',
              timestamp: arbitrationCase.acceptedAt,
              actor: '仲裁机构',
            },
          ]
        : []),
    ];

    const eventTimeline = (arbitrationCase.caseEvents || []).map((e) => ({
      sequence: e.sequence.toString(),
      event: e.eventType,
      title: e.eventType,
      description: null,
      timestamp: e.createdAt,
      actor: e.actor?.profile?.realName || e.actor?.profile?.companyName || e.actor?.email || '系统',
    }));

    const timeline = [...baseTimeline, ...eventTimeline];

    const responseData = {
      case: arbitrationCase,
      aiAnalysis,
      externalSystemStatus,
      timeline,
      // 用户在此案件中的角色
      userRole: arbitrationCase.applicantId === authUser.id ? 'applicant' :
                arbitrationCase.respondentId === authUser.id ? 'respondent' :
                arbitrationCase.participants.find(p => p.userId === authUser.id)?.participantType || 'observer',
      // 可执行的操作
      availableActions: getAvailableActions(arbitrationCase, authUser),
    };

    return createSuccessResponse(responseData, '获取案件详情成功');

  } catch (error) {
    logger.error({ err: error }, '获取案件详情失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 更新案件信息
 * PUT /api/cases/[id]
 * 需要认证和权限验证
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });      
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 验证路径参数
    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    // 验证请求体
    const bodyValidation = await validateRequestBody(request, caseUpdateSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }

    const { id } = pathValidation.data;
    const updateData = bodyValidation.data;
    const now = new Date();

    // 查询案件
    const existingCase = await prisma.arbitrationCase.findUnique({
      where: { id },
      select: {
        id: true,
        applicantId: true,
        metadata: true,
        status: true,
        updatedAt: true,
      },
    });

    if (!existingCase) {
      return ErrorResponses.NOT_FOUND('案件');
    }

    // 检查更新权限
    const canUpdate = PermissionCheckers.canManageCase(authUser) ||
      (existingCase.applicantId === authUser.id && existingCase.status === 'DRAFT');

    if (!canUpdate) {
      return ErrorResponses.FORBIDDEN();
    }

    const existingMetadata =
      existingCase.metadata && typeof existingCase.metadata === 'object' && !Array.isArray(existingCase.metadata)
        ? (existingCase.metadata as Record<string, unknown>)
        : {};

    const nextMetadata = {
      ...existingMetadata,
      lastModifiedBy: authUser.id,
      lastModifiedAt: now.toISOString(),
    };

    const updatedCase = await prisma.$transaction(async (tx) => {
      const updated = await tx.arbitrationCase.updateMany({
        where: { id, updatedAt: existingCase.updatedAt },
        data: {
          ...updateData,
          updatedAt: now,
          metadata: nextMetadata,
        },
      });

      if (updated.count === 0) return null;

      return tx.arbitrationCase.findUnique({
        where: { id },
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
        },
      });
    });

    if (!updatedCase) {
      return ErrorResponses.RESOURCE_CONFLICT('案件已被其他人修改，请刷新后重试');
    }

    return createSuccessResponse(updatedCase, '案件更新成功');

  } catch (error) {
    logger.error({ err: error }, '更新案件失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

  /**
   * 获取用户在案件中可执行的操作
   */
  function getAvailableActions(
    arbitrationCase: Pick<ArbitrationCase, 'applicantId' | 'respondentId' | 'status'>,
    authUser: AuthenticatedUser
  ): string[] {
    const actions: string[] = [];

  // 基于案件状态和用户角色确定可用操作
  if (arbitrationCase.applicantId === authUser.id) {
    if (arbitrationCase.status === 'DRAFT') {
      actions.push('edit_case', 'submit_case', 'delete_case');
    }
    actions.push('upload_document', 'view_documents');
  }

  if (arbitrationCase.respondentId === authUser.id) {
    actions.push('upload_document', 'submit_response');
  }

  if (PermissionCheckers.canManageCase(authUser)) {
    actions.push('manage_case', 'assign_arbitrator', 'update_status');
  }

  // AI系统操作
  actions.push('ai_analysis', 'smart_recommendation');

  // 外部系统操作
  if (arbitrationCase.status !== 'DRAFT') {
    actions.push('notify_court', 'request_notarization');
  }

  return actions;
}

/**
 * 不支持的请求方法
 */
export async function POST() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
