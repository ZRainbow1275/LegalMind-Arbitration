// dev/src/lib/case-guard.ts
// API 路由共用的案件访问控制：避免在每个 route.ts 里重复实现
import { prisma } from '@/lib/prisma';
import { ErrorResponses } from '@/lib/api-response';
import { PermissionCheckers, type AuthenticatedUser } from '@/lib/auth';
import { CaseStatus } from '@/generated/prisma';

export type CaseGuardMode = 'view' | 'manage' | 'submit';

export type CaseGuardResult =
  | { ok: true; arbitrationCase: { id: string; applicantId: string; respondentId: string | null; status: CaseStatus } }
  | { ok: false; response: Response };

export async function requireCaseAccess(params: {
  caseId: string;
  authUser: AuthenticatedUser;
  mode: CaseGuardMode;
}): Promise<CaseGuardResult> {
  const { caseId, authUser, mode } = params;
  const arbitrationCase = await prisma.arbitrationCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      applicantId: true,
      respondentId: true,
      status: true,
      participants: {
        where: { userId: authUser.id, isActive: true },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!arbitrationCase) return { ok: false, response: ErrorResponses.NOT_FOUND('案件') };

  const isParticipant =
    arbitrationCase.applicantId === authUser.id ||
    arbitrationCase.respondentId === authUser.id ||
    arbitrationCase.participants.length > 0;

  const canViewAll = PermissionCheckers.canViewAllCases(authUser);
  const canManage = PermissionCheckers.canManageCase(authUser);

  if (mode === 'view') {
    if (!canViewAll && !isParticipant) return { ok: false, response: ErrorResponses.FORBIDDEN() };
    return {
      ok: true,
      arbitrationCase: {
        id: arbitrationCase.id,
        applicantId: arbitrationCase.applicantId,
        respondentId: arbitrationCase.respondentId,
        status: arbitrationCase.status,
      },
    };
  }

  if (mode === 'manage') {
    if (!canManage && !isParticipant) return { ok: false, response: ErrorResponses.FORBIDDEN() };
    return {
      ok: true,
      arbitrationCase: {
        id: arbitrationCase.id,
        applicantId: arbitrationCase.applicantId,
        respondentId: arbitrationCase.respondentId,
        status: arbitrationCase.status,
      },
    };
  }

  // submit：仅允许申请人提交 DRAFT
  if (arbitrationCase.applicantId !== authUser.id) {
    return { ok: false, response: ErrorResponses.FORBIDDEN_MESSAGE('仅申请人可提交案件') };
  }

  if (arbitrationCase.status !== CaseStatus.DRAFT) {
    return { ok: false, response: ErrorResponses.RESOURCE_CONFLICT('仅草稿案件可提交') };
  }

  return {
    ok: true,
    arbitrationCase: {
      id: arbitrationCase.id,
      applicantId: arbitrationCase.applicantId,
      respondentId: arbitrationCase.respondentId,
      status: arbitrationCase.status,
    },
  };
}

