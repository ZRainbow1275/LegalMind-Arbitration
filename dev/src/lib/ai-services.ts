// dev/src/lib/ai-services.ts
// AI服务集成管理器 - 支持多种AI服务提供商

import crypto from 'crypto';
import { z } from 'zod';
import { logger } from './logger';

// AI服务配置接口
interface AIServiceConfig {
  provider: string;
  endpoint: string;
  apiKey?: string;
  model?: string;
  timeout?: number;
  retries?: number;

  // Provider-specific（按需）
  secretId?: string;
  secretKey?: string;
  region?: string;
  appId?: string;
  apiSecret?: string;
  secretKeyId?: string;
}

// AI服务响应接口
interface AIServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    tokens?: number;
    cost?: number;
    duration?: number;
  };
}

// OCR服务响应
interface OCRResult {
  text: string;
  confidence: number;
  regions: Array<{
    text: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  language: string;
}

// 语音识别响应
interface SpeechToTextResult {
  text: string;
  confidence: number;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  language: string;
  duration: number;
}

// NLP分析响应
interface NLPAnalysisResult {
  sentiment: {
    label: 'positive' | 'negative' | 'neutral';
    score: number;
  };
  entities: Array<{
    text: string;
    label: string;
    confidence: number;
    start: number;
    end: number;
  }>;
  keywords: Array<{
    text: string;
    score: number;
  }>;
  summary?: string;
  topics?: Array<{
    topic: string;
    score: number;
  }>;
}

type NLPAnalysisOptions = {
  includeSentiment?: boolean;
  includeEntities?: boolean;
  includeKeywords?: boolean;
  includeSummary?: boolean;
  includeTopics?: boolean;
};

type TemplateVariableDefinition = {
  key: string;
  name: string;
  required: boolean;
};

// 智能推荐响应
interface RecommendationResult {
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
    metadata?: unknown;
  }>;
  reasoning: string;
}

interface AIUsageStats {
  ocr?: { requests: number; cost: number };
  asr?: { requests: number; cost: number };
  nlp?: { requests: number; cost: number };
  recommendation?: { requests: number; cost: number };
}

class AIServiceManager {
  private configs: Map<string, AIServiceConfig> = new Map();
  private usageStats = {
    ocr: { requests: 0, cost: 0 },
    asr: { requests: 0, cost: 0 },
    nlp: { requests: 0, cost: 0 },
    recommendation: { requests: 0, cost: 0 },
  };

  constructor() {
    this.initializeConfigs();
  }

  /**
   * 初始化AI服务配置
   */
  private initializeConfigs() {
    const defaultTimeout = 30000;
    const defaultRetries = 3;

    // 腾讯云OCR配置（推荐：TENCENT_SECRET_ID/TENCENT_SECRET_KEY；兼容历史变量）
    const tencentSecretId =
      process.env.TENCENT_SECRET_ID || process.env.TENCENT_OCR_SECRET_ID;
    const tencentSecretKey =
      process.env.TENCENT_SECRET_KEY || process.env.TENCENT_OCR_SECRET_KEY;
    const tencentRegion =
      process.env.TENCENT_OCR_REGION || process.env.TENCENT_REGION;

    if (tencentSecretId && tencentSecretKey) {
      this.configs.set('tencent_ocr', {
        provider: 'tencent',
        endpoint: 'https://ocr.tencentcloudapi.com',
        secretId: tencentSecretId,
        secretKey: tencentSecretKey,
        region: tencentRegion,
        timeout: defaultTimeout,
        retries: defaultRetries,
      });
    }

    // 讯飞语音识别配置（推荐：IFLYTEK_*；兼容 XFYUN_*）
    const iflytekAppId =
      process.env.IFLYTEK_APP_ID || process.env.XFYUN_APP_ID;
    const iflytekApiKey =
      process.env.IFLYTEK_API_KEY || process.env.XFYUN_API_KEY;
    const iflytekApiSecret =
      process.env.IFLYTEK_API_SECRET || process.env.XFYUN_API_SECRET;

    if (iflytekAppId && iflytekApiKey && iflytekApiSecret) {
      this.configs.set('xfyun_asr', {
        provider: 'xfyun',
        endpoint: 'https://iat-api.xfyun.cn/v2/iat',
        appId: iflytekAppId,
        apiKey: iflytekApiKey,
        apiSecret: iflytekApiSecret,
        timeout: 60000,
        retries: defaultRetries,
      });
    }

    // OpenAI配置
    if (process.env.OPENAI_API_KEY) {
      this.configs.set('openai_nlp', {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        timeout: defaultTimeout,
        retries: defaultRetries,
      });
    }

    // 百度AI配置（推荐：BAIDU_API_KEY/BAIDU_SECRET_KEY；兼容历史变量）
    const baiduApiKey =
      process.env.BAIDU_API_KEY || process.env.BAIDU_AI_API_KEY;
    const baiduSecretKey =
      process.env.BAIDU_SECRET_KEY || process.env.BAIDU_AI_SECRET_KEY;

    if (baiduApiKey && baiduSecretKey) {
      this.configs.set('baidu_ai', {
        provider: 'baidu',
        apiKey: baiduApiKey,
        secretKeyId: baiduSecretKey,
        endpoint: 'https://aip.baidubce.com',
        timeout: defaultTimeout,
        retries: defaultRetries,
      });
    }
  }

