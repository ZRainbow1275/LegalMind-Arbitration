// dev/src/app/api/hearings/[id]/route.ts
// 单个庭审详情和管理 API 端点（基于 Hearing/HearingParticipant 模型）

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  requireAuthenticatedUser,
  PermissionCheckers,
  type AuthenticatedUser,
} from '@/lib/auth';
import {
  validatePathParams,
  validateRequestBody,
  uuidSchema,
} from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { HearingStatus, type Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';
import {
  fromParticipantType,
  serializeHearing,
  toHearingStatus,
} from '@/lib/hearing-utils';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';

// 庭审状态更新 Schema
const hearingStatusUpdateSchema = z.object({
  status: z.enum([
    'scheduled',
    'preparing',
    'in_progress',
    'paused',
    'completed',
    'cancelled',
  ]),
  reason: z.string().max(500, '原因说明不能超过500个字符').optional(),
});

// 参与者操作 Schema
const participantActionSchema = z.object({
  action: z.enum([
    'join',
    'leave',
    'mute',
    'unmute',
    'enable_video',
    'disable_video',
  ]),
  participantId: z.string().uuid('无效的参与者ID').optional(),
});

type HearingRecord = Prisma.HearingGetPayload<{
  include: {
    participants: true;
    case: {
      select: {
        id: true;
        caseNumber: true;
        title: true;
        status: true;
        applicantId: true;
        respondentId: true;
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
        participants: {
          select: { userId: true; isActive: true };
        };
      };
    };
  };
}>;

function hasHearingAccess(hearing: HearingRecord, authUser: AuthenticatedUser): boolean {
  if (PermissionCheckers.canViewAllCases(authUser)) return true;
  if (hearing.case.applicantId === authUser.id) return true;
  if (hearing.case.respondentId === authUser.id) return true;
  if (hearing.case.participants.some((p) => p.userId === authUser.id && p.isActive)) {
    return true;
  }
  return hearing.participants.some((p) => p.userId === authUser.id);
}

function getUserRoleInHearing(hearing: HearingRecord, authUser: AuthenticatedUser): string {
  if (hearing.case.applicantId === authUser.id) return 'applicant';
  if (hearing.case.respondentId === authUser.id) return 'respondent';

  const participant = hearing.participants.find((p) => p.userId === authUser.id);
  if (participant) return fromParticipantType(participant.role);

  if (PermissionCheckers.canManageCase(authUser)) return 'arbitrator';
  return 'observer';
}

function getAvailableHearingActions(hearing: HearingRecord, authUser: AuthenticatedUser): string[] {
  const actions: string[] = [];
  const userRole = getUserRoleInHearing(hearing, authUser);

  // 基本参与操作
  if (hearing.participants.some((p) => p.userId === authUser.id)) {
    actions.push('join', 'leave', 'mute', 'unmute', 'enable_video', 'disable_video');
  }

  // 管理操作
  if (PermissionCheckers.canManageCase(authUser)) {
    actions.push(
      'start_hearing',
      'pause_hearing',
      'end_hearing',
      'manage_participants',
      'start_recording',
      'stop_recording',
      'share_screen'
    );
  }

  // 角色特定操作
  if (userRole === 'arbitrator') {
    actions.push('control_speaking', 'manage_evidence', 'take_notes');
  }

  return actions;
}

/**
 * 获取庭审详情
 * GET /api/hearings/[id]
 */
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

    const { id: hearingId } = pathValidation.data;

    const hearing = (await prisma.hearing.findUnique({
      where: { id: hearingId },
      include: {
        participants: true,
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
            applicantId: true,
            respondentId: true,
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
            participants: {
              select: { userId: true, isActive: true },
            },
          },
        },
      },
    })) as HearingRecord | null;

    if (!hearing) return ErrorResponses.NOT_FOUND('庭审');
    if (!hasHearingAccess(hearing, authUser)) return ErrorResponses.FORBIDDEN();

    const connectedCount = hearing.participants.filter(
      (p) => p.connectionStatus === 'connected'
    ).length;

    const isInProgress = hearing.status === HearingStatus.IN_PROGRESS;
    const recordingDuration =
      isInProgress && hearing.startedAt
        ? Math.floor((Date.now() - hearing.startedAt.getTime()) / 1000)
        : 0;

    const realTimeStatus = {
      currentParticipants: connectedCount,
      totalParticipants: hearing.participants.length,
      isRecording: isInProgress,
      recordingDuration,
      networkQuality: 'good',
    };

    const hearingTimeline = [
      {
        timestamp: hearing.createdAt.toISOString(),
        event: 'hearing_scheduled',
        description: '庭审已安排',
        actor: '系统',
      },
      ...(hearing.startedAt
        ? [
            {
              timestamp: hearing.startedAt.toISOString(),
              event: 'hearing_started',
              description: '庭审开始',
              actor: '仲裁员',
            },
          ]
        : []),
      ...(hearing.endedAt
        ? [
            {
              timestamp: hearing.endedAt.toISOString(),
              event: 'hearing_ended',
              description: '庭审结束',
              actor: '仲裁员',
            },
          ]
        : []),
    ];

    const responseData = {
      hearing: {
        ...serializeHearing(hearing),
        case: {
          id: hearing.case.id,
          caseNumber: hearing.case.caseNumber,
          title: hearing.case.title,
          applicant: hearing.case.applicant,
          respondent: hearing.case.respondent,
        },
      },
      realTimeStatus,
      aiRealTimeAnalysis: {
        speechAnalysis: {
          currentSpeaker: null,
          speakingTime: {},
          emotionAnalysis: 'neutral',
          keyPoints: [],
        },
        participantEngagement: {
          activeParticipants: connectedCount,
          attentionLevel: 'high',
          interactionScore: 8.5,
        },
        contentAnalysis: {
          topicsCovered: [],
          evidencePresented: 0,
          objectionCount: 0,
          agreementPoints: [],
        },
      },
      timeline: hearingTimeline,
      userRole: getUserRoleInHearing(hearing, authUser),
      availableActions: getAvailableHearingActions(hearing, authUser),
      technicalInfo: {
        webrtcConfig:
          hearing.webrtcConfig ??
          ({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          } satisfies Record<string, unknown>),
        recordingConfig: {
          format: 'mp4',
          quality: 'hd',
          autoBackup: true,
        },
        transcriptionConfig: {
          language: 'zh-CN',
          realTime: true,
          accuracy: 'high',
        },
      },
    };

    return createSuccessResponse(responseData, '获取庭审详情成功');
  } catch (error) {
    logger.error({ err: error }, '获取庭审详情失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 更新庭审状态
 * PUT /api/hearings/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;

    const bodyValidation = await validateRequestBody(request, hearingStatusUpdateSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const { id: hearingId } = pathValidation.data;
    const { status, reason } = bodyValidation.data;

    if (!PermissionCheckers.canManageCase(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有庭审管理权限');
    }

    const now = new Date();
    const nextStatus = toHearingStatus(status);

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.hearing.findUnique({
        where: { id: hearingId },
        select: { id: true, caseId: true, status: true, startedAt: true, endedAt: true },
      });
      if (!existing) return null;

      const updateData: Prisma.HearingUpdateInput = {
        status: nextStatus,
      };

      if (nextStatus === HearingStatus.IN_PROGRESS && !existing.startedAt) {
        updateData.startedAt = now;
      }

      if (
        (nextStatus === HearingStatus.COMPLETED || nextStatus === HearingStatus.CANCELLED) &&
        !existing.endedAt
      ) {
        updateData.endedAt = now;
      }

      const updatedHearing = await tx.hearing.update({
        where: { id: hearingId },
        data: updateData,
        include: {
          participants: true,
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
              status: true,
              applicantId: true,
              respondentId: true,
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
              participants: { select: { userId: true, isActive: true } },
            },
          },
        },
      });

      let caseStatus = updatedHearing.case.status;
      if (nextStatus === HearingStatus.COMPLETED) {
        caseStatus = 'DELIBERATION';
      } else if (nextStatus === HearingStatus.IN_PROGRESS) {
        caseStatus = 'HEARING';
      }

      if (caseStatus !== updatedHearing.case.status) {
        await tx.arbitrationCase.update({
          where: { id: updatedHearing.caseId },
          data: { status: caseStatus },
        });
      }

      await appendCaseEvent(
        {
          caseId: updatedHearing.caseId,
          eventType: 'HEARING_STATUS_CHANGED',
          actorUserId: authUser.id,
          traceId,
          payload: {
            hearingId,
            status,
            reason: reason ?? null,
          },
        },
        tx
      );

      return updatedHearing;
    });

    if (!updated) return ErrorResponses.NOT_FOUND('庭审');
    return createSuccessResponse(serializeHearing(updated), '庭审状态更新成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '更新庭审状态失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 参与者操作
 * POST /api/hearings/[id]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) return pathValidation.error;

    const bodyValidation = await validateRequestBody(request, participantActionSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const { id: hearingId } = pathValidation.data;
    const { action, participantId } = bodyValidation.data;

    const hearing = await prisma.hearing.findUnique({
      where: { id: hearingId },
      select: {
        id: true,
        caseId: true,
        case: {
          select: {
            applicantId: true,
            respondentId: true,
            participants: { select: { userId: true, isActive: true } },
          },
        },
        participants: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!hearing) return ErrorResponses.NOT_FOUND('庭审');

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser) ||
      hearing.case.applicantId === authUser.id ||
      hearing.case.respondentId === authUser.id ||
      hearing.case.participants.some((p) => p.userId === authUser.id && p.isActive) ||
      hearing.participants.some((p) => p.userId === authUser.id);

    if (!hasAccess) return ErrorResponses.FORBIDDEN_MESSAGE('您没有参与此庭审的权限');

    const canManage = PermissionCheckers.canManageCase(authUser);

    const target = participantId
      ? hearing.participants.find((p) => p.id === participantId) ?? null
      : hearing.participants.find((p) => p.userId === authUser.id) ?? null;

    if (!target) return ErrorResponses.NOT_FOUND('参与者');
    if (target.userId !== authUser.id && !canManage) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有权限操作该参与者');
    }

    const now = new Date();
    const update: Prisma.HearingParticipantUpdateInput = {};

    switch (action) {
      case 'join':
        update.connectionStatus = 'connected';
        update.joinedAt = now;
        break;
      case 'leave':
        update.connectionStatus = 'disconnected';
        update.leftAt = now;
        break;
      case 'mute':
        update.audioEnabled = false;
        break;
      case 'unmute':
        update.audioEnabled = true;
        break;
      case 'enable_video':
        update.videoEnabled = true;
        break;
      case 'disable_video':
        update.videoEnabled = false;
        break;
    }

    await prisma.hearingParticipant.update({
      where: { id: target.id },
      data: update,
    });

    await appendCaseEvent({
      caseId: hearing.caseId,
      eventType: 'HEARING_PARTICIPANT_ACTION',
      actorUserId: authUser.id,
      traceId,
      payload: {
        hearingId,
        action,
        participantId: target.id,
      },
    });

    return createSuccessResponse({ action, status: 'success' }, '操作执行成功');
  } catch (error) {
    logger.error({ err: error, traceId }, '庭审参与者操作失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 不支持的请求方法
 */
export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

