// dev/src/app/api/mediations/[id]/agreement/route.ts
// 调解协议管理API端点 - 支持司法确认流程

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthenticatedUser,
  PermissionCheckers,
  type AuthenticatedUser,
} from '@/lib/auth';
import { validatePathParams, validateRequestBody, uuidSchema } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { MediationStatus, Prisma } from '@/generated/prisma';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { serializeMediationAgreement, fromMediationStatus } from '@/lib/mediation-utils';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const mediationAgreementSchema = z.object({
  agreementType: z.enum(['partial', 'full', 'framework'], { message: '无效的协议类型' }),
  terms: z
    .array(
      z.object({
        category: z.string().min(1, '条款分类不能为空'),
        content: z.string().min(10, '条款内容至少10个字符'),
        agreedBy: z.array(z.string().uuid()),
        status: z.enum(['proposed', 'agreed', 'disputed']).default('proposed'),
      })
    )
    .min(1, '至少需要一个协议条款'),
  financialTerms: z
    .object({
      totalAmount: z.number().optional(),
      paymentSchedule: z
        .array(
          z.object({
            amount: z.number(),
            dueDate: z.string().datetime(),
            description: z.string(),
          })
        )
        .optional(),
      currency: z.string().default('CNY'),
    })
    .optional(),
  implementationPlan: z
    .object({
      milestones: z
        .array(
          z.object({
            description: z.string(),
            deadline: z.string().datetime(),
            responsible: z.string().uuid(),
          })
        )
        .optional(),
      monitoringMechanism: z.string().optional(),
    })
    .optional(),
  judicialConfirmation: z
    .object({
      requested: z.boolean().default(false),
      court: z.string().optional(),
      expectedDate: z.string().datetime().optional(),
    })
    .optional(),
});

const judicialConfirmationSchema = z.object({
  court: z.string().min(1, '法院名称不能为空'),
  requestReason: z.string().min(10, '申请理由至少10个字符').max(500, '申请理由不能超过500个字符'),
  urgency: z.enum(['normal', 'urgent']).default('normal'),
  supportingDocuments: z.array(z.string().uuid()).optional(),
});

type CaseAccessInfo = {
  id: string;
  caseNumber: string;
  title: string;
  applicantId: string;
  respondentId: string | null;
};

