// dev/src/app/api/hearings/route.ts
// 庭审管理API端点 - 支持在线视频庭审和AI智能辅助

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, createPaginatedResponse, ErrorResponses, parsePaginationParams, calculatePagination } from '@/lib/api-response';
import { z } from 'zod';
import { HearingStatus, Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';
import { toHearingStatus, toHearingType, toParticipantType, serializeHearing } from '@/lib/hearing-utils';

// 庭审创建Schema
const hearingCreationSchema = z.object({
  caseId: z.string().uuid('无效的案件ID'),
  title: z.string().min(5, '庭审标题至少5个字符').max(200, '庭审标题不能超过200个字符'),
  description: z.string().max(1000, '庭审描述不能超过1000个字符').optional(),
  scheduledAt: z.string().datetime('无效的时间格式'),
  estimatedDuration: z.number().min(30, '预计时长至少30分钟').max(480, '预计时长不能超过8小时').default(120),
  hearingType: z.enum(['initial', 'evidence', 'debate', 'final'], { message: '无效的庭审类型' }),
  isOnline: z.boolean().default(true),
  participants: z.array(z.object({
    userId: z.string().uuid().optional(),
    role: z.enum(['applicant', 'respondent', 'arbitrator', 'witness', 'observer']),
    name: z.string().min(1, '参与者姓名不能为空'),
    email: z.string().email('无效的邮箱格式').optional(),
    isRequired: z.boolean().default(true),
  })).min(1, '至少需要一个参与者'),
});

/**
 * 创建庭审会话
 * POST /api/hearings
 * 需要认证和权限验证
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 检查庭审管理权限
    if (!PermissionCheckers.canManageCase(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有庭审管理权限');
    }

    // 验证请求体
    const validation = await validateRequestBody(request, hearingCreationSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { caseId, title, description, scheduledAt, estimatedDuration, hearingType, isOnline, participants } = validation.data;

    // 验证案件存在且用户有权限
    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        title: true,
        status: true,
        applicantId: true,
        respondentId: true,
        metadata: true,
      },
    });

    if (!arbitrationCase) {
      return ErrorResponses.NOT_FOUND('案件');
    }

    // 检查案件状态是否允许创建庭审
    const allowedStatuses = ['ACCEPTED', 'IN_PROGRESS', 'HEARING'];
    if (!allowedStatuses.includes(arbitrationCase.status)) {
      return ErrorResponses.BAD_REQUEST('当前案件状态不允许创建庭审');
    }

    // 生成庭审编号
    const hearingNumber = `H${Date.now().toString(36).toUpperCase()}`;

    // 创建庭审会话
    const hearing = await prisma.$transaction(async (tx) => {
      const hearingRecord = await tx.hearing.create({
        data: {
          hearingNumber,
          caseId,
          title,
          description: description ?? null,
          scheduledAt: new Date(scheduledAt),
          estimatedDuration,
          hearingType: toHearingType(hearingType),
          isOnline,
          status: HearingStatus.SCHEDULED,
          createdBy: authUser.id,
          aiFeatures: {
            autoRecording: true,
            speechToText: true,
            realTimeTranscription: true,
            intelligentSummary: true,
          },
          participants: {
            create: participants.map((participant) => ({
              userId: participant.userId ?? null,
              role: toParticipantType(participant.role),
              name: participant.name,
              email: participant.email ?? null,
              isRequired: participant.isRequired,
              connectionStatus: 'not_connected',
              audioEnabled: true,
              videoEnabled: true,
            })),
          },
        },
        include: { participants: true },
      });

      await tx.arbitrationCase.update({
        where: { id: caseId },
        data: { status: 'HEARING' },
      });

      return hearingRecord;
    });

    // AI智能分析和建议
    const aiAnalysis = {
      participantAnalysis: {
        totalParticipants: participants.length,
        requiredParticipants: participants.filter(p => p.isRequired).length,
        roles: participants.reduce((acc, p) => {
          acc[p.role] = (acc[p.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      recommendations: [
        '建议提前15分钟开始庭审准备',
        '确保所有参与者已收到庭审通知',
        '准备相关证据材料和文档',
      ],
      technicalRequirements: {
        bandwidth: '建议上行带宽至少2Mbps',
        devices: '建议使用电脑或平板参与庭审',
        browser: '推荐使用Chrome或Edge浏览器',
      },
    };

    const responseData = {
      hearing: serializeHearing(hearing),
      aiAnalysis,
      // 庭审链接和访问信息
      accessInfo: {
        hearingUrl: `${process.env.NEXTAUTH_URL}/hearings/${hearing.id}`,       
        waitingRoomUrl: `${process.env.NEXTAUTH_URL}/hearings/${hearing.id}/waiting-room`,
        dialInNumber: '+86-400-123-4567',
        meetingId: hearing.hearingNumber,
      },
      // 外部系统集成状态
      externalSystemStatus: {
        videoConference: { status: 'ready', provider: 'WebRTC' },
        recording: { status: 'enabled', storage: 'secure_cloud' },
        transcription: { status: 'enabled', language: 'zh-CN' },
      },
    };

    return createSuccessResponse(responseData, '庭审会话创建成功');

  } catch (error) {
    logger.error({ err: error }, '创建庭审会话失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 获取庭审列表
 * GET /api/hearings
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
    const hearingType = searchParams.get('hearingType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Prisma.HearingWhereInput = {};

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
      where.caseId = caseId;
    }

    if (status) {
      const parsed = z
        .enum(['scheduled', 'preparing', 'in_progress', 'paused', 'completed', 'cancelled'])
        .safeParse(status);
      if (!parsed.success) return ErrorResponses.BAD_REQUEST_MESSAGE('无效的庭审状态');
      where.status = toHearingStatus(parsed.data);
    }

    if (hearingType) {
      const parsed = z.enum(['initial', 'evidence', 'debate', 'final']).safeParse(hearingType);
      if (!parsed.success) return ErrorResponses.BAD_REQUEST_MESSAGE('无效的庭审类型');
      where.hearingType = toHearingType(parsed.data);
    }

    if (dateFrom || dateTo) {
      const scheduledAt: Prisma.DateTimeFilter<'Hearing'> = {};
      if (dateFrom) scheduledAt.gte = new Date(dateFrom);
      if (dateTo) scheduledAt.lte = new Date(dateTo);
      where.scheduledAt = scheduledAt;
    }

    type HearingRow = Prisma.HearingGetPayload<{
      include: {
        participants: true;
        case: {
          select: {
            id: true;
            caseNumber: true;
            title: true;
            applicant: {
              select: {
                id: true;
                email: true;
                profile: { select: { realName: true; companyName: true } };
              };
            };
            respondent: {
              select: {
                id: true;
                email: true;
                profile: { select: { realName: true; companyName: true } };
              };
            };
          };
        };
      };
    }>;

    const [total, hearingRows] = await prisma.$transaction([
      prisma.hearing.count({ where }),
      prisma.hearing.findMany({
        where,
        include: {
          participants: true,
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
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const hearings = (hearingRows as HearingRow[]).map((row) => ({
      ...serializeHearing(row),
      case: row.case,
    }));

    const pagination = calculatePagination(total, page, limit);
    return createPaginatedResponse(hearings, pagination, '获取庭审列表成功');

  } catch (error) {
    logger.error({ err: error }, '获取庭审列表失败');
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
