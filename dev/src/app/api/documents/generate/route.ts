// dev/src/app/api/documents/generate/route.ts
// 文书生成API端点 - 支持基于模板的智能文书生成

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers, type AuthenticatedUser } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import {
  applyStyles,
  hasNonEmptyValue,
  processTemplateContent,
  templateStylesSchema,
  templateVariableSchema,
  type CaseInfoLike,
  type TemplateStyles,
  type TemplateVariable,
} from '@/lib/document-generation';

// 文书生成Schema
const documentGenerationSchema = z.object({
  templateId: z.string().uuid('无效的模板ID'),
  caseId: z.string().uuid('无效的案件ID').optional(),
  title: z.string().min(1, '文书标题不能为空').max(200, '文书标题不能超过200个字符'),
  variables: z.record(z.string(), z.unknown()).refine(
    (data) => Object.keys(data).length > 0,
    { message: '至少需要提供一个变量值' }
  ),
  outputFormat: z.enum(['html', 'pdf', 'docx']).default('html'),
  generateOptions: z.object({
    includeWatermark: z.boolean().default(false),
    includeSignature: z.boolean().default(true),
    includeTimestamp: z.boolean().default(true),
    customStyles: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

/**
 * 生成文书
 * POST /api/documents/generate
 * 需要认证和权限验证
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });      
    if (!guard.ok) return guard.response;
    const authUser = guard.user;
    const traceId = getTraceId(request.headers);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // 检查文书生成权限
    if (!PermissionCheckers.canManageCase(authUser)) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有生成文书的权限');
    }

    // 验证请求体
    const validation = await validateRequestBody(request, documentGenerationSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { 
      templateId, 
      caseId, 
      title, 
      variables,
      outputFormat,
      generateOptions
    } = validation.data;

    if (outputFormat !== 'html') {
      return ErrorResponses.NOT_IMPLEMENTED('当前仅支持生成 HTML 文书（pdf/docx 尚未实现）');
    }

    // 获取模板信息
    const template = await prisma.documentTemplate.findUnique({
      where: { id: templateId },
      include: {
        creator: {
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
    });

    if (!template) {
      return ErrorResponses.NOT_FOUND('文书模板');
    }

    if (!template.isActive) {
      return ErrorResponses.BAD_REQUEST('模板已停用，无法生成文书');
    }

    // 验证案件权限（如果提供了案件ID）
    let caseInfo = null;
    if (caseId) {
      caseInfo = await prisma.arbitrationCase.findUnique({
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
        },
      });

      if (!caseInfo) {
        return ErrorResponses.NOT_FOUND('案件');
      }

      // 检查案件访问权限
      const hasAccess = caseInfo.applicantId === authUser.id ||
        caseInfo.respondentId === authUser.id ||
        PermissionCheckers.canViewAllCases(authUser);

      if (!hasAccess) {
        return ErrorResponses.FORBIDDEN_MESSAGE('您没有访问此案件的权限');
      }
    }

    // 验证模板变量
    const templateVariablesParsed = z.array(templateVariableSchema).safeParse(template.variables);
    if (!templateVariablesParsed.success) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('模板变量格式无效', templateVariablesParsed.error.issues);
    }
    const templateVariables = templateVariablesParsed.data;
    const requiredVariables = templateVariables.filter(v => v.required);        
    const missingVariables = requiredVariables.filter((v) => !hasNonEmptyValue(variables[v.key]));

    if (missingVariables.length > 0) {
      return ErrorResponses.BAD_REQUEST(
        `缺少必需的变量: ${missingVariables.map(v => v.name).join(', ')}`       
      );
    }

    // 生成文书编号
    const documentNumber = `DOC${Date.now().toString(36).toUpperCase()}`;
    const generatedDocumentId = crypto.randomUUID();
    const fileUrl = `/api/documents/generated/${generatedDocumentId}/download`;
    const previewUrl = `/api/documents/generated/${generatedDocumentId}/preview`;

    // 处理变量替换
    const processedContent = await processTemplateContent({
      templateContent: template.templateContent,
      variables,
      caseInfo: caseInfo as CaseInfoLike | null,
      authUser,
    });

    // 应用样式
    const templateStylesParsed = templateStylesSchema.safeParse(template.styles ?? {});
    if (!templateStylesParsed.success) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('模板样式配置无效', templateStylesParsed.error.issues);
    }
    const customStylesParsed = generateOptions?.customStyles
      ? templateStylesSchema.safeParse(generateOptions.customStyles)
      : { success: true as const, data: undefined };
    if (!customStylesParsed.success) {
      return ErrorResponses.BAD_REQUEST_MESSAGE('自定义样式配置无效', customStylesParsed.error.issues);
    }

    const styledContent = applyStyles({
      content: processedContent,
      templateStyles: templateStylesParsed.data,
      customStyles: customStylesParsed.data,
    });

    let variablesJson: Prisma.InputJsonValue;
    try {
      variablesJson = JSON.parse(JSON.stringify(variables)) as Prisma.InputJsonValue;
    } catch (error) {
      logger.error({ err: error, traceId }, 'variables 序列化失败');
      return ErrorResponses.BAD_REQUEST('variables 不可序列化');
    }

    // 创建生成记录
      const generatedDocument = await prisma.$transaction(async (tx) => {
        // 创建文档记录
        const doc = await tx.generatedDocument.create({
          data: {
            id: generatedDocumentId,
            templateId,
            caseId,
            documentNumber,
            title,
            generatedContent: styledContent,
            variables: variablesJson,
            fileUrl,
            fileFormat: outputFormat,
            fileSize: Buffer.byteLength(styledContent, 'utf8'),
            status: 'generated',
            generatedBy: authUser.id,
          },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              category: true,
              templateType: true,
            },
          },
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          generator: {
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
      });

      // 更新模板使用次数
      await tx.documentTemplate.update({
        where: { id: templateId },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });

      return doc;
    });

    // AI智能分析
    const aiAnalysis = {
      contentAnalysis: {
        wordCount: processedContent.replace(/<[^>]*>/g, '').length,
        paragraphCount: processedContent.split('\n\n').length,
        variablesUsed: Object.keys(variables).length,
        completeness: calculateContentCompleteness(processedContent, templateVariables),
      },
      qualityScore: calculateQualityScore(processedContent, variables, templateVariables),
      suggestions: generateContentSuggestions(processedContent, template.templateType),
      analysisSource: 'heuristic',
    };

      const responseData = {
        generatedDocument,
        aiAnalysis,
        // 文件信息
        fileInfo: {
          downloadUrl: fileUrl,
          previewUrl,
          fileName: `${title}.${outputFormat}`,
          fileSize: generatedDocument.fileSize,
          format: outputFormat,
        },
        // 后续操作建议
        nextActions: [
          '下载生成的文书',
          '预览文书内容',
          caseId ? '记录文书生成事件' : '关联到案件以便留痕',
        ],
      };

      try {
        await AuditLogger.log({
          level: AuditLevel.INFO,
          eventType: AuditEventType.DOCUMENT_GENERATED,
          userId: authUser.id,
          userName: authUser.email,
          ipAddress,
          userAgent,
          resource: 'generated_documents',
          action: 'generate',
          details: {
            traceId,
            templateId,
            caseId: caseId ?? null,
            generatedDocumentId: generatedDocument.id,
            documentNumber: generatedDocument.documentNumber,
            outputFormat,
            downloadUrl: fileUrl,
          },
          result: 'SUCCESS',
        });
      } catch (error) {
        logger.error({ err: error, traceId }, '文书生成审计记录失败');
      }

      if (caseId) {
        try {
          await appendCaseEvent({
            caseId,
            eventType: 'DOCUMENT_GENERATED',
            actorUserId: authUser.id,
            traceId,
            payload: {
              generatedDocumentId: generatedDocument.id,
              templateId,
              documentNumber: generatedDocument.documentNumber,
              title: generatedDocument.title,
              fileFormat: outputFormat,
              downloadUrl: fileUrl,
            },
          });
        } catch (error) {
          logger.error({ err: error, traceId }, '写入案件事件失败：DOCUMENT_GENERATED');
        }
      }

      return createSuccessResponse(responseData, '文书生成成功');

  } catch (error) {
    logger.error({ err: error, traceId: getTraceId(request.headers) }, '生成文书失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 计算内容完整性
 */
function calculateContentCompleteness(content: string, templateVariables: TemplateVariable[]): number {
  const totalVariables = templateVariables.length;
  const unreplacedVariables = (content.match(/{{[^}]+}}/g) || []).length;
  return Math.round(((totalVariables - unreplacedVariables) / totalVariables) * 100);
}

/**
 * 计算质量分数
 */
function calculateQualityScore(
  content: string,
  variables: Record<string, unknown>,
  templateVariables: TemplateVariable[]
): number {
  let score = 100;
  
  // 检查未替换的变量
  const unreplacedVariables = (content.match(/{{[^}]+}}/g) || []).length;
  score -= unreplacedVariables * 10;
  
  // 检查内容长度
  const wordCount = content.replace(/<[^>]*>/g, '').length;
  if (wordCount < 100) score -= 20;
  
  // 检查必填变量
  const requiredVariables = templateVariables.filter(v => v.required);
  const missingRequired = requiredVariables.filter((v) => !hasNonEmptyValue(variables[v.key]));
  score -= missingRequired.length * 15;

  return Math.max(0, Math.min(100, score));
}

/**
 * 生成内容建议
 */
function generateContentSuggestions(content: string, templateType: string): string[] {
  const suggestions: string[] = [];
  
  // 检查未替换的变量
  const unreplacedVariables = content.match(/{{[^}]+}}/g);
  if (unreplacedVariables) {
    suggestions.push(`发现${unreplacedVariables.length}个未替换的变量，请检查变量值`);
  }
  
  // 根据模板类型提供建议
  if (templateType === 'arbitration_application') {
    suggestions.push('建议检查申请事实和理由是否完整');
    suggestions.push('确认争议金额和请求事项准确无误');
  } else if (templateType === 'award') {
    suggestions.push('确认裁决理由充分且逻辑清晰');
    suggestions.push('检查裁决主文是否明确具体');
  }
  
  suggestions.push('建议生成后仔细校对文书内容');
  
  return suggestions;
}

/**
 * 不支持的请求方法
 */
export async function GET() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function PUT() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}

export async function DELETE() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
