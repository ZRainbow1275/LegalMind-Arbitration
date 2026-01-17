// dev/src/app/api/neutrals/invitations/route.ts
// M2：中立者邀请列表（被邀请人视角）

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { InvitationStatus, NeutralType } from '@/generated/prisma';

const querySchema = z.object({
  status: z.nativeEnum(InvitationStatus).optional(),
  neutralType: z.nativeEnum(NeutralType).optional(),
});

function getDisplayName(user: { email: string; profile?: { realName: string | null; companyName: string | null } | null }) {
  return user.profile?.realName || user.profile?.companyName || user.email;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsedQuery.success) return ErrorResponses.BAD_REQUEST(parsedQuery.error.flatten());

    const where = {
      invitedUserId: authUser.id,
      ...(parsedQuery.data.status ? { status: parsedQuery.data.status } : {}),
      ...(parsedQuery.data.neutralType ? { neutralType: parsedQuery.data.neutralType } : {}),
    } satisfies Record<string, unknown>;

    const invitations = await prisma.neutralInvitation.findMany({
      where,
      orderBy: [{ status: 'asc' }, { sentAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { disclosures: true } },
        case: {
          select: {
            id: true,
            caseNumber: true,
            caseType: true,
            disputeAmount: true,
            applicant: { select: { email: true, profile: { select: { realName: true, companyName: true } } } },
            respondent: { select: { email: true, profile: { select: { realName: true, companyName: true } } } },
          },
        },
      },
    });

    return createSuccessResponse(
      {
        invitations: invitations.map((inv) => ({
          id: inv.id,
          caseId: inv.caseId,
          caseNumber: inv.case.caseNumber,
          caseType: inv.case.caseType,
          disputeAmount: inv.case.disputeAmount ? inv.case.disputeAmount.toString() : null,
          applicantName: getDisplayName(inv.case.applicant),
          respondentName: inv.case.respondent ? getDisplayName(inv.case.respondent) : null,
          neutralType: inv.neutralType,
          status: inv.status,
          sentAt: inv.sentAt ? inv.sentAt.toISOString() : null,
          expiresAt: inv.expiresAt ? inv.expiresAt.toISOString() : null,
          hasDisclosure: (inv._count.disclosures ?? 0) > 0,
        })),
      },
      '获取邀请列表成功'
    );
    } catch (error) {
      logger.error({ err: error }, '获取邀请列表失败');
      return ErrorResponses.INTERNAL_ERROR();
    }
}
