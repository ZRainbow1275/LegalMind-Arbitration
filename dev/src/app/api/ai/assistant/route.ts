// dev/src/app/api/ai/assistant/route.ts
// AI智能助手API端点 - 为AI系统全方面驱动预留接口

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers, type AuthenticatedUser } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getAIServiceManager, type NLPAnalysisResult } from '@/lib/ai-services';
import { getExternalSystemManager } from '@/lib/external-systems';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { logger } from '@/lib/logger';
import type { Prisma } from '@/generated/prisma';
import {
  getObjectBuffer,
  getObjectStorageConfig,
  getS3Client,
  resolveStorageLocation,
} from '@/lib/object-storage';
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

type JsonRecord = Record<string, unknown>;

type AssistantAnalysisEngine = 'openai_nlp' | 'rule_based';

type DocumentOcrSnapshot = {
  provider: string | null;
  processedAt: string | null;
  confidence: number | null;
  language: string | null;
  truncated: boolean | null;
  fullTextLength: number | null;
};

function asJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function toJsonValue(value: JsonRecord): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function safeIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  try {
    return value.toISOString();
  } catch {
    return null;
  }
}

function clampText(input: string, maxChars: number): { text: string; truncated: boolean } {
  if (maxChars <= 0) return { text: '', truncated: input.length > 0 };
  if (input.length <= maxChars) return { text: input, truncated: false };
  return { text: input.slice(0, maxChars), truncated: true };
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function extractDates(text: string): string[] {
  const pattern =
    /(\d{4}[年/\\-]\d{1,2}[月/\\-]\d{1,2}日?)|(\d{4}年\d{1,2}月)|(\d{4}[./\\-]\d{1,2}[./\\-]\d{1,2})/g;
  return uniqueStrings(text.match(pattern) ?? []);
}

function extractMoneyAmounts(text: string): string[] {
  const pattern =
    /((?:￥|RMB|人民币)?\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:元|万元|亿元|RMB)?)/g;
  return uniqueStrings(text.match(pattern) ?? []);
}

function getOcrFromMetadata(metadata: unknown): { text: string | null; snapshot: DocumentOcrSnapshot } {
  const obj = asJsonRecord(metadata);
  const ocr = asJsonRecord(obj.ocr);
  const text = typeof ocr.text === 'string' && ocr.text.trim().length > 0 ? ocr.text : null;
  return {
    text,
    snapshot: {
      provider: typeof ocr.provider === 'string' ? ocr.provider : null,
      processedAt: typeof ocr.processedAt === 'string' ? ocr.processedAt : null,
      confidence: typeof ocr.confidence === 'number' ? ocr.confidence : null,
      language: typeof ocr.language === 'string' ? ocr.language : null,
      truncated: typeof ocr.truncated === 'boolean' ? ocr.truncated : null,
      fullTextLength: typeof ocr.fullTextLength === 'number' ? ocr.fullTextLength : null,
    },
  };
}

