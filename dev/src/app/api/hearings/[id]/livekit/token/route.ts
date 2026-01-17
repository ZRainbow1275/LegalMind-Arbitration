import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { buildHearingRoomName, createLiveKitJoinToken, ensureLiveKitRoom } from '@/lib/livekit';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const tokenRequestSchema = z
  .object({
    device: z.enum(['desktop', 'mobile', 'unknown']).optional(),
  })
  .optional();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, { id: uuidSchema });
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { id: hearingId } = pathValidation.data;

    if (request.headers.get('content-type')?.includes('application/json')) {
      const bodyValidation = await (async () => {
        try {
          return { success: true as const, data: tokenRequestSchema?.parse(await request.json()) };
        } catch (error) {
          if (error instanceof z.ZodError) {
            return {
              success: false as const,
              response: ErrorResponses.VALIDATION_ERROR({
                issues: error.issues.map((issue) => ({
                  field: issue.path.join('.'),
                  message: issue.message,
                  code: issue.code,
                })),
              }),
            };
          }
          return { success: false as const, response: ErrorResponses.BAD_REQUEST('请求体格式错误') };
        }
      })();

      if (!bodyValidation.success) return bodyValidation.response;
    }

    const hearing = await prisma.hearing.findUnique({
      where: { id: hearingId },
      select: {
        id: true,
        caseId: true,
        case: {
          select: {
            id: true,
            caseNumber: true,
            applicantId: true,
            respondentId: true,
            participants: {
              select: { userId: true, isActive: true },
            },
          },
        },
        participants: {
          select: { userId: true, email: true },
        },
      },
    });

    if (!hearing) {
      return ErrorResponses.NOT_FOUND('庭审');
    }

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser) ||
      hearing.case.applicantId === authUser.id ||
      hearing.case.respondentId === authUser.id ||
      hearing.case.participants.some((p) => p.userId === authUser.id && p.isActive) ||
      hearing.participants.some((p) => p.userId === authUser.id || p.email === authUser.email);

    if (!hasAccess) {
      return ErrorResponses.FORBIDDEN();
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: authUser.id },
      select: { realName: true, companyName: true },
    });

    const displayName = userProfile?.realName || userProfile?.companyName || authUser.email;
    const roomName = buildHearingRoomName(hearingId);
    const identity = authUser.id;

    const canPublish =
      PermissionCheckers.canManageCase(authUser) ||
      hearing.case.applicantId === authUser.id ||
      hearing.case.respondentId === authUser.id;

    await ensureLiveKitRoom(roomName);

    const token = await createLiveKitJoinToken({
      roomName,
      identity,
      name: displayName,
      canPublish,
      canSubscribe: true,
    });

    const response = createSuccessResponse(
      {
        livekit: {
          ...token,
          displayName,
          caseId: hearing.case.id,
          caseNumber: hearing.case.caseNumber,
        },
      },
      '获取视频庭审凭证成功'
    );

    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'LIVEKIT_NOT_CONFIGURED') {
      return ErrorResponses.SERVICE_NOT_CONFIGURED('LiveKit');
    }

    logger.error({ err: error }, 'LiveKit token generation failed');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function GET() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
