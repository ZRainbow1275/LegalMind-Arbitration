// dev/src/lib/external-systems.ts
// 外部系统集成管理器 - 支持法院数据系统、公证系统、法律数据库
// ⚠️ 禁止 Mock：未配置/未实现必须显式失败（SERVICE_NOT_CONFIGURED / NOT_IMPLEMENTED）

import crypto from 'crypto';
import { z } from 'zod';
import { getEnv } from '@/lib/env-validator';

export type ExternalSystemKey = 'courtSystem' | 'notarySystem' | 'legalDatabase';

export type ExternalSystemErrorCode =
  | 'SERVICE_NOT_CONFIGURED'
  | 'NOT_IMPLEMENTED'
  | 'INVALID_REQUEST'
  | 'UPSTREAM_ERROR';

export const externalSystemInvocationContextSchema = z
  .object({
    caseId: z.string().uuid().optional(),
    documentId: z.string().uuid().optional(),
    targetSystem: z.string().max(200).optional(),
    parameters: z.unknown().optional(),
  })
  .strict();

export type ExternalSystemInvocationContext = z.infer<
  typeof externalSystemInvocationContextSchema
>;

// 外部系统配置接口
interface ExternalSystemConfig {
  system: ExternalSystemKey;
  name: string;
  endpoint?: string;
  apiKey?: string;
  timeoutMs: number;
  retries: number;
  enabled: boolean;
}

// 外部系统响应接口
interface ExternalSystemResponse<T = unknown> {
  success: boolean;
  data?: T;
  errorCode?: ExternalSystemErrorCode;
  error?: string;
  systemInfo?: {
    system: ExternalSystemKey;
    responseTime: number;
    version?: string;
    statusCode?: number;
    requestId?: string;
  };
}

// 法院数据系统接口
interface CourtSystemData {
  caseNumber: string;
  courtName: string;
  status: string;
  filingDate: string;
  hearingDate?: string;
  judgmentDate?: string;
  parties: Array<{
    name: string;
    role: 'plaintiff' | 'defendant';
    representative?: string;
  }>;
  documents: Array<{
    type: string;
    title: string;
    uploadDate: string;
    status: string;
  }>;
}

// 公证系统接口
interface NotarySystemData {
  notaryNumber: string;
  notaryOffice: string;
  notaryType: string;
  applicationDate: string;
  completionDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  documents: Array<{
    name: string;
    hash: string;
    timestamp: string;
  }>;
  certificate?: {
    number: string;
    issueDate: string;
    validUntil: string;
  };
}

// 法律数据库接口
interface LegalDatabaseData {
  laws: Array<{
    title: string;
    article: string;
    content: string;
    effectiveDate: string;
    relevanceScore: number;
  }>;
  precedents: Array<{
    caseTitle: string;
    court: string;
    date: string;
    summary: string;
    relevanceScore: number;
    citation: string;
  }>;
  regulations: Array<{
    title: string;
    department: string;
    number: string;
    content: string;
    relevanceScore: number;
  }>;
}

const courtSystemActionSchema = z.enum([
  'notify_court',
  'query_case',
  'submit_documents',
  'check_status',
]);

const notarySystemActionSchema = z.enum([
  'apply_notarization',
  'check_notary_status',
  'download_certificate',
]);

const legalDatabaseActionSchema = z.enum([
  'search_laws',
  'search_precedents',
  'search_regulations',
  'comprehensive_search',
]);

const courtSystemDataSchema: z.ZodType<CourtSystemData> = z
  .object({
    caseNumber: z.string().min(1),
    courtName: z.string().min(1),
    status: z.string().min(1),
    filingDate: z.string().min(1),
    hearingDate: z.string().optional(),
    judgmentDate: z.string().optional(),
    parties: z.array(
      z
        .object({
          name: z.string().min(1),
          role: z.enum(['plaintiff', 'defendant']),
          representative: z.string().optional(),
        })
        .strict()
    ),
    documents: z.array(
      z
        .object({
          type: z.string().min(1),
          title: z.string().min(1),
          uploadDate: z.string().min(1),
          status: z.string().min(1),
        })
        .strict()
    ),
  })
  .strict();