function buildRuleBasedNlp(params: {
  text: string;
  summary?: string | null;
  entities?: Array<{ text: string; label: string; confidence?: number }>;
  keywords?: Array<{ text: string; score?: number }>;
  topics?: Array<{ topic: string; score?: number }>;
}): NLPAnalysisResult {
  const baseText = params.text;
  const entities: NLPAnalysisResult['entities'] = [];
  for (const item of params.entities ?? []) {
    const idx = baseText.indexOf(item.text);
    const start = idx >= 0 ? idx : 0;
    entities.push({
      text: item.text,
      label: item.label,
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
      start,
      end: start + item.text.length,
    });
  }

  const keywords: NLPAnalysisResult['keywords'] = uniqueStrings(
    (params.keywords ?? []).map((k) => k.text)
  ).map((text) => ({
    text,
    score: 0.6,
  }));

  const topics = uniqueStrings((params.topics ?? []).map((t) => t.topic)).map((topic) => ({
    topic,
    score: 0.5,
  }));

  return {
    sentiment: { label: 'neutral', score: 0.5 },
    entities,
    keywords,
    summary: params.summary ?? undefined,
    topics: topics.length > 0 ? topics : undefined,
  };
}

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
    externalSystemRecommendations: getExternalSystemRecommendations(type, context),
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

  const [processSnapshot, pendingTasks] = await Promise.all([
    prisma.arbitrationProcess.findUnique({
      where: { caseId: caseData.id },
      select: {
        id: true,
        currentStage: true,
        progressPercent: true,
        startedAt: true,
        expectedEndAt: true,
        actualEndAt: true,
      },
    }),
    prisma.caseTask.findMany({
      where: { caseId: caseData.id, status: { in: ['TODO', 'IN_PROGRESS'] } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueAt: true,
        createdAt: true,
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: 10,
    }),
  ]);

  const fallbackSummary = caseData.description?.trim()
    ? clampText(caseData.description.trim(), 400).text
    : clampText(`${caseData.caseNumber} ${caseData.title}`.trim(), 200).text;

  const fallbackEntities = uniqueStrings([
    caseData.caseNumber,
    caseData.title ?? '',
    caseData.caseType ?? '',
    caseData.status ?? '',
  ])
    .filter((v) => v.length > 0)
    .slice(0, 8)
    .map((text) => ({ text, label: 'case_field' }));

  const fallbackKeywords = uniqueStrings([
    caseData.caseType ?? '',
    caseData.status ?? '',
    caseData.priority ?? '',
    ...caseData.documents.map((d) => String(d.documentType)),
  ])
    .filter((v) => v.length > 0)
    .slice(0, 20)
    .map((text) => ({ text }));

  // 调用 NLP 分析（若未配置则使用规则引擎兜底；避免“NOT_IMPLEMENTED”占位响应）
  const nlpResult = await aiService.analyzeText(analysisText, {
    includeSentiment: true,
    includeEntities: true,
    includeKeywords: true,
    includeSummary: true,
    includeTopics: true,
  });

  const analysisEngine: AssistantAnalysisEngine =
    nlpResult.success && nlpResult.data ? 'openai_nlp' : 'rule_based';

  const nlpData: NLPAnalysisResult =
    nlpResult.success && nlpResult.data
      ? nlpResult.data
      : buildRuleBasedNlp({
          text: analysisText,
          summary: fallbackSummary,
          entities: fallbackEntities,
          keywords: fallbackKeywords,
          topics: [{ topic: caseData.caseType ?? '案件分析', score: 0.6 }],
        });

  const now = new Date();
  const overdueTasks = pendingTasks.filter((t) => !!t.dueAt && t.dueAt < now);

  const recommendations: Array<{
    kind: 'process' | 'evidence' | 'task' | 'deadline';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    related?: { taskId?: string };
    dueAt?: string | null;
  }> = [];

  if (caseData.status === 'DRAFT') {
    recommendations.push({
      kind: 'process',
      title: '提交案件进入受理流程',
      description: '当前案件仍处于草稿状态，提交后才会进入受理审核与后续程序编排。',
      priority: 'high',
    });
  }

  if (caseData.documents.length < 3) {
    recommendations.push({
      kind: 'evidence',
      title: '补充关键证据材料',
      description: '当前证据材料数量偏少，建议补充合同/往来记录/付款凭证等关键材料，并完善说明。',
      priority: 'high',
    });
  }

  if (caseData.participants.length < 2) {
    recommendations.push({
      kind: 'process',
      title: '完善参与方信息',
      description: '参与方数量偏少，建议补充当事人/代理人/证人等信息，以便后续送达与庭审组织。',
      priority: 'medium',
    });
  }

  if (!processSnapshot) {
    recommendations.push({
      kind: 'process',
      title: '建立仲裁程序阶段与里程碑',
      description: '未检测到程序编排记录，建议在受理后生成程序阶段配置，并明确阶段目标与期限。',
      priority: 'medium',
    });
  }

  if (overdueTasks.length > 0) {
    recommendations.push({
      kind: 'deadline',
      title: '处理逾期任务',
      description: `当前存在 ${overdueTasks.length} 个逾期任务，建议优先处理以降低程序风险。`,
      priority: 'high',
    });
  }

  for (const task of pendingTasks.slice(0, 5)) {
    recommendations.push({
      kind: 'task',
      title: `推进任务：${task.title}`,
      description: `状态：${task.status}；优先级：${task.priority}`,
      priority: task.dueAt && task.dueAt < now ? 'high' : 'medium',
      related: { taskId: task.id },
      dueAt: safeIso(task.dueAt),
    });
  }

  // 综合分析结果（可在 AI 未配置时仍返回“真实规则输出”）
  return {
    summary: nlpData.summary ?? fallbackSummary ?? null,
    complexity: calculateCaseComplexity(caseData),
    estimatedDuration: estimateCaseDuration(caseData),
    keyIssues: nlpData.keywords?.map((k) => k.text) ?? [],
    recommendations,
    recommendationsStatus: 'READY',
    process: processSnapshot
      ? {
          currentStage: processSnapshot.currentStage,
          progressPercent: processSnapshot.progressPercent,
          startedAt: safeIso(processSnapshot.startedAt),
          expectedEndAt: safeIso(processSnapshot.expectedEndAt),
          actualEndAt: safeIso(processSnapshot.actualEndAt),
        }
      : null,
    taskSnapshot: {
      pendingCount: pendingTasks.length,
      overdueCount: overdueTasks.length,
    },
    riskFactors: assessRiskFactors(caseData, nlpData),
    similarCases: await findSimilarCases(caseData),
    aiAnalysis: {
      engine: analysisEngine,
      fallbackReason: analysisEngine === 'rule_based' ? nlpResult.error ?? null : null,
      nlpResult: nlpData,
      confidence: calculateAnalysisConfidence({ success: analysisEngine === 'openai_nlp' }),
      processingTime: analysisEngine === 'openai_nlp' ? nlpResult.usage?.duration || 0 : 0,
      usage: analysisEngine === 'openai_nlp' ? nlpResult.usage ?? null : null,
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

  const document = await prisma.caseDocument.findUnique({
    where: { id: context.documentId },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
          status: true,
          applicantId: true,
          respondentId: true,
          participants: {
            where: { userId: _authUser.id, isActive: true },
            select: { id: true },
          },
        },
      },
      evidenceVerification: true,
      signatureRequests: {
        select: { id: true, status: true, provider: true, requestedAt: true, completedAt: true },
        orderBy: { requestedAt: 'desc' },
      },
      sealUsages: {
        select: { id: true, status: true, usedAt: true, revokedAt: true },
        orderBy: { usedAt: 'desc' },
      },
    },
  });

  if (!document) return ErrorResponses.NOT_FOUND('文档');

  const caseAccess =
    PermissionCheckers.canManageDocuments(_authUser)
    || document.case?.applicantId === _authUser.id
    || document.case?.respondentId === _authUser.id
    || (document.case?.participants?.length ?? 0) > 0;

  const canManage = PermissionCheckers.canManageDocuments(_authUser);
  const canAccess = caseAccess || document.uploadedBy === _authUser.id || (document.isPublic && canManage);
  if (!document.case || !canAccess) return ErrorResponses.FORBIDDEN();

  const issues: Array<{ code: string; level: 'info' | 'warning' | 'high'; message: string }> = [];

  if (!document.fileHash) {
    issues.push({
      code: 'MISSING_FILE_HASH',
      level: 'warning',
      message: '文档缺少 SHA-256 哈希，建议补齐以便后续验真与归档留痕。',
    });
  }

  const metadata = asJsonRecord(document.metadata);
  let { text: ocrText, snapshot: ocrSnapshot } = getOcrFromMetadata(metadata);
  let ocrFetched = false;
  let ocrFetchError: string | null = null;

  const fileType = document.fileType.toLowerCase();
  const mimeType = (document.mimeType ?? '').toLowerCase();
  const ocrSupported =
    fileType.startsWith('image/')
    || fileType === 'application/pdf'
    || mimeType.startsWith('image/')
    || mimeType === 'application/pdf';

  if (!ocrText && ocrSupported) {
    const storageConfig = getObjectStorageConfig();
    if (!storageConfig) {
      ocrFetchError = 'OBJECT_STORAGE_NOT_CONFIGURED';
    } else {
      const maxOcrBytes = 25 * 1024 * 1024;
      const fileSizeNumber = Number(document.fileSize);
      if (Number.isFinite(fileSizeNumber) && fileSizeNumber > maxOcrBytes) {
        ocrFetchError = 'OCR_FILE_TOO_LARGE';
      } else {
        try {
          const { bucket, key } = resolveStorageLocation(document, storageConfig.bucket);
          const buffer = await getObjectBuffer({ client: getS3Client(storageConfig), bucket, key });

          if (buffer.length === 0) {
            ocrFetchError = 'EMPTY_OBJECT';
          } else {
            const ai = getAIServiceManager();
            const result = await ai.performOCR(buffer, { language: 'zh' });
            if (!result.success) {
              ocrFetchError = result.error ?? 'OCR_FAILED';
            } else if (!result.data) {
              ocrFetchError = 'OCR_EMPTY_RESULT';
            } else {
              ocrFetched = true;
              ocrText = result.data.text?.trim() ? result.data.text : null;

              const fullText = result.data.text || '';
              const stored = clampText(fullText, 200_000);
              const nowIso = new Date().toISOString();
              const nextMetadata: JsonRecord = {
                ...metadata,
                ocr: {
                  text: stored.text,
                  truncated: stored.truncated,
                  fullTextLength: fullText.length,
                  confidence: result.data.confidence,
                  language: result.data.language,
                  processedAt: nowIso,
                  provider: 'tencent',
                },
                processing: {
                  ...asJsonRecord(metadata.processing),
                  ocr: {
                    status: 'COMPLETED',
                    updatedAt: nowIso,
                    provider: 'tencent',
                    confidence: result.data.confidence,
                    truncated: stored.truncated,
                    fullTextLength: fullText.length,
                  },
                },
              };

              await prisma.caseDocument.update({
                where: { id: document.id },
                data: { metadata: toJsonValue(nextMetadata) },
              });

              ocrSnapshot = getOcrFromMetadata(nextMetadata).snapshot;
            }
          }
        } catch (error) {
          ocrFetchError = error instanceof Error ? error.message : String(error);
        }
      }
    }
  }

  if (!ocrSupported) {
    issues.push({
      code: 'OCR_UNSUPPORTED_FILE_TYPE',
      level: 'warning',
      message: '该文档格式不支持 OCR（仅支持图片/PDF）。如需文本审查，请先转换为图片或 PDF。',
    });
  } else if (!ocrText) {
    issues.push({
      code: 'OCR_TEXT_UNAVAILABLE',
      level:
        ocrFetchError === 'SERVICE_NOT_CONFIGURED' || ocrFetchError === 'OBJECT_STORAGE_NOT_CONFIGURED'
          ? 'high'
          : 'warning',
      message: `未能获取可审查的文本内容（${ocrFetchError ?? 'UNKNOWN'}）。`,
    });
  }

  if (!document.evidenceVerification) {
    issues.push({
      code: 'EVIDENCE_VERIFICATION_MISSING',
      level: 'warning',
      message: '该文档尚未进行真实性校验（HASH/公证）。建议发起证据核验。',
    });
  } else if (document.evidenceVerification.status !== 'VERIFIED') {
    issues.push({
      code: 'EVIDENCE_VERIFICATION_NOT_VERIFIED',
      level: document.evidenceVerification.status === 'FAILED' ? 'high' : 'warning',
      message: `证据核验状态为 ${document.evidenceVerification.status}。`,
    });
  }

  const signaturePending = document.signatureRequests.filter((r) => r.status !== 'COMPLETED');
  if (signaturePending.length > 0) {
    issues.push({
      code: 'SIGNATURE_PENDING',
      level: 'warning',
      message: `存在 ${signaturePending.length} 个未完成的签名请求，建议跟进签署或重新发起。`,
    });
  }

  const sealApplied = document.sealUsages.filter((u) => u.status === 'APPLIED');
  if (sealApplied.length > 0) {
    issues.push({
      code: 'SEAL_APPLIED',
      level: 'info',
      message: `检测到已应用电子印章记录（${sealApplied.length} 条）。`,
    });
  }

  const extractionSource = ocrText ?? '';
  const extracted = ocrText
    ? {
        dates: extractDates(extractionSource).slice(0, 30),
        amounts: extractMoneyAmounts(extractionSource).slice(0, 30),
      }
    : { dates: [], amounts: [] };

  const preview = ocrText ? clampText(extractionSource, 4000).text : null;

  let nlp: { engine: AssistantAnalysisEngine; result: NLPAnalysisResult } | null = null;
  if (ocrText) {
    const ai = getAIServiceManager();
    const prompt = clampText(
      JSON.stringify(
        {
          query: context.query,
          document: { id: document.id, documentType: document.documentType, fileType: document.fileType },
          textPreview: clampText(extractionSource, 12000).text,
        },
        null,
        2
      ),
      16000
    ).text;

    const nlpResult = await ai.analyzeText(prompt, {
      includeSentiment: true,
      includeEntities: true,
      includeKeywords: true,
      includeSummary: true,
      includeTopics: true,
    });

    const fallback = buildRuleBasedNlp({
      text: prompt,
      summary: preview ?? undefined,
      entities: [
        { text: document.originalName, label: 'document_name', confidence: 0.75 },
        { text: document.documentType, label: 'document_type', confidence: 0.75 },
      ],
      keywords: [{ text: document.documentType }, { text: document.fileType }],
      topics: [{ topic: '文档审查', score: 0.6 }],
    });

    nlp = nlpResult.success && nlpResult.data ? { engine: 'openai_nlp', result: nlpResult.data } : { engine: 'rule_based', result: fallback };
  }

  const suggestions: Array<{ title: string; priority: 'low' | 'medium' | 'high' }> = [];
  if (!document.evidenceVerification) suggestions.push({ title: '发起证据真实性校验（HASH 或 公证）', priority: 'high' });
  if (signaturePending.length > 0) suggestions.push({ title: '跟进签名请求或重新发起签署', priority: 'medium' });
  if (ocrSupported && !ocrText) suggestions.push({ title: '配置 OCR 与对象存储以启用文本审查', priority: 'high' });

  if (ocrFetched && document.caseId) {
    try {
      await appendCaseEvent({
        caseId: document.caseId,
        eventType: 'AI_DOCUMENT_OCR_COMPLETED',
        actorUserId: _authUser.id,
        payload: {
          documentId: document.id,
          provider: ocrSnapshot.provider,
          confidence: ocrSnapshot.confidence,
          truncated: ocrSnapshot.truncated,
          fullTextLength: ocrSnapshot.fullTextLength,
        },
      });
    } catch (error) {
      logger.error({ err: error }, '写入案件事件失败：AI_DOCUMENT_OCR_COMPLETED');
    }
  }

  return {
    document: {
      id: document.id,
      caseId: document.caseId,
      caseNumber: document.case.caseNumber,
      caseStatus: document.case.status,
      fileName: document.fileName,
      originalName: document.originalName,
      fileType: document.fileType,
      mimeType: document.mimeType ?? null,
      fileSize: document.fileSize.toString(),
      fileHash: document.fileHash ?? null,
      documentType: document.documentType,
      createdAt: safeIso(document.createdAt),
    },
    review: {
      query: context.query,
      textAvailable: !!ocrText,
      textPreview: preview,
      ocr: ocrSnapshot,
      extracted,
      issues,
      suggestions,
      nlp,
      ocrMetadataWritten: ocrFetched,
    },
  };
}

