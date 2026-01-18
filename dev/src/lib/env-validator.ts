// dev/src/lib/env-validator.ts
// 环境变量验证工具 - 确保所有必需的环境变量都已配置

import { z } from 'zod';
import { logger } from './logger';

/**
 * 环境变量验证 Schema
 * 定义所有必需和可选的环境变量
 */
const envSchema = z.object({
  // 应用基础配置
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().default('LegalMind仲裁平台'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // 数据库配置（必需）
  DATABASE_URL: z.string().min(1, '数据库连接URL不能为空'),
  DATABASE_POOL_MIN: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  DATABASE_POOL_MAX: z.string().transform(Number).pipe(z.number().max(100)).optional(),
  DATABASE_TIMEOUT: z.string().transform(Number).pipe(z.number()).optional(),

  // Redis 缓存配置（必需）
  REDIS_URL: z.string().min(1, 'Redis连接URL不能为空'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).pipe(z.number().min(0).max(15)).optional(),
  REDIS_PREFIX: z.string().default('legalmind:'),
  REDIS_MAX_RETRIES: z.string().transform(Number).pipe(z.number()).optional(),
  REDIS_RETRY_DELAY: z.string().transform(Number).pipe(z.number()).optional(),
  REDIS_CONNECT_TIMEOUT: z.string().transform(Number).pipe(z.number()).optional(),

  // BullMQ / 队列（可选）
  // 生产建议：Web 进程关闭（false），独立 worker 进程开启（true）
  BULLMQ_RUN_WORKERS: z.string().transform(v => v === 'true').optional(),

  // 缓存过期时间配置
  CACHE_TTL_SHORT: z.string().transform(Number).pipe(z.number()).optional(),    
  CACHE_TTL_MEDIUM: z.string().transform(Number).pipe(z.number()).optional(),
  CACHE_TTL_LONG: z.string().transform(Number).pipe(z.number()).optional(),
  CACHE_TTL_VERY_LONG: z.string().transform(Number).pipe(z.number()).optional(),

  // JWT 认证配置（必需）
  JWT_SECRET: z.string().min(32, 'JWT密钥长度至少32个字符'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  SESSION_TIMEOUT: z.string().transform(Number).pipe(z.number()).optional(),
  SESSION_MAX_AGE: z.string().transform(Number).pipe(z.number()).optional(),

  // 安全配置（必需 - 等保三级标准）
  CSRF_SECRET: z.string().min(32, 'CSRF密钥长度至少32个字符'),
  CSRF_TOKEN_LENGTH: z.string().transform(Number).pipe(z.number().min(16)).optional(),
  
  // 密码策略
  PASSWORD_MIN_LENGTH: z.string().transform(Number).pipe(z.number().min(8)).optional(),
  PASSWORD_REQUIRE_UPPERCASE: z.string().transform(v => v === 'true').optional(),
  PASSWORD_REQUIRE_LOWERCASE: z.string().transform(v => v === 'true').optional(),
  PASSWORD_REQUIRE_NUMBERS: z.string().transform(v => v === 'true').optional(),
  PASSWORD_REQUIRE_SPECIAL: z.string().transform(v => v === 'true').optional(),
  PASSWORD_MAX_AGE_DAYS: z.string().transform(Number).pipe(z.number()).optional(),

  // 登录安全
  MAX_LOGIN_ATTEMPTS: z.string().transform(Number).pipe(z.number()).optional(),
  LOGIN_LOCKOUT_DURATION: z.string().transform(Number).pipe(z.number()).optional(),
  LOGIN_ATTEMPT_WINDOW: z.string().transform(Number).pipe(z.number()).optional(),

  // API 速率限制
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number()).optional(),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number()).optional(),
  RATE_LIMIT_STRICT_MODE: z.string().transform(v => v === 'true').optional(),

  // IP 白名单（可选）
  IP_WHITELIST_ENABLED: z.string().transform(v => v === 'true').optional(),

  // 数据加密（必需）
  ENCRYPTION_KEY: z.string().length(32, '加密密钥必须是32个字符'),        
  ENCRYPTION_ALGORITHM: z.string().default('aes-256-gcm'),

  // 审计日志（必需）
  AUDIT_LOG_SECRET: z.string().min(32, '审计日志密钥长度至少32个字符'),

  // 电子签名/电子印章（可选：未配置则相关接口返回 SERVICE_NOT_CONFIGURED）
  DOCUMENT_SIGNING_PRIVATE_KEY_PEM: z.string().min(1).optional(),
  DOCUMENT_SIGNING_PUBLIC_KEY_PEM: z.string().min(1).optional(),
  DOCUMENT_SIGNING_ALGORITHM: z.string().default('RSA-SHA256'),

  // 支付/对账（可选：未配置则支付接口返回 SERVICE_NOT_CONFIGURED）
  PAYMENT_WEBHOOK_SECRET: z.string().min(32).optional(),

  // AI 服务配置（可选 - 待开发）
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_MAX_TOKENS: z.string().transform(Number).pipe(z.number()).optional(),
  OPENAI_TEMPERATURE: z.string().transform(Number).pipe(z.number()).optional(),
  
  TENCENT_SECRET_ID: z.string().optional(),
  TENCENT_SECRET_KEY: z.string().optional(),
  TENCENT_OCR_REGION: z.string().optional(),
  TENCENT_SMS_SDK_APP_ID: z.string().optional(),
  TENCENT_SMS_REGION: z.string().optional(),
  
  IFLYTEK_APP_ID: z.string().optional(),
  IFLYTEK_API_KEY: z.string().optional(),
  IFLYTEK_API_SECRET: z.string().optional(),
  
  BAIDU_API_KEY: z.string().optional(),
  BAIDU_SECRET_KEY: z.string().optional(),
  
  AI_REQUEST_TIMEOUT: z.string().transform(Number).pipe(z.number()).optional(),
  AI_MAX_RETRIES: z.string().transform(Number).pipe(z.number()).optional(),

  // 外部系统集成配置（可选 - 待开发）
  COURT_SYSTEM_API_URL: z.string().url().optional(),
  COURT_SYSTEM_API_KEY: z.string().optional(),
  COURT_SYSTEM_TIMEOUT: z.string().transform(Number).pipe(z.number()).optional(),
  
  NOTARY_SYSTEM_API_URL: z.string().url().optional(),
  NOTARY_SYSTEM_API_KEY: z.string().optional(),
  NOTARY_SYSTEM_TIMEOUT: z.string().transform(Number).pipe(z.number()).optional(),
  
  LEGAL_DATABASE_API_URL: z.string().url().optional(),
  LEGAL_DATABASE_API_KEY: z.string().optional(),
  LEGAL_DATABASE_TIMEOUT: z.string().transform(Number).pipe(z.number()).optional(),

  // 文件存储配置
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number()).optional(),      
  ALLOWED_FILE_TYPES: z.string().optional(),

  // S3/MinIO 对象存储配置（D4A：MinIO / S3 兼容）
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().transform(v => v === 'true').default(true),
  S3_PRESIGNED_URL_EXPIRES_SECONDS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(10).max(3600))
    .default(60),
  S3_SERVER_SIDE_ENCRYPTION: z.enum(['AES256', 'aws:kms']).optional(),

  // 邮件服务配置（可选）
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number()).optional(),
  SMTP_SECURE: z.string().transform(v => v === 'true').optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_NAME: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),

  // 短信服务配置（可选）
  SMS_PROVIDER: z.enum(['aliyun', 'tencent', 'twilio']).optional(),
  SMS_ACCESS_KEY_ID: z.string().optional(),
  SMS_ACCESS_KEY_SECRET: z.string().optional(),
  SMS_SIGN_NAME: z.string().optional(),
  SMS_TEMPLATE_CODE: z.string().optional(),
  // Twilio（可选：用于 SMS_PROVIDER=twilio）
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
  // 场景化模板（可选；未设置则回退 SMS_TEMPLATE_CODE）
  SMS_TEMPLATE_CODE_VERIFY_PHONE: z.string().optional(),
  SMS_TEMPLATE_CODE_NOTIFICATION: z.string().optional(),
  SMS_TEMPLATE_CODE_SERVICE: z.string().optional(),

  // WebRTC 配置（可选）
  LIVEKIT_URL: z.string().url().optional(),
  LIVEKIT_API_KEY: z.string().min(1).optional(),
  LIVEKIT_API_SECRET: z.string().min(1).optional(),
  LIVEKIT_TOKEN_TTL_SECONDS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(60).max(86400))
    .optional(),
  WEBRTC_STUN_SERVER: z.string().optional(),
  WEBRTC_TURN_SERVER: z.string().optional(),
  WEBRTC_TURN_USERNAME: z.string().optional(),
  WEBRTC_TURN_PASSWORD: z.string().optional(),

  // 日志配置
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().optional(),
  LOG_MAX_SIZE: z.string().transform(Number).pipe(z.number()).optional(),
  LOG_MAX_FILES: z.string().transform(Number).pipe(z.number()).optional(),
  LOG_COMPRESS: z.string().transform(v => v === 'true').optional(),
  
  // 审计日志配置（必需 - 等保三级标准）
  AUDIT_LOG_ENABLED: z.string().transform(v => v === 'true').default(true),
  AUDIT_LOG_RETENTION_DAYS: z.string().transform(Number).pipe(z.number()).optional(),
  AUDIT_LOG_ENCRYPTION: z.string().transform(v => v === 'true').optional(),

  // 监控配置（可选）
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().transform(Number).pipe(z.number()).optional(),
  
  PERFORMANCE_MONITORING: z.string().transform(v => v === 'true').optional(),
  SLOW_QUERY_THRESHOLD: z.string().transform(Number).pipe(z.number()).optional(),
  API_TIMEOUT: z.string().transform(Number).pipe(z.number()).optional(),

  // 开发工具配置
  DEBUG_MODE: z.string().transform(v => v === 'true').optional(),
  DEBUG_SQL: z.string().transform(v => v === 'true').optional(),
  DEBUG_CACHE: z.string().transform(v => v === 'true').optional(),
  ENABLE_API_DOCS: z.string().transform(v => v === 'true').optional(),
  API_DOCS_PATH: z.string().optional(),

  // 备份配置
  BACKUP_ENABLED: z.string().transform(v => v === 'true').optional(),
  BACKUP_SCHEDULE: z.string().optional(),
  BACKUP_RETENTION_DAYS: z.string().transform(Number).pipe(z.number()).optional(),
  BACKUP_STORAGE_PATH: z.string().optional(),

  // 合规性配置（必需 - 等保三级标准）
  DATA_RETENTION_DAYS: z.string().transform(Number).pipe(z.number()).default(2555),
  GDPR_COMPLIANCE: z.string().transform(v => v === 'true').optional(),
  PERSONAL_DATA_ENCRYPTION: z.string().transform(v => v === 'true').default(true),
  
  ENABLE_DATA_MASKING: z.string().transform(v => v === 'true').default(true),
  MASK_PHONE_NUMBERS: z.string().transform(v => v === 'true').optional(),
  MASK_ID_NUMBERS: z.string().transform(v => v === 'true').optional(),
  MASK_EMAIL_ADDRESSES: z.string().transform(v => v === 'true').optional(),

  // 功能开关
  FEATURE_AI_ASSISTANT: z.string().transform(v => v === 'true').optional(),
  FEATURE_VIDEO_HEARING: z.string().transform(v => v === 'true').optional(),
  FEATURE_MEDIATION: z.string().transform(v => v === 'true').optional(),
  FEATURE_BATCH_IMPORT: z.string().transform(v => v === 'true').optional(),
  FEATURE_DOCUMENT_GENERATION: z.string().transform(v => v === 'true').optional(),
  FEATURE_EXTERNAL_SYSTEMS: z.string().transform(v => v === 'true').optional(),
  FEATURE_SSO: z.string().transform(v => v === 'true').optional(),

  // 其他配置
  TIMEZONE: z.string().default('Asia/Shanghai'),
  DEFAULT_LANGUAGE: z.string().default('zh-CN'),
  CURRENCY: z.string().default('CNY'),
}).superRefine((env, ctx) => {
  const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build';

  if (env.NODE_ENV === 'production' && !isNextBuild) {
    try {
      const origin = new URL(env.NEXT_PUBLIC_APP_URL).origin;
      if (origin.includes('localhost')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['NEXT_PUBLIC_APP_URL'],
          message: '生产环境禁止使用 localhost 作为应用地址',
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['NEXT_PUBLIC_APP_URL'],
        message: 'NEXT_PUBLIC_APP_URL 必须是合法 URL',
      });
    }

    const knownWeakSecrets = new Set([
      'your-super-secret-jwt-key-change-in-production',
      'your-nextauth-secret-change-in-production',
      '0123456789abcdef0123456789abcdef',
      'default-secret',
      'minioadmin',
      'password',
      'legalmind',
    ]);

    if (knownWeakSecrets.has(env.JWT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: '生产环境禁止使用示例/弱 JWT_SECRET',
      });
    }

    if (knownWeakSecrets.has(env.CSRF_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CSRF_SECRET'],
        message: '生产环境禁止使用示例/弱 CSRF_SECRET',
      });
    }

    if (knownWeakSecrets.has(env.ENCRYPTION_KEY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ENCRYPTION_KEY'],
        message: '生产环境禁止使用示例/弱 ENCRYPTION_KEY',
      });
    }
  }

  if (env.FEATURE_VIDEO_HEARING === true) {
    if (!env.LIVEKIT_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['LIVEKIT_URL'],
        message: '启用视频庭审时必须配置 LIVEKIT_URL',
      });
    }
    if (!env.LIVEKIT_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['LIVEKIT_API_KEY'],
        message: '启用视频庭审时必须配置 LIVEKIT_API_KEY',
      });
    }
    if (!env.LIVEKIT_API_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['LIVEKIT_API_SECRET'],
        message: '启用视频庭审时必须配置 LIVEKIT_API_SECRET',
      });
    }
  }
});