  /**
   * OCR文档识别
   */
  async performOCR(imageData: Buffer | string, options?: {
    language?: string;
    detectOrientation?: boolean;
  }): Promise<AIServiceResponse<OCRResult>> {
    const config = this.configs.get('tencent_ocr');
    if (!config) {
      return {
        success: false,
        error: 'SERVICE_NOT_CONFIGURED',
      };
    }

    try {
      const startTime = Date.now();
      this.usageStats.ocr.requests += 1;

      // 调用腾讯云OCR API
      const result = await this.callTencentOCR(imageData, config, options);     

      const duration = Date.now() - startTime;
      const cost = this.calculateOCRCost(result.text.length);
      this.usageStats.ocr.cost += cost;

      return {
        success: true,
        data: result,
        usage: {
          duration,
          cost,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'OCR识别失败');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR识别失败',
      };
    }
  }

  /**
   * 语音转文字
   */
  async speechToText(audioData: Buffer, options?: {
    language?: string;
    sampleRate?: number;
    format?: string;
  }): Promise<AIServiceResponse<SpeechToTextResult>> {
    const config = this.configs.get('openai_nlp');
    if (!config) {
      return {
        success: false,
        error: 'SERVICE_NOT_CONFIGURED',
      };
    }

    try {
      const startTime = Date.now();
      this.usageStats.asr.requests += 1;

      // 调用语音识别 API
      const result = await this.callOpenAITranscription(audioData, config, options);

      const duration = Date.now() - startTime;
      const cost = this.calculateASRCost(result.duration);
      this.usageStats.asr.cost += cost;

      return {
        success: true,
        data: result,
        usage: {
          duration,
          cost,
        },
      };
    } catch (error) {
      logger.error({ err: error }, '语音识别失败');
      return {
        success: false,
        error: error instanceof Error ? error.message : '语音识别失败',
      };
    }
  }

  /**
   * NLP文本分析
   */
  async analyzeText(text: string, options?: NLPAnalysisOptions): Promise<AIServiceResponse<NLPAnalysisResult>> {
    const config = this.configs.get('openai_nlp');
    if (!config) {
      return {
        success: false,
        error: 'SERVICE_NOT_CONFIGURED',
      };
    }

    try {
      const startTime = Date.now();
      this.usageStats.nlp.requests += 1;

      // 调用OpenAI API进行文本分析
      const result = await this.callOpenAINLP(text, config, options);

      const duration = Date.now() - startTime;
      const cost = this.calculateNLPCost(text.length);
      this.usageStats.nlp.cost += cost;

      return {
        success: true,
        data: result,
        usage: {
          tokens: this.estimateTokens(text),
          duration,
          cost,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'NLP分析失败');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'NLP分析失败',
      };
    }
  }