/**
 * 法律建议处理
 */
async function handleLegalAdvice(context: AIAssistantContext, _authUser: AuthenticatedUser) {
  const external = getExternalSystemManager();
  const response = await external.integrateLegalDatabase('comprehensive_search', {
    caseId: context.caseId,
    documentId: context.documentId,
    parameters: {
      query: context.query,
      additionalData: typeof context.additionalData === 'undefined' ? null : context.additionalData,
    },
  });

  if (!response.success) {
    if (response.errorCode === 'SERVICE_NOT_CONFIGURED') {
      return ErrorResponses.SERVICE_NOT_CONFIGURED('法律数据库');
    }
    if (response.errorCode === 'INVALID_REQUEST') {
      return ErrorResponses.BAD_REQUEST_MESSAGE(response.error || '法律数据库请求参数错误');
    }
    if (response.errorCode === 'UPSTREAM_ERROR') {
      return ErrorResponses.OPERATION_FAILED(response.error || '法律数据库上游调用失败');
    }
    return ErrorResponses.OPERATION_FAILED(response.error || '法律建议查询失败');
  }

  return {
    query: context.query,
    result: response.data ?? null,
    systemInfo: response.systemInfo ?? null,
  };
}

/**
 * 流程指导处理
 */
async function handleProcessGuidance(context: AIAssistantContext, _authUser: AuthenticatedUser) {
  if (!context.caseId) {
    return ErrorResponses.BAD_REQUEST('流程指导需要提供案件ID');
  }

  const caseData = await prisma.arbitrationCase.findUnique({
    where: { id: context.caseId },
    include: {
      participants: true,
      documents: { select: { id: true } },
      arbitrationProcess: {
        select: {
          currentStage: true,
          progressPercent: true,
          startedAt: true,
          expectedEndAt: true,
          actualEndAt: true,
        },
      },
      tasks: {
        where: { status: { in: ['TODO', 'IN_PROGRESS'] } },
        select: { id: true, title: true, status: true, priority: true, dueAt: true, createdAt: true },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: 20,
      },
    },
  });

  if (!caseData) return ErrorResponses.NOT_FOUND('案件');

  const hasAccess =
    PermissionCheckers.canViewAllCases(_authUser)
    || caseData.applicantId === _authUser.id
    || caseData.respondentId === _authUser.id
    || caseData.participants.some((p) => p.userId === _authUser.id && p.isActive);

  if (!hasAccess) return ErrorResponses.FORBIDDEN();

  const now = new Date();
  const overdueTasks = caseData.tasks.filter((t) => !!t.dueAt && t.dueAt < now);

  const checklist: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    dueAt?: string | null;
    relatedTaskId?: string;
  }> = [];

  if (caseData.status === 'DRAFT') {
    checklist.push({
      title: '完善申请材料并提交案件',
      description: '补齐当事人信息、证据材料与申请书后提交，以进入受理审核。',
      priority: 'high',
    });
  }

  if (caseData.documents.length < 3) {
    checklist.push({
      title: '补充证据与关键材料',
      description: '建议补充合同/沟通记录/付款凭证等核心证据，确保证据链完整。',
      priority: 'high',
    });
  }

  if (!caseData.arbitrationProcess) {
    checklist.push({
      title: '生成仲裁程序阶段配置',
      description: '受理后建议生成程序阶段（立案/受理/指定/交换/庭审/合议/裁决/结案）与期限。',
      priority: 'medium',
    });
  } else {
    checklist.push({
      title: '跟踪当前程序阶段',
      description: `当前阶段：${caseData.arbitrationProcess.currentStage}；进度：${caseData.arbitrationProcess.progressPercent}%`,
      priority: 'medium',
      dueAt: safeIso(caseData.arbitrationProcess.expectedEndAt),
    });
  }

  if (overdueTasks.length > 0) {
    checklist.push({
      title: '处理逾期任务',
      description: `存在 ${overdueTasks.length} 个逾期任务，建议优先处理以降低程序风险。`,
      priority: 'high',
    });
  }

  for (const task of caseData.tasks.slice(0, 10)) {
    checklist.push({
      title: `推进任务：${task.title}`,
      description: `状态：${task.status}；优先级：${task.priority}`,
      priority: task.dueAt && task.dueAt < now ? 'high' : 'medium',
      dueAt: safeIso(task.dueAt),
      relatedTaskId: task.id,
    });
  }

  return {
    caseId: caseData.id,
    status: caseData.status,
    currentStage: caseData.arbitrationProcess?.currentStage ?? null,
    progressPercent: caseData.arbitrationProcess?.progressPercent ?? null,
    checklist,
    taskSnapshot: {
      pendingCount: caseData.tasks.length,
      overdueCount: overdueTasks.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 风险评估处理
 */
async function handleRiskAssessment(context: AIAssistantContext, _authUser: AuthenticatedUser) {
  if (!context.caseId) {
    return ErrorResponses.BAD_REQUEST('风险评估需要提供案件ID');
  }

  const caseData = await prisma.arbitrationCase.findUnique({
    where: { id: context.caseId },
    include: {
      participants: true,
      documents: { select: { id: true } },
      tasks: {
        where: { status: { in: ['TODO', 'IN_PROGRESS'] } },
        select: { id: true, title: true, status: true, priority: true, dueAt: true },
        orderBy: [{ dueAt: 'asc' }, { id: 'desc' }],
        take: 50,
      },
    },
  });

  if (!caseData) return ErrorResponses.NOT_FOUND('案件');

  const hasAccess =
    PermissionCheckers.canViewAllCases(_authUser)
    || caseData.applicantId === _authUser.id
    || caseData.respondentId === _authUser.id
    || caseData.participants.some((p) => p.userId === _authUser.id && p.isActive);

  if (!hasAccess) return ErrorResponses.FORBIDDEN();

  const now = new Date();
  const overdueTasks = caseData.tasks.filter((t) => !!t.dueAt && t.dueAt < now);

  const baselineNlp = buildRuleBasedNlp({
    text: JSON.stringify({ query: context.query, caseId: caseData.id }, null, 2),
    summary: caseData.description?.trim() ? clampText(caseData.description.trim(), 240).text : undefined,
    entities: [{ text: caseData.caseNumber, label: 'case_number', confidence: 0.8 }],
    keywords: [{ text: caseData.caseType }, { text: caseData.status }],
    topics: [{ topic: '风险评估', score: 0.6 }],
  });

  const factors: RiskFactor[] = [];
  factors.push(...assessRiskFactors(caseData, baselineNlp));

  if (overdueTasks.length > 0) {
    factors.push({
      factor: '任务逾期',
      level: 'high',
      impact: `存在 ${overdueTasks.length} 个逾期任务，可能影响程序进度与举证/送达期限。`,
    });
  }

  if (caseData.deadline && caseData.deadline < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
    factors.push({
      factor: '临近案件期限',
      level: 'medium',
      impact: '案件期限临近，建议检查程序阶段与关键节点，避免超期风险。',
    });
  }

  const score = Math.min(
    100,
    Math.round(
      factors.reduce((acc, f) => acc + (f.level === 'high' ? 30 : f.level === 'medium' ? 15 : 5), 0)
    )
  );
  const level: 'low' | 'medium' | 'high' = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';

  return {
    caseId: caseData.id,
    riskLevel: level,
    riskScore: score,
    factors,
    taskSnapshot: { pendingCount: caseData.tasks.length, overdueCount: overdueTasks.length },
    evaluatedAt: now.toISOString(),
  };
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
