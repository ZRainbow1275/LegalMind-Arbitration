// dev/src/app/api/ai/analyze/route.ts
// 案件分析：对齐 docs/API_REFERENCE.md 的 POST /api/ai/analyze
//
// 说明：
// - 真实 AI 能力依赖外部服务（如 OpenAI）；未配置时返回 SERVICE_NOT_CONFIGURED。
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { validateRequestBody } from '@/lib/validation';
import { getAIServiceManager, type NLPAnalysisResult } from '@/lib/ai-services';
import { logger } from '@/lib/logger';

const schema = z.object({
  caseId: z.string().uuid(),
  analysisType: z.enum(['evidence', 'relationship', 'timeline']),
});

type AnalysisEngine = 'openai_nlp' | 'rule_based';

function uniqueStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function buildRuleBasedNlp(params: {
  text: string;
  summary: string;
  entities: Array<{ text: string; label: string; confidence?: number }>;
  keywords: string[];
  topics: string[];
}): NLPAnalysisResult {
  const entities: NLPAnalysisResult['entities'] = params.entities.map((ent) => {
    const idx = params.text.indexOf(ent.text);
    const start = idx >= 0 ? idx : 0;
    return {
      text: ent.text,
      label: ent.label,
      confidence: typeof ent.confidence === 'number' ? ent.confidence : 0.7,
      start,
      end: start + ent.text.length,
    };
  });

  const keywords = uniqueStrings(params.keywords).slice(0, 30).map((text) => ({ text, score: 0.6 }));
  const topics = uniqueStrings(params.topics).slice(0, 10).map((topic) => ({ topic, score: 0.5 }));

  return {
    sentiment: { label: 'neutral', score: 0.5 },
    entities,
    keywords,
    summary: params.summary,
    topics: topics.length > 0 ? topics : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const validation = await validateRequestBody(request, schema);
    if (!validation.success) return validation.error;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: validation.data.caseId },
      select: {
        id: true,
        caseNumber: true,
        title: true,
        description: true,
        status: true,
        disputeAmount: true,
        currency: true,
        applicantId: true,
        respondentId: true,
        applicant: { select: { email: true, profile: { select: { realName: true, companyName: true } } } },
        respondent: { select: { email: true, profile: { select: { realName: true, companyName: true } } } },
        participants: { select: { userId: true, participantType: true, isActive: true } },
        documents: { select: { id: true, documentType: true, originalName: true, fileType: true, createdAt: true } },
        caseEvents: { orderBy: { sequence: 'desc' }, take: 20, select: { sequence: true, eventType: true, createdAt: true } },
      },
    });

    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser)
      || arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id
      || arbitrationCase.participants.some((p) => p.userId === authUser.id && p.isActive);

    if (!hasAccess) return ErrorResponses.FORBIDDEN();

    const summaryText = JSON.stringify(
      {
        analysisType: validation.data.analysisType,
        case: {
          id: arbitrationCase.id,
          caseNumber: arbitrationCase.caseNumber,
          title: arbitrationCase.title,
          description: arbitrationCase.description,
          status: arbitrationCase.status,
          disputeAmount: arbitrationCase.disputeAmount?.toString() ?? null,
          currency: arbitrationCase.currency,
        },
        parties: {
          applicant: {
            email: arbitrationCase.applicant?.email,
            name: arbitrationCase.applicant?.profile?.realName || arbitrationCase.applicant?.profile?.companyName || null,
          },
          respondent: {
            email: arbitrationCase.respondent?.email,
            name: arbitrationCase.respondent?.profile?.realName || arbitrationCase.respondent?.profile?.companyName || null,
          },
        },
        participants: arbitrationCase.participants.filter((p) => p.isActive),
        documents: arbitrationCase.documents.map((d) => ({
          id: d.id,
          documentType: d.documentType,
          originalName: d.originalName,
          fileType: d.fileType,
          createdAt: d.createdAt.toISOString(),
        })),
        recentEvents: arbitrationCase.caseEvents.map((e) => ({
          sequence: e.sequence.toString(),
          eventType: e.eventType,
          createdAt: e.createdAt.toISOString(),
        })),
      },
      null,
      2
    );

    const ai = getAIServiceManager();
    const nlp = await ai.analyzeText(summaryText, {
      includeSentiment: true,
      includeEntities: true,
      includeKeywords: true,
      includeSummary: true,
      includeTopics: true,
    });

    const fallbackSummary = (() => {
      const raw = arbitrationCase.description?.trim();
      if (raw) return raw.length > 400 ? `${raw.slice(0, 400)}...` : raw;       
      const combined = `${arbitrationCase.caseNumber} ${arbitrationCase.title}`
        .trim();
      return combined.length > 200 ? `${combined.slice(0, 200)}...` : combined; 
    })();

    const applicantName =
      arbitrationCase.applicant?.profile?.realName
      || arbitrationCase.applicant?.profile?.companyName
      || null;
    const respondentName =
      arbitrationCase.respondent?.profile?.realName
      || arbitrationCase.respondent?.profile?.companyName
      || null;

    const fallback = buildRuleBasedNlp({
      text: summaryText,
      summary: fallbackSummary,
      entities: [
        { text: arbitrationCase.caseNumber, label: 'case_number', confidence: 0.85 },
        { text: arbitrationCase.title, label: 'case_title', confidence: 0.8 },
        ...(applicantName ? [{ text: applicantName, label: 'party', confidence: 0.75 }] : []),
        ...(respondentName ? [{ text: respondentName, label: 'party', confidence: 0.75 }] : []),
      ],
      keywords: [
        validation.data.analysisType,
        arbitrationCase.status,
        ...arbitrationCase.documents.map((d) => d.documentType),
        ...arbitrationCase.caseEvents.map((e) => e.eventType),
      ],
      topics: [validation.data.analysisType, arbitrationCase.status],
    });

    const engine: AnalysisEngine = nlp.success && nlp.data ? 'openai_nlp' : 'rule_based';
    const analysis = nlp.success && nlp.data ? nlp.data : fallback;

    return createSuccessResponse(
      {
        analysisType: validation.data.analysisType,
        analysis,
        engine,
        fallbackReason: engine === 'rule_based' ? nlp.error ?? null : null,
        usage: engine === 'openai_nlp' ? nlp.usage ?? null : null,
      },
      'AI 分析完成'
    );
  } catch (error) {
    logger.error({ err: error }, 'AI 分析失败');
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