function buildReference(prefix: string): string {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}${year}${random}`;
}

async function loadMediationForAgreement(mediationId: string, authUser: AuthenticatedUser) {
  return prisma.mediation.findUnique({
    where: { id: mediationId },
    include: {
      agreement: true,
      case: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
          applicantId: true,
          respondentId: true,
          participants: {
            where: { userId: authUser.id, isActive: true },
            select: { id: true },
          },
        },
      },
    },
  });
}

/**
 * 创建调解协议
 * POST /api/mediations/[id]/agreement
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

    const bodyValidation = await validateRequestBody(request, mediationAgreementSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const { id: mediationId } = pathValidation.data;
    const agreementData = bodyValidation.data;

    const mediation = await loadMediationForAgreement(mediationId, authUser);
    if (!mediation) return ErrorResponses.NOT_FOUND('调解');

    const caseInfo: CaseAccessInfo = {
      id: mediation.case.id,
      caseNumber: mediation.case.caseNumber,
      title: mediation.case.title,
      applicantId: mediation.case.applicantId,
      respondentId: mediation.case.respondentId,
    };

    const hasAccess =
      PermissionCheckers.canManageCase(authUser)
      || caseInfo.applicantId === authUser.id
      || (caseInfo.respondentId !== null && caseInfo.respondentId === authUser.id);
    if (!hasAccess) return ErrorResponses.FORBIDDEN_MESSAGE('您没有创建调解协议的权限');

    if (mediation.agreement) return ErrorResponses.DUPLICATE_RESOURCE('调解协议');

    if (mediation.status === MediationStatus.COMPLETED || mediation.status === MediationStatus.FAILED) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('当前调解状态不允许创建协议');
    }

    const agreementNumber = buildReference('MA');

    const agreement = await prisma.$transaction(async (tx) => {
      const created = await tx.mediationAgreement.create({
        data: {
          agreementNumber,
          agreementType: agreementData.agreementType,
          status: 'draft',
          terms: agreementData.terms as Prisma.InputJsonValue,
          ...(agreementData.financialTerms
            ? { financialTerms: agreementData.financialTerms as Prisma.InputJsonValue }
            : {}),
          ...(agreementData.implementationPlan
            ? { implementationPlan: agreementData.implementationPlan as Prisma.InputJsonValue }
            : {}),
          ...(agreementData.judicialConfirmation
            ? { judicialConfirmation: agreementData.judicialConfirmation as Prisma.InputJsonValue }
            : {}),
          createdBy: authUser.id,
          mediationId,
        },
      });

      await tx.mediation.update({
        where: { id: mediationId },
        data: { status: MediationStatus.AGREEMENT_DRAFT },
      });

      await appendCaseEvent(
        {
          caseId: mediation.caseId,
          eventType: 'MEDIATION_AGREEMENT_CREATED',
          actorUserId: authUser.id,
          traceId,
          payload: {
            mediationId,
            agreementId: created.id,
            agreementNumber,
            agreementType: agreementData.agreementType,
          },
        },
        tx
      );

      return created;
    });

    return createSuccessResponse(
      {
        agreement: serializeMediationAgreement(agreement),
        mediation: { id: mediation.id, status: fromMediationStatus(MediationStatus.AGREEMENT_DRAFT), caseId: mediation.caseId },
        case: caseInfo,
      },
      '调解协议创建成功'
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return ErrorResponses.DUPLICATE_RESOURCE('调解协议');
    }

    logger.error({ err: error, traceId }, '创建调解协议失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 获取调解协议
 * GET /api/mediations/[id]/agreement
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

    const { id: mediationId } = pathValidation.data;

    const mediation = await loadMediationForAgreement(mediationId, authUser);
    if (!mediation) return ErrorResponses.NOT_FOUND('调解');

    const caseInfo: CaseAccessInfo = {
      id: mediation.case.id,
      caseNumber: mediation.case.caseNumber,
      title: mediation.case.title,
      applicantId: mediation.case.applicantId,
      respondentId: mediation.case.respondentId,
    };

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser)
      || PermissionCheckers.canManageCase(authUser)
      || caseInfo.applicantId === authUser.id
      || (caseInfo.respondentId !== null && caseInfo.respondentId === authUser.id)
      || mediation.case.participants.length > 0;
    if (!hasAccess) return ErrorResponses.FORBIDDEN_MESSAGE('您没有查看调解协议的权限');

    if (!mediation.agreement) return ErrorResponses.NOT_FOUND('调解协议');

    return createSuccessResponse(
      {
        agreement: serializeMediationAgreement(mediation.agreement),
        mediation: { id: mediation.id, status: fromMediationStatus(mediation.status), caseId: mediation.caseId },
        case: caseInfo,
      },
      '获取调解协议成功'
    );
  } catch (error) {
    logger.error({ err: error }, '获取调解协议失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 申请司法确认
 * PUT /api/mediations/[id]/agreement
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

    const bodyValidation = await validateRequestBody(request, judicialConfirmationSchema);
    if (!bodyValidation.success) return bodyValidation.error;

    const { id: mediationId } = pathValidation.data;
    const { court, requestReason, urgency, supportingDocuments } = bodyValidation.data;

    const mediation = await loadMediationForAgreement(mediationId, authUser);
    if (!mediation) return ErrorResponses.NOT_FOUND('调解');
    if (!mediation.agreement) return ErrorResponses.NOT_FOUND('调解协议');

    const caseInfo: CaseAccessInfo = {
      id: mediation.case.id,
      caseNumber: mediation.case.caseNumber,
      title: mediation.case.title,
      applicantId: mediation.case.applicantId,
      respondentId: mediation.case.respondentId,
    };

    const hasAccess =
      PermissionCheckers.canManageCase(authUser)
      || caseInfo.applicantId === authUser.id
      || (caseInfo.respondentId !== null && caseInfo.respondentId === authUser.id);
    if (!hasAccess) return ErrorResponses.FORBIDDEN_MESSAGE('您没有申请司法确认的权限');

    if (mediation.agreement.status !== 'signed') {
      return ErrorResponses.BAD_REQUEST_MESSAGE('只有已签署的协议才能申请司法确认');
    }

    const confirmationNumber = buildReference('JC');
    const submissionDate = new Date().toISOString();

    const updatedAgreement = await prisma.$transaction(async (tx) => {
      const updated = await tx.mediationAgreement.update({
        where: { id: mediation.agreement!.id },
        data: {
          status: 'judicial_confirmation_pending',
          judicialConfirmation: {
            requested: true,
            court,
            requestReason,
            urgency,
            supportingDocuments: supportingDocuments ?? [],
            confirmationNumber,
            status: 'submitted',
            submissionDate,
            submittedBy: authUser.id,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.mediation.update({
        where: { id: mediationId },
        data: { status: MediationStatus.JUDICIAL_CONFIRMATION_PENDING },
      });

      await appendCaseEvent(
        {
          caseId: mediation.caseId,
          eventType: 'MEDIATION_JUDICIAL_CONFIRMATION_REQUESTED',
          actorUserId: authUser.id,
          traceId,
          payload: {
            mediationId,
            agreementId: updated.id,
            confirmationNumber,
            court,
            urgency,
          },
        },
        tx
      );

      return updated;
    });

    return createSuccessResponse(
      {
        confirmationNumber,
        agreement: serializeMediationAgreement(updatedAgreement),
        mediation: { id: mediation.id, status: fromMediationStatus(MediationStatus.JUDICIAL_CONFIRMATION_PENDING), caseId: mediation.caseId },
        case: caseInfo,
      },
      '司法确认申请提交成功'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '申请司法确认失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
