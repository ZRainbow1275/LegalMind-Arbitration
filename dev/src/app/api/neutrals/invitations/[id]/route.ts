// dev/src/app/api/neutrals/invitations/[id]/route.ts
// M2：中立者邀请详情

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validatePathParams, uuidSchema } from '@/lib/validation';
import { Role } from '@/generated/prisma';

const pathSchema = z.object({
  id: uuidSchema,
});

function getDisplayName(user: { email: string; profile?: { realName: string | null; companyName: string | null } | null }) {
  return user.profile?.realName || user.profile?.companyName || user.email;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string | string[]>> }
) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: false });     
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const resolvedParams = await params;
    const pathValidation = validatePathParams(resolvedParams, pathSchema);
    if (!pathValidation.success) return pathValidation.error;

    const invitationId = pathValidation.data.id;

    const invitation = await prisma.neutralInvitation.findUnique({
      where: { id: invitationId },
      include: {
        invitedUser: {
          select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } },
        },
        invitedByUser: {
          select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } },
        },
        disclosures: { orderBy: { createdAt: 'desc' }, take: 5 },
        responses: { orderBy: { createdAt: 'desc' }, take: 10 },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            description: true,
            caseType: true,
            disputeAmount: true,
            applicantId: true,
            respondentId: true,
            applicant: { select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } } },
            respondent: { select: { id: true, email: true, profile: { select: { realName: true, companyName: true } } } },
          },
        },
      },
    });

    if (!invitation) return ErrorResponses.NOT_FOUND('邀请');

    const isInvited = invitation.invitedUserId === authUser.id;
    const isParty = invitation.case.applicantId === authUser.id || invitation.case.respondentId === authUser.id;
    const isBusinessAdmin = authUser.roles.includes(Role.ADMIN);
    if (!isInvited && !isParty && !isBusinessAdmin) {
      return ErrorResponses.FORBIDDEN_MESSAGE('无权查看该邀请');
    }

    const consent = await prisma.partyConsent.findUnique({
      where: {
        caseId_targetType_targetUserId: {
          caseId: invitation.caseId,
          targetType: invitation.neutralType,
          targetUserId: invitation.invitedUserId,
        },
      },
    });

    return createSuccessResponse(
      {
        invitation: {
          id: invitation.id,
          caseId: invitation.caseId,
          neutralType: invitation.neutralType,
          status: invitation.status,
          expiresAt: invitation.expiresAt ? invitation.expiresAt.toISOString() : null,
          sentAt: invitation.sentAt ? invitation.sentAt.toISOString() : null,
          respondedAt: invitation.respondedAt ? invitation.respondedAt.toISOString() : null,
          requirements: invitation.requirements,
          invitedUser: {
            id: invitation.invitedUser.id,
            email: invitation.invitedUser.email,
            displayName: getDisplayName(invitation.invitedUser),
          },
          invitedByUser: {
            id: invitation.invitedByUser.id,
            email: invitation.invitedByUser.email,
            displayName: getDisplayName(invitation.invitedByUser),
          },
        },
        case: {
          id: invitation.case.id,
          caseNumber: invitation.case.caseNumber,
          title: invitation.case.title,
          description: invitation.case.description ?? null,
          caseType: invitation.case.caseType,
          disputeAmount: invitation.case.disputeAmount ? invitation.case.disputeAmount.toString() : null,
          applicant: {
            id: invitation.case.applicant.id,
            displayName: getDisplayName(invitation.case.applicant),
          },
          respondent: invitation.case.respondent
            ? { id: invitation.case.respondent.id, displayName: getDisplayName(invitation.case.respondent) }
            : null,
        },
        disclosures: invitation.disclosures.map((d) => ({
          id: d.id,
          disclosureText: d.disclosureText,
          attachments: d.attachments,
          signedAt: d.signedAt ? d.signedAt.toISOString() : null,
          signatureRef: d.signatureRef,
          createdAt: d.createdAt.toISOString(),
        })),
        responses: invitation.responses.map((r) => ({
          id: r.id,
          action: r.action,
          reason: r.reason,
          respondedAt: r.respondedAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        })),
        consent: consent
          ? {
              id: consent.id,
              status: consent.status,
              applicantDecision: consent.applicantDecision,
              respondentDecision: consent.respondentDecision,
            }
          : null,
      },
      '获取邀请详情成功'
    );
    } catch (error) {
      logger.error({ err: error }, '获取邀请详情失败');
      return ErrorResponses.INTERNAL_ERROR();
    }
}