const notarySystemDataSchema: z.ZodType<NotarySystemData> = z
  .object({
    notaryNumber: z.string().min(1),
    notaryOffice: z.string().min(1),
    notaryType: z.string().min(1),
    applicationDate: z.string().min(1),
    completionDate: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'rejected']),
    documents: z.array(
      z
        .object({
          name: z.string().min(1),
          hash: z.string().min(1),
          timestamp: z.string().min(1),
        })
        .strict()
    ),
    certificate: z
      .object({
        number: z.string().min(1),
        issueDate: z.string().min(1),
        validUntil: z.string().min(1),
      })
      .strict()
      .optional(),
  })
  .strict();

const legalDatabaseDataSchema: z.ZodType<LegalDatabaseData> = z
  .object({
    laws: z.array(
      z
        .object({
          title: z.string().min(1),
          article: z.string().min(1),
          content: z.string().min(1),
          effectiveDate: z.string().min(1),
          relevanceScore: z.number(),
        })
        .strict()
    ),
    precedents: z.array(
      z
        .object({
          caseTitle: z.string().min(1),
          court: z.string().min(1),
          date: z.string().min(1),
          summary: z.string().min(1),
          relevanceScore: z.number(),
          citation: z.string().min(1),
        })
        .strict()
    ),
    regulations: z.array(
      z
        .object({
          title: z.string().min(1),
          department: z.string().min(1),
          number: z.string().min(1),
          content: z.string().min(1),
          relevanceScore: z.number(),
        })
        .strict()
    ),
  })
  .strict();

function normalizeEndpoint(endpoint: string): string {
  return endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
}