  /**
   * AI 填充模板变量（用于文书/材料生成）
   *
   * 约束：
   * - 禁止编造事实；只能基于输入 context 推断。
   * - 不确定的变量必须返回 null。
   */
  async fillTemplateVariables(params: {
    documentType: string;
    template: {
      templateType: string;
      name: string;
      category?: string | null;
      variables: TemplateVariableDefinition[];
    };
    placeholders: string[];
    caseContext: unknown;
  }): Promise<AIServiceResponse<Record<string, string | null>>> {
    const config = this.configs.get('openai_nlp');
    if (!config) {
      return { success: false, error: 'SERVICE_NOT_CONFIGURED' };
    }

    const placeholderSet = new Set(params.placeholders);
    const responseSchema = z.object({
      variables: z.record(z.string(), z.union([z.string(), z.null()])),
    });

    const controller = new AbortController();
    const timeoutMs = config.timeout ?? 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const model = config.model || 'gpt-4o-mini';
      const payload = {
        model,
        temperature: 0,
        response_format: { type: 'json_object' as const },
        messages: [
          {
            role: 'system' as const,
            content:
              '你是一个严格的模板变量填充引擎。仅基于输入的案件上下文与模板变量定义生成变量值；不得编造任何未在上下文中出现的事实、金额、日期、法律引用或当事人信息。若无法确定某个变量，必须返回 null。只输出 JSON 对象，且必须包含 variables 字段；variables 仅允许包含请求的 placeholders key；value 只能是 string 或 null。',
          },
          {
            role: 'user' as const,
            content: JSON.stringify(
              {
                documentType: params.documentType,
                template: params.template,
                placeholders: params.placeholders,
                caseContext: params.caseContext,
              },
              null,
              2
            ),
          },
        ],
      };

      const res = await fetch(`${config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OPENAI_API_ERROR_${res.status}: ${body}`.slice(0, 800));
      }

      const json = (await res.json()) as unknown;
      const openAiResponseSchema = z.object({
        choices: z.array(
          z.object({
            message: z.object({ content: z.string().min(1) }),
          })
        ),
      });
      const parsedResponse = openAiResponseSchema.safeParse(json);
      const content = parsedResponse.success ? parsedResponse.data.choices[0]?.message.content : undefined;
      if (!content) throw new Error('OPENAI_EMPTY_RESPONSE');

      const parsed = (() => {
        try {
          return JSON.parse(content);
        } catch {
          const start = content.indexOf('{');
          const end = content.lastIndexOf('}');
          if (start >= 0 && end > start) {
            return JSON.parse(content.slice(start, end + 1));
          }
          throw new Error('OPENAI_INVALID_JSON');
        }
      })();

