// dev/src/app/api/ai/assistant/route.ts
// AI智能助手API端点 - 为AI系统全方面驱动预留接口

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers, type AuthenticatedUser } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getAIServiceManager } from '@/lib/ai-services';
import { getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// AI助手请求Schema
const aiAssistantRequestSchema = z.object({
  type: z.enum(['case_analysis', 'document_review', 'legal_advice', 'process_guidance', 'risk_assessment']),
  context: z.object({
    caseId: z.string().uuid().optional(),
    documentId: z.string().uuid().optional(),
    query: z.string().min(1).max(1000),
    additionalData: z.unknown().optional(),
  }),
  preferences: z.object({
    language: z.enum(['zh-CN', 'en-US']).default('zh-CN'),
    detailLevel: z.enum(['brief', 'detailed', 'comprehensive']).default('detailed'),
    includeReferences: z.boolean().default(true),
  }).optional(),
});

type AIAssistantRequest = z.infer<typeof aiAssistantRequestSchema>;
type AIAssistantContext = AIAssistantRequest['context'];

type DecimalLike = { toNumber: () => number };

function isDecimalLike(value: unknown): value is DecimalLike {
  if (typeof value !== 'object' || value === null) return false;
  if (!('toNumber' in value)) return false;
  return typeof (value as { toNumber?: unknown }).toNumber === 'function';
}

function toAmountNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (isDecimalLike(value)) {
    try {
      const parsed = value.toNumber();
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

type CaseLike = {
  id: string;
  caseType: string;
  disputeAmount: unknown;
  documents: { length: number };
  participants: { length: number };
};

type NLPDataLike =
  | {
      sentiment?: {
        label?: string;
        score?: number;
      };
    }
  | null
  | undefined;

type RiskFactor = {
  factor: string;
  level: 'low' | 'medium' | 'high';
  impact: string;
};

type SimilarCaseResult = {
  id: string;
  title: string;
  similarity: number;
  outcome: string;
};

/**
 * AI智能助手服务
 * POST /api/ai/assistant
 * 为AI系统全方面驱动提供统一接口
 */
export async function POST(request: NextRequest) {
  try {
    const traceId = getTraceId(request.headers);
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    // 验证请求体
    const validation = await validateRequestBody(request, aiAssistantRequestSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { type, context, preferences = {} } = validation.data;

    // 检查用户AI权限
    const userRoles = await prisma.userRole.findMany({
      where: { userId: authUser.id, isActive: true },
      select: { permissions: true },
    });

    const hasAIAccess = userRoles.some(role => 
      role.permissions && 
      typeof role.permissions === 'object' && 
      'aiAssistant' in role.permissions && 
      role.permissions.aiAssistant === true
    );

    if (!hasAIAccess) {
      return ErrorResponses.FORBIDDEN_MESSAGE('您没有AI助手访问权限');
    }

    // 根据请求类型处理
    let aiResponse;
    switch (type) {
      case 'case_analysis':
        aiResponse = await handleCaseAnalysis(context, authUser);
        break;
      case 'document_review':
        aiResponse = await handleDocumentReview(context, authUser);
        break;
      case 'legal_advice':
        aiResponse = await handleLegalAdvice(context, authUser);
        break;
      case 'process_guidance':
        aiResponse = await handleProcessGuidance(context, authUser);
        break;
      case 'risk_assessment':
        aiResponse = await handleRiskAssessment(context, authUser);
        break;
      default:
        return ErrorResponses.BAD_REQUEST('不支持的AI服务类型');        
    }

    // 记录AI交互日志
    if (aiResponse instanceof Response) {
      return aiResponse;
    }

    await logAIInteraction(authUser.id, type, context, aiResponse, {
      traceId,
      ipAddress,
      userAgent,
      userName: authUser.email,
    });

    const responseData = {
      type,
      response: aiResponse,
      metadata: {
        timestamp: new Date().toISOString(),
        userId: authUser.id,
        preferences,
        // AI系统版本信息
        aiVersion: '1.0.0',
      modelInfo: {
        name: 'LegalMind-AI',
        version: '2024.1',
        capabilities: ['analysis', 'recommendation', 'prediction'],   
      },
    },
    // 外部系统集成建议
    externalSystemRecommendations: [],
  };

    return createSuccessResponse(responseData, 'AI助手响应成功');

  } catch (error) {
    logger.error({ err: error, traceId: getTraceId(request.headers) }, 'AI助手服务失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

/**
 * 案件分析处理
 */
async function handleCaseAnalysis(context: AIAssistantContext, _authUser: AuthenticatedUser) {
  if (!context.caseId) {
    return ErrorResponses.BAD_REQUEST('案件分析需要提供案件ID');
  }

  // 获取案件信息
  const caseData = await prisma.arbitrationCase.findUnique({
    where: { id: context.caseId },
    include: {
      documents: true,
      participants: true,
    },
  });

  if (!caseData) {
    return ErrorResponses.NOT_FOUND('案件');
  }

  const hasAccess =
    PermissionCheckers.canViewAllCases(_authUser)
    || caseData.applicantId === _authUser.id
    || caseData.respondentId === _authUser.id
    || caseData.participants.some((p) => p.userId === _authUser.id && p.isActive);

  if (!hasAccess) {
    return ErrorResponses.FORBIDDEN();
  }

  // 获取AI服务管理器
  const aiService = getAIServiceManager();

  const analysisText = JSON.stringify(
    {
      query: context.query,
      case: {
        id: caseData.id,
        caseNumber: caseData.caseNumber,
        title: caseData.title,
        description: caseData.description,
        status: caseData.status,
        caseType: caseData.caseType,
        disputeAmount: toAmountNumber(caseData.disputeAmount),
        currency: caseData.currency,
        priority: caseData.priority,
      },
      stats: {
        documentsCount: caseData.documents.length,
        participantsCount: caseData.participants.length,
      },
      documents: caseData.documents.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        originalName: d.originalName,
        fileType: d.fileType,
        createdAt: d.createdAt.toISOString(),
      })),
      participants: caseData.participants.map((p) => ({
        userId: p.userId,
        participantType: p.participantType,
        isActive: p.isActive,
      })),
    },
    null,
    2
  );

  // 调用NLP分析服务
  const nlpResult = await aiService.analyzeText(analysisText, {
    includeSentiment: true,
    includeEntities: true,
    includeKeywords: true,
    includeSummary: true,
    includeTopics: true,
  });

  if (!nlpResult.success) {
    if (nlpResult.error === 'SERVICE_NOT_CONFIGURED') {
      return ErrorResponses.SERVICE_NOT_CONFIGURED('AI 文本分析');
    }
    if (nlpResult.error?.endsWith('_NOT_IMPLEMENTED') || nlpResult.error?.includes('NOT_IMPLEMENTED')) {
      return ErrorResponses.NOT_IMPLEMENTED(`AI 文本分析尚未实现：${nlpResult.error}`);
    }
    return ErrorResponses.OPERATION_FAILED(nlpResult.error || 'AI 分析失败');   
  }

  if (!nlpResult.data) {
    return ErrorResponses.OPERATION_FAILED('AI 分析返回为空');
  }

  // 综合AI分析结果
  return {
    summary: nlpResult.data.summary ?? null,
    complexity: calculateCaseComplexity(caseData),
    estimatedDuration: estimateCaseDuration(caseData),
    keyIssues: nlpResult.data.keywords?.map((k) => k.text) ?? [],
    recommendations: [],
    recommendationsStatus: 'NOT_IMPLEMENTED',
    riskFactors: assessRiskFactors(caseData, nlpResult.data),
    similarCases: await findSimilarCases(caseData),
    aiAnalysis: {
      nlpResult: nlpResult.data,
      confidence: calculateAnalysisConfidence(nlpResult),
      processingTime: nlpResult.usage?.duration || 0,
      usage: nlpResult.usage ?? null,
    },
  };
}

/**
 * 文档审查处理
 */
async function handleDocumentReview(context: AIAssistantContext, _authUser: AuthenticatedUser) {
  if (!context.documentId) {
    return ErrorResponses.BAD_REQUEST('文档审查需要提供文档ID');
  }

  return ErrorResponses.NOT_IMPLEMENTED('文档审查需要 OCR/规则引擎支持，当前未实现');
}

/**
 * 法律建议处理
 */
async function handleLegalAdvice(context: AIAssistantContext, _authUser: AuthenticatedUser) {
  return ErrorResponses.NOT_IMPLEMENTED('法律建议需要法律数据库/检索增强支持，当前未实现');
}

/**
 * 流程指导处理
 */
async function handleProcessGuidance(context: AIAssistantContext, _authUser: AuthenticatedUser) {
  return ErrorResponses.NOT_IMPLEMENTED('流程指导需要状态机/任务编排支持，当前未实现');
}

/**
 * 风险评估处理
 */
async function handleRiskAssessment(context: AIAssistantContext, _authUser: AuthenticatedUser) {
  return ErrorResponses.NOT_IMPLEMENTED('风险评估需要案件数据建模/法律数据库支持，当前未实现');
}

/**
 * 记录AI交互日志
 */
async function logAIInteraction(
  userId: string,
  type: AIAssistantRequest['type'],
  context: AIAssistantContext,
  response: unknown,
  meta: {
    traceId: string;
    ipAddress: string;
    userAgent?: string;
    userName?: string;
  }
) {
  const contextSummary = {
    caseId: context.caseId ?? null,
    documentId: context.documentId ?? null,
    query: context.query.slice(0, 200),
    hasAdditionalData: context.additionalData !== undefined,
  };

  const responseSummary =
    response && typeof response === 'object' && !Array.isArray(response)
      ? { keys: Object.keys(response as Record<string, unknown>).slice(0, 50) }
      : typeof response === 'string'
      ? { type: 'string', length: response.length }
      : { type: typeof response };

  try {
    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.AI_ASSISTANT_INVOKED,
      userId,
      userName: meta.userName,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      resource: 'ai',
      action: type,
      details: {
        traceId: meta.traceId,
        type,
        context: contextSummary,
        response: responseSummary,
      },
      result: 'SUCCESS',
    });
  } catch (error) {
    logger.error({ err: error, traceId: meta.traceId }, 'AI 交互审计记录失败');
  }
}

/**
 * 获取外部系统集成建议
 */
function getExternalSystemRecommendations(type: AIAssistantRequest['type'], _context: AIAssistantContext) {
  const recommendations = [];

  switch (type) {
    case 'case_analysis':
      recommendations.push({
        system: 'courtSystem',
        action: 'check_similar_cases',
        description: '查询法院系统中的类似案例',
      });
      break;
    case 'document_review':
      recommendations.push({
        system: 'notarySystem',
        action: 'verify_document',
        description: '通过公证系统验证文档真实性',
      });
      break;
    case 'legal_advice':
      recommendations.push({
        system: 'legalDatabase',
        action: 'search_precedents',
        description: '搜索相关法律先例',
      });
      break;
  }

  return recommendations;
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

// 新增辅助函数

/**
 * 计算案件复杂度
 */
function calculateCaseComplexity(caseData: CaseLike): 'low' | 'medium' | 'high' {
  let score = 0;

  // 基于争议金额
  const disputeAmount = toAmountNumber(caseData.disputeAmount);
  if (disputeAmount > 1000000) score += 3;
  else if (disputeAmount > 100000) score += 2;
  else score += 1;

  // 基于文档数量
  if (caseData.documents.length > 10) score += 2;
  else if (caseData.documents.length > 5) score += 1;

  // 基于参与方数量
  if (caseData.participants.length > 5) score += 2;
  else if (caseData.participants.length > 2) score += 1;

  // 基于案件类型
  const complexTypes = ['知识产权纠纷', '建设工程纠纷', '金融纠纷'];
  if (complexTypes.includes(caseData.caseType)) score += 2;

  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

/**
 * 估算案件处理时长
 */
function estimateCaseDuration(caseData: CaseLike): string {
  const complexity = calculateCaseComplexity(caseData);

  switch (complexity) {
    case 'high':
      return '60-90个工作日';
    case 'medium':
      return '30-45个工作日';
    case 'low':
      return '15-30个工作日';
    default:
      return '30-45个工作日';
  }
}

/**
 * 评估风险因素
 */
function assessRiskFactors(caseData: Pick<CaseLike, 'documents' | 'disputeAmount'>, nlpData: NLPDataLike): RiskFactor[] {
  const riskFactors: RiskFactor[] = [];

  // 基于文档数量评估证据风险
  if (caseData.documents.length < 3) {
    riskFactors.push({
      factor: '证据材料不足',
      level: 'high',
      impact: '可能影响仲裁结果',
    });
  }

  // 基于争议金额评估财务风险
  if (toAmountNumber(caseData.disputeAmount) > 500000) {
    riskFactors.push({
      factor: '争议金额较大',
      level: 'medium',
      impact: '需要充分的证据支持',
    });
  }

  // 基于NLP情感分析评估争议激烈程度
  if (nlpData?.sentiment?.label === 'negative' && (nlpData.sentiment.score ?? 0) > 0.7) {
    riskFactors.push({
      factor: '争议较为激烈',
      level: 'medium',
      impact: '可能需要更多调解努力',
    });
  }

  return riskFactors;
}

/**
 * 查找相似案例
 */
async function findSimilarCases(caseData: CaseLike): Promise<SimilarCaseResult[]> {
  try {
    const similarCases = await prisma.arbitrationCase.findMany({
      where: {
        AND: [
          { id: { not: caseData.id } },
          { caseType: caseData.caseType },
          { status: 'CLOSED' },
        ],
      },
      select: {
        id: true,
        title: true,
        caseType: true,
        disputeAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    return similarCases.map((case_) => ({
      id: case_.id,
      title: case_.title,
      similarity: calculateSimilarity(caseData, case_),
      outcome: '已结案', // 简化实现
    }));
  } catch (error) {
    return [];
  }
}

/**
 * 计算案例相似度
 */
function calculateSimilarity(
  case1: { caseType: string; disputeAmount: unknown },
  case2: { caseType: string; disputeAmount: unknown }
): number {
  let similarity = 0;

  // 案件类型相同
  if (case1.caseType === case2.caseType) similarity += 0.4;

  // 争议金额相近
  const case1Amount = toAmountNumber(case1.disputeAmount);
  const case2Amount = toAmountNumber(case2.disputeAmount);
  const amountDiff = Math.abs(case1Amount - case2Amount);
  const avgAmount = (case1Amount + case2Amount) / 2;
  if (avgAmount > 0) {
    const amountSimilarity = Math.max(0, 1 - (amountDiff / avgAmount));
    similarity += amountSimilarity * 0.3;
  }

  // 其他因素
  similarity += 0.3; // 基础相似度

  return Math.round(similarity * 100) / 100;
}

/**
 * 计算分析置信度
 */
function calculateAnalysisConfidence(
  nlpResult: { success: boolean }
): number {
  let confidence = 0.5; // 基础置信度

  if (nlpResult.success) {
    confidence += 0.3;
  }

  return Math.round(confidence * 100) / 100;
}

export async function PATCH() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
