// dev/src/app/api/ai/generate/route.ts
// 文书生成：对齐 docs/API_REFERENCE.md 的 POST /api/ai/generate
//
// 设计原则：
// - 禁止“模拟成功”：必须写入 GeneratedDocument，并返回可下载/预览 URL。
// - 默认基于模板：选择 DocumentTemplate 并填充系统变量；其余变量可在 OPENAI 配置后由 AI 辅助补齐。
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { getAIServiceManager } from '@/lib/ai-services';
import {
  applyStyles,
  extractTemplatePlaceholders,
  hasNonEmptyValue,
  processTemplateContent,
  templateStylesSchema,
  templateVariableSchema,
  type CaseInfoLike,
} from '@/lib/document-generation';
import type { Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const schema = z
  .object({
    caseId: z.string().uuid(),
    documentType: z.enum(['decision', 'notice', 'report']),
    template: z.string().max(100).optional().default('standard'),
  })
  .strict();

function buildDocumentTitle(params: {
  documentType: z.infer<typeof schema>['documentType'];
  caseNumber: string;
}): string {
  const typeName =
    params.documentType === 'decision'
      ? '裁决书'
      : params.documentType === 'notice'
        ? '通知书'
        : '报告';
  return `${params.caseNumber}-${typeName}`.slice(0, 200);
}

function getTemplateTypeCandidates(
  documentType: z.infer<typeof schema>['documentType']
): string[] {
  if (documentType === 'decision') return ['decision', 'award'];
  if (documentType === 'notice') return ['notice', 'notification'];
  return ['report'];
}

function toJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v))
  ) as Prisma.InputJsonValue;
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    if (!PermissionCheckers.canManageCase(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有生成文书的权限');
    }

    const validation = await validateRequestBody(request, schema);
    if (!validation.success) return validation.error;

    const { caseId, documentType, template: templateKeyword } = validation.data;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      include: {
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
    });

    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser)
      || arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id;

    if (!hasAccess) return ErrorResponses.FORBIDDEN_MESSAGE('您没有访问此案件的权限');

    const templateTypeCandidates = getTemplateTypeCandidates(documentType);
    const keyword = templateKeyword.trim();

    const where: Prisma.DocumentTemplateWhereInput = {
      isActive: true,
      templateType: { in: templateTypeCandidates },
      ...(keyword
        ? {
            OR: [
              { category: { equals: keyword } },
              { name: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const template = await prisma.documentTemplate.findFirst({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });

    if (!template) {
      return ErrorResponses.NOT_FOUND('文书模板');
    }

    const templateVariablesParsed = z
      .array(templateVariableSchema)
      .safeParse(template.variables);
    if (!templateVariablesParsed.success) {
      return ErrorResponses.BAD_REQUEST_MESSAGE(
        '模板变量格式无效',
        templateVariablesParsed.error.issues
      );
    }
    const templateVariables = templateVariablesParsed.data;
    const requiredKeySet = new Set(
      templateVariables.filter((v) => v.required).map((v) => v.key)
    );

    const caseInfo: CaseInfoLike = {
      caseNumber: arbitrationCase.caseNumber,
      title: arbitrationCase.title,
      disputeAmount: arbitrationCase.disputeAmount?.toNumber?.() ?? undefined,
      currency: arbitrationCase.currency,
      applicant: arbitrationCase.applicant ?? null,
      respondent: arbitrationCase.respondent ?? null,
    };

    const variables: Record<string, unknown> = {};

    // 1) 先进行一次系统变量填充，减少 AI 输入规模
    let processedContent = await processTemplateContent({
      templateContent: template.templateContent,
      variables,
      caseInfo,
      authUser,
    });

    // 2) 若仍存在占位符，且 AI 已配置，则尝试用 AI 填充剩余变量
    const pendingPlaceholders = extractTemplatePlaceholders(processedContent);
    if (pendingPlaceholders.length > 0) {
      const ai = getAIServiceManager();
      const aiFill = await ai.fillTemplateVariables({
        documentType,
        template: {
          templateType: template.templateType,
          name: template.name,
          category: template.category,
          variables: templateVariables.map((v) => ({
            key: v.key,
            name: v.name,
            required: v.required ?? false,
          })),
        },
        placeholders: pendingPlaceholders,
        caseContext: {
          case: {
            id: arbitrationCase.id,
            caseNumber: arbitrationCase.caseNumber,
            title: arbitrationCase.title,
            description: arbitrationCase.description,
            status: arbitrationCase.status,
            disputeAmount: arbitrationCase.disputeAmount?.toString?.() ?? null,
            currency: arbitrationCase.currency,
          },
          parties: {
            applicant: {
              email: arbitrationCase.applicant?.email,
              name:
                arbitrationCase.applicant?.profile?.realName
                || arbitrationCase.applicant?.profile?.companyName
                || null,
            },
            respondent: {
              email: arbitrationCase.respondent?.email,
              name:
                arbitrationCase.respondent?.profile?.realName
                || arbitrationCase.respondent?.profile?.companyName
                || null,
            },
          },
        },
      });

      if (!aiFill.success) {
        if (aiFill.error === 'SERVICE_NOT_CONFIGURED') {
          return ErrorResponses.SERVICE_NOT_CONFIGURED('AI 文书生成/变量填充');
        }
        if (aiFill.error?.endsWith('_NOT_IMPLEMENTED')) {
          return ErrorResponses.NOT_IMPLEMENTED(
            `AI 文书生成尚未实现：${aiFill.error}`
          );
        }
        return ErrorResponses.OPERATION_FAILED(aiFill.error || 'AI 文书生成失败');
      }

      const filled = aiFill.data ?? {};
      for (const [key, value] of Object.entries(filled)) {
        if (hasNonEmptyValue(value)) {
          variables[key] = value;
        } else if (requiredKeySet.has(key)) {
          variables[key] = '【待补充】';
        }
      }

      processedContent = await processTemplateContent({
        templateContent: template.templateContent,
        variables,
        caseInfo,
        authUser,
      });
    }

    const templateStylesParsed = templateStylesSchema.safeParse(template.styles ?? {});
    if (!templateStylesParsed.success) {
      return ErrorResponses.BAD_REQUEST_MESSAGE(
        '模板样式配置无效',
        templateStylesParsed.error.issues
      );
    }

    const styledContent = applyStyles({
      content: processedContent,
      templateStyles: templateStylesParsed.data,
    });

    const generatedDocumentId = crypto.randomUUID();
    const documentNumber = `AIDOC-${Date.now().toString(36).toUpperCase()}-${generatedDocumentId
      .slice(0, 8)
      .toUpperCase()}`;
    const fileUrl = `/api/documents/generated/${generatedDocumentId}/download`;
    const previewUrl = `/api/documents/generated/${generatedDocumentId}/preview`;
    const title = buildDocumentTitle({
      documentType,
      caseNumber: arbitrationCase.caseNumber,
    });

    const unreplacedVariables = extractTemplatePlaceholders(processedContent);

    const created = await prisma.$transaction(async (tx) => {
      await tx.documentTemplate.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 } },
      });

      return await tx.generatedDocument.create({
        data: {
          id: generatedDocumentId,
          templateId: template.id,
          caseId,
          documentNumber,
          title,
          generatedContent: styledContent,
          variables: toJsonValue(variables),
          fileUrl,
          fileFormat: 'html',
          fileSize: Buffer.byteLength(styledContent, 'utf8'),
          status: 'generated',
          generatedBy: authUser.id,
        },
      });
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.DOCUMENT_GENERATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'ai/generate',
      action: 'generate',
      details: {
        traceId,
        caseId,
        templateId: template.id,
        generatedDocumentId: created.id,
        documentNumber: created.documentNumber,
        templateType: template.templateType,
        missingPlaceholders: unreplacedVariables,
      },
      result: 'SUCCESS',
    });

    try {
      await appendCaseEvent({
        caseId,
        eventType: 'DOCUMENT_GENERATED',
        actorUserId: authUser.id,
        traceId,
        payload: {
          generatedDocumentId: created.id,
          templateId: template.id,
          documentNumber: created.documentNumber,
          title: created.title,
          fileFormat: created.fileFormat,
          downloadUrl: fileUrl,
        },
      });
    } catch (error) {
      logger.error({ err: error, traceId }, '写入案件事件失败：DOCUMENT_GENERATED');
    }

    return createSuccessResponse(
      {
        generatedDocument: {
          id: created.id,
          templateId: template.id,
          caseId,
          documentNumber: created.documentNumber,
          title: created.title,
          fileUrl,
          previewUrl,
          outputFormat: 'html',
          missingPlaceholders: unreplacedVariables,
        },
        traceId,
      },
      'AI 文书生成成功'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, 'AI 文书生成失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function GET() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