function buildActionUrl(endpoint: string, action: string): string {
  const base = normalizeEndpoint(endpoint);
  return `${base}/actions/${encodeURIComponent(action)}`;
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseTextSafe(
  res: Response,
  maxBytes: number = 4_096
): Promise<string> {
  try {
    const text = await res.text();
    if (text.length <= maxBytes) return text;
    return `${text.slice(0, maxBytes)}...`;
  } catch {
    return '';
  }
}

class ExternalSystemManager {
  private configs: Map<ExternalSystemKey, ExternalSystemConfig> = new Map();

  constructor() {
    this.initializeConfigs();
  }

  /**
   * 初始化外部系统配置
   */
  private initializeConfigs() {
    const env = getEnv();
    const featureEnabled = env.FEATURE_EXTERNAL_SYSTEMS === true;

    this.configs.set('courtSystem', {
      system: 'courtSystem',
      name: '法院数据系统',
      endpoint: env.COURT_SYSTEM_API_URL,
      apiKey: env.COURT_SYSTEM_API_KEY,
      timeoutMs: env.COURT_SYSTEM_TIMEOUT ?? 30000,
      retries: 3,
      enabled:
        featureEnabled
        && !!env.COURT_SYSTEM_API_URL
        && !!env.COURT_SYSTEM_API_KEY,
    });

    this.configs.set('notarySystem', {
      system: 'notarySystem',
      name: '公证系统',
      endpoint: env.NOTARY_SYSTEM_API_URL,
      apiKey: env.NOTARY_SYSTEM_API_KEY,
      timeoutMs: env.NOTARY_SYSTEM_TIMEOUT ?? 30000,
      retries: 3,
      enabled:
        featureEnabled
        && !!env.NOTARY_SYSTEM_API_URL
        && !!env.NOTARY_SYSTEM_API_KEY,
    });

    this.configs.set('legalDatabase', {
      system: 'legalDatabase',
      name: '法律数据库',
      endpoint: env.LEGAL_DATABASE_API_URL,
      apiKey: env.LEGAL_DATABASE_API_KEY,
      timeoutMs: env.LEGAL_DATABASE_TIMEOUT ?? 30000,
      retries: 3,
      enabled:
        featureEnabled
        && !!env.LEGAL_DATABASE_API_URL
        && !!env.LEGAL_DATABASE_API_KEY,
    });
  }

  /**
   * 法院数据系统集成
   */
  async integrateCourtSystem(
    action: string,
    context: ExternalSystemInvocationContext
  ): Promise<ExternalSystemResponse<CourtSystemData>> {
    const config = this.configs.get('courtSystem');
    if (!config || !config.enabled) {
      return this.failNotConfigured('courtSystem');
    }

    const parsedContext = externalSystemInvocationContextSchema.safeParse(context);
    if (!parsedContext.success) {
      return this.failInvalidRequest('courtSystem', 'context格式不正确');
    }

    const parsedAction = courtSystemActionSchema.safeParse(action);
    if (!parsedAction.success) {
      return this.failNotImplemented('courtSystem', `不支持的法院系统操作: ${action}`);
    }

    return await this.invokeAction(
      config,
      parsedAction.data,
      parsedContext.data,
      courtSystemDataSchema
    );
  }

  /**
   * 公证系统集成
   */
  async integrateNotarySystem(
    action: string,
    context: ExternalSystemInvocationContext
  ): Promise<ExternalSystemResponse<NotarySystemData>> {
    const config = this.configs.get('notarySystem');
    if (!config || !config.enabled) {
      return this.failNotConfigured('notarySystem');
    }

    const parsedContext = externalSystemInvocationContextSchema.safeParse(context);
    if (!parsedContext.success) {
      return this.failInvalidRequest('notarySystem', 'context格式不正确');
    }

    const parsedAction = notarySystemActionSchema.safeParse(action);
    if (!parsedAction.success) {
      return this.failNotImplemented('notarySystem', `不支持的公证系统操作: ${action}`);
    }

    return await this.invokeAction(
      config,
      parsedAction.data,
      parsedContext.data,
      notarySystemDataSchema
    );
  }

  /**
   * 法律数据库集成
   */
  async integrateLegalDatabase(
    action: string,
    context: ExternalSystemInvocationContext
  ): Promise<ExternalSystemResponse<LegalDatabaseData>> {
    const config = this.configs.get('legalDatabase');
    if (!config || !config.enabled) {
      return this.failNotConfigured('legalDatabase');
    }

    const parsedContext = externalSystemInvocationContextSchema.safeParse(context);
    if (!parsedContext.success) {
      return this.failInvalidRequest('legalDatabase', 'context格式不正确');
    }

    const parsedAction = legalDatabaseActionSchema.safeParse(action);
    if (!parsedAction.success) {
      return this.failNotImplemented('legalDatabase', `不支持的法律数据库操作: ${action}`);
    }

    return await this.invokeAction(
      config,
      parsedAction.data,
      parsedContext.data,
      legalDatabaseDataSchema
    );
  }

  private failNotConfigured<T>(system: ExternalSystemKey): ExternalSystemResponse<T> {
    const cfg = this.configs.get(system);
    return {
      success: false,
      errorCode: 'SERVICE_NOT_CONFIGURED',
      error: `${cfg?.name ?? system}未配置或未启用`,
      systemInfo: {
        system,
        responseTime: 0,
      },
    };
  }

  private failInvalidRequest<T>(
    system: ExternalSystemKey,
    message: string
  ): ExternalSystemResponse<T> {
    return {
      success: false,
      errorCode: 'INVALID_REQUEST',
      error: message,
      systemInfo: {
        system,
        responseTime: 0,
      },
    };
  }

  private failNotImplemented<T>(
    system: ExternalSystemKey,
    message: string
  ): ExternalSystemResponse<T> {
    return {
      success: false,
      errorCode: 'NOT_IMPLEMENTED',
      error: message,
      systemInfo: {
        system,
        responseTime: 0,
      },
    };
  }

  private async invokeAction<T>(
    config: ExternalSystemConfig,
    action: string,
    context: ExternalSystemInvocationContext,
    responseSchema: z.ZodSchema<T>
  ): Promise<ExternalSystemResponse<T>> {
    if (!config.endpoint || !config.apiKey) {
      return this.failNotConfigured(config.system);
    }

    const requestId = crypto.randomUUID();
    const url = buildActionUrl(config.endpoint, action);
    const startTime = Date.now();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Request-Id': requestId,
      Authorization: `Bearer ${config.apiKey}`,
      'X-API-Key': config.apiKey,
    };

    const payload = JSON.stringify({
      action,
      context: {
        caseId: context.caseId ?? null,
        documentId: context.documentId ?? null,
        targetSystem: context.targetSystem ?? null,
        parameters:
          typeof context.parameters === 'undefined' ? null : context.parameters,
      },
    });

    const retries = Math.max(1, config.retries);
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers,
            body: payload,
          },
          config.timeoutMs
        );

        const responseTime = Date.now() - startTime;

        if (!res.ok) {
          const text = await readResponseTextSafe(res);
          const message = text
            ? `上游返回 ${res.status}: ${text}`
            : `上游返回 ${res.status}`;

          if (attempt < retries && isRetryableStatus(res.status)) {
            lastError = new Error(message);
            continue;
          }

          return {
            success: false,
            errorCode: 'UPSTREAM_ERROR',
            error: message,
            systemInfo: {
              system: config.system,
              responseTime,
              statusCode: res.status,
              requestId,
            },
          };
        }

        const text = await readResponseTextSafe(res, 256_000);
        let json: unknown = null;

        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          return {
            success: false,
            errorCode: 'UPSTREAM_ERROR',
            error: '上游返回非 JSON 响应',
            systemInfo: {
              system: config.system,
              responseTime,
              statusCode: res.status,
              requestId,
            },
          };
        }

        const parsed = responseSchema.safeParse(json);
        if (!parsed.success) {
          return {
            success: false,
            errorCode: 'UPSTREAM_ERROR',
            error: '上游响应格式不符合约定',
            systemInfo: {
              system: config.system,
              responseTime,
              statusCode: res.status,
              requestId,
            },
          };
        }

        return {
          success: true,
          data: parsed.data,
          systemInfo: {
            system: config.system,
            responseTime,
            statusCode: res.status,
            requestId,
          },
        };
      } catch (error) {
        lastError = error;
        if (attempt < retries) continue;

        return {
          success: false,
          errorCode: 'UPSTREAM_ERROR',
          error: error instanceof Error ? error.message : String(error),
          systemInfo: {
            system: config.system,
            responseTime: Date.now() - startTime,
            requestId,
          },
        };
      }
    }

    return {
      success: false,
      errorCode: 'UPSTREAM_ERROR',
      error: lastError instanceof Error ? lastError.message : '外部系统调用失败',
      systemInfo: {
        system: config.system,
        responseTime: Date.now() - startTime,
        requestId,
      },
    };
  }

  // 法院系统具体操作

  private async notifyCourt(
    _params: unknown,
    _config: ExternalSystemConfig
  ): Promise<ExternalSystemResponse<CourtSystemData>> {
    return this.failNotImplemented('courtSystem', 'notify_court 尚未实现');
  }

  private async queryCourtCase(
    _params: unknown,
    _config: ExternalSystemConfig
  ): Promise<ExternalSystemResponse<CourtSystemData>> {
    return this.failNotImplemented('courtSystem', 'query_case 尚未实现');
  }

  private async submitCourtDocuments(
    _params: unknown,
    _config: ExternalSystemConfig
  ): Promise<ExternalSystemResponse<CourtSystemData>> {
    return this.failNotImplemented('courtSystem', 'submit_documents 尚未实现');
  }

  private async checkCourtStatus(
    _params: unknown,
    _config: ExternalSystemConfig
  ): Promise<ExternalSystemResponse<CourtSystemData>> {
    return this.failNotImplemented('courtSystem', 'check_status 尚未实现');
  }

  // 公证系统具体操作

  private async applyNotarization(
    _params: unknown,
    _config: ExternalSystemConfig
  ): Promise<ExternalSystemResponse<NotarySystemData>> {
    return this.failNotImplemented('notarySystem', 'apply_notarization 尚未实现');
  }

  private async checkNotaryStatus(
    _params: unknown,
    _config: ExternalSystemConfig
  ): Promise<ExternalSystemResponse<NotarySystemData>> {
    return this.failNotImplemented('notarySystem', 'check_notary_status 尚未实现');
  }

  private async downloadNotaryCertificate(
    _params: unknown,
    _config: ExternalSystemConfig
  ): Promise<ExternalSystemResponse<NotarySystemData>> {
    return this.failNotImplemented('notarySystem', 'download_certificate 尚未实现');
  }

  // 法律数据库具体操作

  private async searchLaws(
    _params: unknown,
    _config: ExternalSystemConfig
  ): Promise<ExternalSystemResponse<LegalDatabaseData>> {
    return this.failNotImplemented('legalDatabase', 'search_laws 尚未实现');
  }

  private async searchPrecedents(
    _params: unknown,
    _config: ExternalSystemConfig
  ): Promise<ExternalSystemResponse<LegalDatabaseData>> {
    return this.failNotImplemented('legalDatabase', 'search_precedents 尚未实现');
  }

  private async searchRegulations(
    _params: unknown,
    _config: ExternalSystemConfig
  ): Promise<ExternalSystemResponse<LegalDatabaseData>> {
    return this.failNotImplemented('legalDatabase', 'search_regulations 尚未实现');
  }

  private async comprehensiveSearch(
    _params: unknown,
    _config: ExternalSystemConfig
  ): Promise<ExternalSystemResponse<LegalDatabaseData>> {
    return this.failNotImplemented('legalDatabase', 'comprehensive_search 尚未实现');
  }

  // 兼容保留：历史调用点（禁止返回“模拟成功”）

  private createMockCourtResponse(
    _action: string,
    _params: unknown
  ): ExternalSystemResponse<CourtSystemData> {
    return this.failNotConfigured('courtSystem');
  }

  private createMockNotaryResponse(
    _action: string,
    _params: unknown
  ): ExternalSystemResponse<NotarySystemData> {
    return this.failNotConfigured('notarySystem');
  }

  private createMockLegalDbResponse(
    _action: string,
    _params: unknown
  ): ExternalSystemResponse<LegalDatabaseData> {
    return this.failNotConfigured('legalDatabase');
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): Record<
    ExternalSystemKey,
    { enabled: boolean; configured: boolean; name: string; endpoint?: string }
  > {
    const status = {} as Record<
      ExternalSystemKey,
      { enabled: boolean; configured: boolean; name: string; endpoint?: string }
    >;

    for (const [key, config] of this.configs) {
      status[key] = {
        enabled: config.enabled,
        configured: !!config.endpoint && !!config.apiKey,
        name: config.name,
        endpoint: config.endpoint,
      };
    }

    return status;
  }

  /**
   * 测试系统连接
   */
  async testConnections(): Promise<Record<ExternalSystemKey, boolean>> {
    const results = {} as Record<ExternalSystemKey, boolean>;

    for (const [key, config] of this.configs) {
      if (!config.enabled || !config.endpoint) {
        results[key] = false;
        continue;
      }

      try {
        const requestId = crypto.randomUUID();
        const headers: Record<string, string> = {
          Accept: '*/*',
          'X-Request-Id': requestId,
        };

        if (config.apiKey) {
          headers.Authorization = `Bearer ${config.apiKey}`;
          headers['X-API-Key'] = config.apiKey;
        }

        await fetchWithTimeout(
          normalizeEndpoint(config.endpoint),
          { method: 'HEAD', headers },
          Math.min(config.timeoutMs, 2000)
        );

        results[key] = true;
      } catch {
        results[key] = false;
      }
    }

    return results;
  }
}

// 创建全局外部系统管理器实例
let externalSystemManager: ExternalSystemManager | null = null;

export function getExternalSystemManager(): ExternalSystemManager {
  if (!externalSystemManager) {
    externalSystemManager = new ExternalSystemManager();
  }
  return externalSystemManager;
}

export { ExternalSystemManager };
export type { 
  ExternalSystemConfig, 
  ExternalSystemResponse, 
  CourtSystemData, 
  NotarySystemData, 
  LegalDatabaseData 
};