      const validated = responseSchema.parse(parsed);
      const variables: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(validated.variables)) {
        if (!placeholderSet.has(key)) continue;
        variables[key] = value;
      }

      return { success: true, data: variables };
    } catch (error) {
      logger.error({ err: error }, 'AI 模板变量填充失败');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI 模板变量填充失败',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * 智能推荐
   */
  async getRecommendations(context: {
    type: 'case_analysis' | 'legal_advice' | 'process_guidance' | 'risk_assessment';
    data: unknown;
  }): Promise<AIServiceResponse<RecommendationResult>> {
    const config = this.configs.get('openai_nlp');
    if (!config) {
      return {
        success: false,
        error: 'SERVICE_NOT_CONFIGURED',
      };
    }

    try {
      const startTime = Date.now();
      this.usageStats.recommendation.requests += 1;

      // 调用AI推荐服务
      const result = await this.callAIRecommendation(context, config);

      const duration = Date.now() - startTime;
      const cost = this.calculateRecommendationCost(context.type);
      this.usageStats.recommendation.cost += cost;

      return {
        success: true,
        data: result,
        usage: {
          tokens: this.estimateTokens(JSON.stringify(context.data)),
          duration,
          cost,
        },
      };
    } catch (error) {
      logger.error({ err: error }, '智能推荐失败');
      return {
        success: false,
        error: error instanceof Error ? error.message : '智能推荐失败',
      };
    }
  }

  // 私有方法：调用具体的AI服务

  private sha256Hex(payload: string): string {
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private hmacSha256(key: Buffer | string, msg: string): Buffer {
    return crypto.createHmac('sha256', key).update(msg).digest();
  }

  private hmacSha256Hex(key: Buffer | string, msg: string): string {
    return crypto.createHmac('sha256', key).update(msg).digest('hex');
  }

  private toBase64(input: Buffer | string): string {
    if (typeof input === 'string') return input;
    return input.toString('base64');
  }

  private isHttpUrl(value: string): boolean {
    return value.startsWith('https://') || value.startsWith('http://');
  }

  /**
   * 调用腾讯云OCR
   */
  private async callTencentOCR(
    imageData: Buffer | string,
    config: AIServiceConfig,
    _options?: unknown
  ): Promise<OCRResult> {
    const secretId = config.secretId;
    const secretKey = config.secretKey;
    if (!secretId || !secretKey) {
      throw new Error('SERVICE_NOT_CONFIGURED');
    }

    const service = 'ocr';
    const host = new URL(config.endpoint).host;
    const action = 'GeneralBasicOCR';
    const version = '2018-11-19';
    const timestamp = Math.floor(Date.now() / 1000);

    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      throw new Error('TENCENT_OCR_INVALID_TIMESTAMP');
    }

    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

    const bodyObject: Record<string, unknown> =
      typeof imageData === 'string' && this.isHttpUrl(imageData)
        ? { ImageUrl: imageData }
        : { ImageBase64: this.toBase64(imageData) };

    const body = JSON.stringify(bodyObject);
    const hashedRequestPayload = this.sha256Hex(body);

    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`;
    const signedHeaders = 'content-type;host';
    const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

    const algorithm = 'TC3-HMAC-SHA256';
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = this.sha256Hex(canonicalRequest);
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

    const secretDate = this.hmacSha256(`TC3${secretKey}`, date);
    const secretService = this.hmacSha256(secretDate, service);
    const secretSigning = this.hmacSha256(secretService, 'tc3_request');
    const signature = this.hmacSha256Hex(secretSigning, stringToSign);

    const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      Authorization: authorization,
      'Content-Type': 'application/json; charset=utf-8',
      Host: host,
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Timestamp': String(timestamp),
    };

    if (config.region) headers['X-TC-Region'] = config.region;

    const controller = new AbortController();
    const timeoutMs = config.timeout ?? 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      const responseText = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(
          `TENCENT_OCR_HTTP_${res.status}: ${responseText}`.slice(0, 800)
        );
      }

      let json: unknown = null;
      try {
        json = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error('TENCENT_OCR_INVALID_JSON');
      }

      const responseSchema = z
        .object({
          Response: z
            .object({
              RequestId: z.string().optional(),
              Language: z.string().optional(),
              TextDetections: z
                .array(
                  z.object({
                    DetectedText: z.string().optional(),
                    Confidence: z.number().optional(),
                    Polygon: z
                      .array(
                        z.object({
                          X: z.number(),
                          Y: z.number(),
                        })
                      )
                      .optional(),
                  })
                )
                .optional(),
              Error: z
                .object({
                  Code: z.string(),
                  Message: z.string(),
                })
                .optional(),
            })
            .strict(),
        })
        .strict();

      const parsed = responseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error('TENCENT_OCR_SCHEMA_MISMATCH');
      }

      const response = parsed.data.Response;
      if (response.Error) {
        throw new Error(
          `TENCENT_OCR_${response.Error.Code}: ${response.Error.Message}`.slice(0, 800)
        );
      }

      const detections = response.TextDetections ?? [];
      const regions = detections
        .map((det) => {
          const polygon = det.Polygon ?? [];
          const xs = polygon.map((p) => p.X);
          const ys = polygon.map((p) => p.Y);
          const minX = xs.length ? Math.min(...xs) : 0;
          const maxX = xs.length ? Math.max(...xs) : 0;
          const minY = ys.length ? Math.min(...ys) : 0;
          const maxY = ys.length ? Math.max(...ys) : 0;

          return {
            text: det.DetectedText ?? '',
            confidence: typeof det.Confidence === 'number' ? det.Confidence : 0,
            boundingBox: {
              x: minX,
              y: minY,
              width: Math.max(0, maxX - minX),
              height: Math.max(0, maxY - minY),
            },
          };
        })
        .filter((r) => r.text.trim().length > 0);

      const text = regions.map((r) => r.text).join('\n');
      const confidence =
        regions.length > 0
          ? regions.reduce((sum, r) => sum + r.confidence, 0) / regions.length
          : 0;

      return {
        text,
        confidence,
        regions,
        language: response.Language ?? 'auto',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * 调用讯飞语音识别
   */
  private async callXfyunASR(
    _audioData: Buffer,
    _config: AIServiceConfig,
    _options?: unknown
  ): Promise<SpeechToTextResult> {
    // 说明：讯飞 ASR 的鉴权与长连接协议较复杂，当前仓库尚未落地真实实现。
    // 禁止返回模拟数据，因此这里显式抛出“未实现”错误，交由上层转为可审计的失败响应。
    throw new Error('SERVICE_NOT_CONFIGURED');
  }

  /**
   * 调用OpenAI NLP分析
   */
  private async callOpenAINLP(
    text: string,
    config: AIServiceConfig,
    options?: NLPAnalysisOptions
  ): Promise<NLPAnalysisResult> {
    const schema = z.object({
      sentiment: z.object({
        label: z.enum(['positive', 'negative', 'neutral']),
        score: z.number(),
      }),
      entities: z.array(
        z.object({
          text: z.string().min(1),
          label: z.string().min(1),
          confidence: z.number().min(0).max(1),
          start: z.number().int().nonnegative(),
          end: z.number().int().nonnegative(),
        })
      ),
      keywords: z.array(
        z.object({
          text: z.string().min(1),
          score: z.number(),
        })
      ),
      summary: z.string().optional(),
      topics: z
        .array(
          z.object({
            topic: z.string().min(1),
            score: z.number(),
          })
        )
        .optional(),
    });

    const controller = new AbortController();
    const timeoutMs = config.timeout ?? 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const model = config.model || 'gpt-4o-mini';
      const payload = {
        model,
        temperature: 0,
        response_format: { type: 'json_object' as const },
        messages: [
          {
            role: 'system' as const,
            content:
              '你是一个严格的文本分析引擎。仅基于输入文本做情绪/实体/关键词/摘要/主题提取；不得编造任何未在文本中出现的事实或法律引用；只输出JSON对象，不要输出额外文本。',
          },
          {
            role: 'user' as const,
            content: JSON.stringify(
              {
                text,
                options: {
                  includeSentiment: options?.includeSentiment ?? true,
                  includeEntities: options?.includeEntities ?? true,
                  includeKeywords: options?.includeKeywords ?? true,
                  includeSummary: options?.includeSummary ?? false,
                  includeTopics: options?.includeTopics ?? false,
                },
              },
              null,
              2
            ),
          },
        ],
      };

      const res = await fetch(`${config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OPENAI_API_ERROR_${res.status}: ${body}`.slice(0, 800));
      }

      const json = (await res.json()) as unknown;
      const openAiResponseSchema = z.object({
        choices: z.array(
          z.object({
            message: z.object({ content: z.string().min(1) }),
          })
        ),
      });
      const parsedResponse = openAiResponseSchema.safeParse(json);
      const content = parsedResponse.success ? parsedResponse.data.choices[0]?.message.content : undefined;
      if (!content) {
        throw new Error('OPENAI_EMPTY_RESPONSE');
      }

      const parsed = (() => {
        try {
          return JSON.parse(content);
        } catch {
          const start = content.indexOf('{');
          const end = content.lastIndexOf('}');
          if (start >= 0 && end > start) {
            return JSON.parse(content.slice(start, end + 1));
          }
          throw new Error('OPENAI_INVALID_JSON');
        }
      })();

      return schema.parse(parsed);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callOpenAITranscription(
    audioData: Buffer,
    config: AIServiceConfig,
    options?: { language?: string; sampleRate?: number; format?: string }
  ): Promise<SpeechToTextResult> {
    if (!config.apiKey) throw new Error('SERVICE_NOT_CONFIGURED');

    const controller = new AbortController();
    const timeoutMs = config.timeout ?? 60000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const format = (options?.format || 'wav').toLowerCase();
      const { fileName, mimeType } = (() => {
        switch (format) {
          case 'mp3':
            return { fileName: 'audio.mp3', mimeType: 'audio/mpeg' };
          case 'm4a':
            return { fileName: 'audio.m4a', mimeType: 'audio/mp4' };
          case 'webm':
            return { fileName: 'audio.webm', mimeType: 'audio/webm' };
          case 'ogg':
            return { fileName: 'audio.ogg', mimeType: 'audio/ogg' };
          case 'wav':
          default:
            return { fileName: 'audio.wav', mimeType: 'audio/wav' };
        }
      })();

      const model = process.env.OPENAI_ASR_MODEL || 'whisper-1';
      const form = new FormData();
      form.append(
        'file',
        new Blob([new Uint8Array(audioData)], { type: mimeType }),
        fileName
      );
      form.append('model', model);
      form.append('response_format', 'verbose_json');
      if (options?.language) form.append('language', options.language);

      const res = await fetch(`${config.endpoint}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: form,
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OPENAI_ASR_HTTP_${res.status}: ${body}`.slice(0, 800));
      }

      const json = (await res.json()) as unknown;
      const schema = z
        .object({
          text: z.string().default(''),
          language: z.string().optional(),
          duration: z.number().optional(),
          segments: z
            .array(
              z
                .object({
                  start: z.number(),
                  end: z.number(),
                  text: z.string(),
                  no_speech_prob: z.number().optional(),
                  avg_logprob: z.number().optional(),
                })
                .passthrough()
            )
            .optional(),
        })
        .passthrough();

      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new Error('OPENAI_ASR_SCHEMA_MISMATCH');
      }

      const segmentsRaw = parsed.data.segments ?? [];
      const segments = segmentsRaw
        .map((seg) => {
          const confidence =
            typeof seg.no_speech_prob === 'number'
              ? Math.min(1, Math.max(0, 1 - seg.no_speech_prob))
              : 0;
          return {
            text: seg.text,
            start: seg.start,
            end: seg.end,
            confidence,
          };
        })
        .filter((seg) => seg.text.trim().length > 0);

      const confidence =
        segments.length > 0
          ? segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length
          : 0;

      const duration =
        typeof parsed.data.duration === 'number'
          ? parsed.data.duration
          : segments.length > 0
            ? Math.max(...segments.map((s) => s.end))
            : 0;

      return {
        text: parsed.data.text,
        confidence,
        segments,
        language: parsed.data.language ?? (options?.language || 'auto'),
        duration,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * 调用AI推荐服务
   */
  private async callAIRecommendation(
    context: unknown,
    config: AIServiceConfig
  ): Promise<RecommendationResult> {
    if (!config.apiKey) throw new Error('SERVICE_NOT_CONFIGURED');

    const schema = z
      .object({
        recommendations: z
          .array(
            z
              .object({
                type: z.string().min(1).max(100),
                title: z.string().min(1).max(200),
                description: z.string().min(1).max(2000),
                confidence: z.number().min(0).max(1),
                metadata: z.unknown().optional(),
              })
              .strict()
          )
          .max(8),
        reasoning: z.string().min(1).max(4000),
      })
      .strict();

    const controller = new AbortController();
    const timeoutMs = config.timeout ?? 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const model = config.model || 'gpt-4o-mini';
      const payload = {
        model,
        temperature: 0,
        response_format: { type: 'json_object' as const },
        messages: [
          {
            role: 'system' as const,
            content:
              '你是一个严格的推荐引擎。仅基于输入的 context 生成可执行的建议；不得编造任何未在 context 中出现的事实、证据、金额、日期、法律条文或当事人信息。若信息不足，请返回空 recommendations，并在 reasoning 中说明缺口与需要补充的字段。只输出 JSON 对象（必须包含 recommendations 与 reasoning）。',
          },
          {
            role: 'user' as const,
            content: JSON.stringify({ context }, null, 2),
          },
        ],
      };

      const res = await fetch(`${config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OPENAI_API_ERROR_${res.status}: ${body}`.slice(0, 800));
      }

      const json = (await res.json()) as unknown;
      const openAiResponseSchema = z.object({
        choices: z.array(
          z.object({
            message: z.object({ content: z.string().min(1) }),
          })
        ),
      });
      const parsedResponse = openAiResponseSchema.safeParse(json);
      const content = parsedResponse.success ? parsedResponse.data.choices[0]?.message.content : undefined;
      if (!content) {
        throw new Error('OPENAI_EMPTY_RESPONSE');
      }

      const parsed = (() => {
        try {
          return JSON.parse(content);
        } catch {
          const start = content.indexOf('{');
          const end = content.lastIndexOf('}');
          if (start >= 0 && end > start) {
            return JSON.parse(content.slice(start, end + 1));
          }
          throw new Error('OPENAI_INVALID_JSON');
        }
      })();

      return schema.parse(parsed);
    } finally {
      clearTimeout(timeout);
    }
  }

  // 占位响应方法（禁止 Mock；保留方法签名用于未来真实集成）

  private createMockOCRResponse(
    _imageData: Buffer | string,
    _options?: unknown
  ): AIServiceResponse<OCRResult> {
    return { success: false, error: 'SERVICE_NOT_CONFIGURED' };
  }

  private createMockSpeechToTextResponse(
    _audioData: Buffer,
    _options?: unknown
  ): AIServiceResponse<SpeechToTextResult> {
    return { success: false, error: 'SERVICE_NOT_CONFIGURED' };
  }

  private createMockNLPResponse(
    _text: string,
    _options?: unknown
  ): AIServiceResponse<NLPAnalysisResult> {
    return { success: false, error: 'SERVICE_NOT_CONFIGURED' };
  }

  private createMockRecommendationResponse(
    _context: unknown
  ): AIServiceResponse<RecommendationResult> {
    return { success: false, error: 'SERVICE_NOT_CONFIGURED' };
  }

  // 辅助方法

  private estimateTokens(text: string): number {
    // 简单的token估算：中文按字符数，英文按单词数
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }

  private calculateOCRCost(textLength: number): number {
    return Math.max(0.01, textLength * 0.0001);
  }

  private calculateASRCost(duration: number): number {
    return Math.max(0.01, duration * 0.005);
  }

  private calculateNLPCost(textLength: number): number {
    return Math.max(0.005, textLength * 0.00005);
  }

  private calculateRecommendationCost(type: string): number {
    const costs = {
      case_analysis: 0.02,
      legal_advice: 0.015,
      process_guidance: 0.01,
      risk_assessment: 0.025,
    };
    return costs[type as keyof typeof costs] || 0.01;
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const [serviceName, config] of this.configs) {
      status[serviceName] = true; // 简化实现，实际应该检查服务可用性
    }
    
    return status;
  }

  /**
   * 获取使用统计
   */
  async getUsageStats(): Promise<AIUsageStats> {
    return {
      ocr: { ...this.usageStats.ocr },
      asr: { ...this.usageStats.asr },
      nlp: { ...this.usageStats.nlp },
      recommendation: { ...this.usageStats.recommendation },
    };
  }
}

// 创建全局AI服务实例
let aiServiceManager: AIServiceManager | null = null;

export function getAIServiceManager(): AIServiceManager {
  if (!aiServiceManager) {
    aiServiceManager = new AIServiceManager();
  }
  return aiServiceManager;
}

export { AIServiceManager };
export type { 
  AIServiceConfig, 
  AIServiceResponse, 
  OCRResult, 
  SpeechToTextResult, 
  NLPAnalysisResult, 
  RecommendationResult 
};