/**
 * 验证环境变量
 * @returns 验证后的环境变量对象
 * @throws 如果验证失败，抛出详细的错误信息
 */
export function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(err => `  - ${err.path.join('.')}: ${err.message}`).join('\n');
      
      logger.error({ missingVars }, '环境变量验证失败');
      logger.error('请检查 .env.local 文件，参考 .env.example 进行配置。');
      
      throw new Error('环境变量验证失败');
    }
    throw error;
  }
}

/**
 * 获取验证后的环境变量
 * 在应用启动时调用一次，缓存结果
 */
let cachedEnv: ReturnType<typeof validateEnv> | null = null;

export function getEnv() {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * 检查环境变量是否已配置
 * @param key 环境变量名称
 * @returns 是否已配置
 */
export function hasEnv(key: string): boolean {
  return !!process.env[key];
}

/**
 * 安全地获取环境变量（不会抛出错误）
 * @param key 环境变量名称
 * @param defaultValue 默认值
 * @returns 环境变量值或默认值
 */
export function getEnvSafe(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * 打印环境配置摘要（用于调试）
 * 注意：不会打印敏感信息
 */
export function printEnvSummary() {
  const env = getEnv();
  
  logger.info(
    {
      nodeEnv: env.NODE_ENV,
      appName: env.NEXT_PUBLIC_APP_NAME,
      appVersion: env.NEXT_PUBLIC_APP_VERSION,
      appUrl: env.NEXT_PUBLIC_APP_URL,
      hasDatabaseUrl: Boolean(env.DATABASE_URL),
      hasRedisUrl: Boolean(env.REDIS_URL),
      auditLogEnabled: Boolean(env.AUDIT_LOG_ENABLED),
      personalDataEncryption: Boolean(env.PERSONAL_DATA_ENCRYPTION),
    },
    '环境配置摘要'
  );
}

// 导出类型
export type Env = ReturnType<typeof validateEnv>;
