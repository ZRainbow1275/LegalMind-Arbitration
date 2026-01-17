import crypto from 'crypto';
import { z } from 'zod';
import { getEnv } from '@/lib/env-validator';
import { logger } from '@/lib/logger';

export type SendSmsInput = {
  to: string;
  templateParams: Record<string, string>;
  templateCode?: string;
  outId?: string;
};

export type SendSmsResult = {
  provider: 'aliyun';
  requestId?: string;
  bizId?: string;
};

type AliyunSmsResponse = {
  RequestId?: string;
  BizId?: string;
  Code?: string;
  Message?: string;
};

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

function buildCanonicalizedQuery(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key] ?? '')}`)
    .join('&');
}

function signAliyunQuery(params: Record<string, string>, accessKeySecret: string): string {
  const canonicalizedQueryString = buildCanonicalizedQuery(params);
  const stringToSign = `GET&%2F&${percentEncode(canonicalizedQueryString)}`;
  return crypto
    .createHmac('sha1', `${accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');
}

function normalizeChinaMobile(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+86')) return trimmed.slice(3);
  return trimmed;
}

async function sendAliyunSms(input: SendSmsInput): Promise<SendSmsResult> {     
  const env = getEnv();

  if (
    !env.SMS_ACCESS_KEY_ID
    || !env.SMS_ACCESS_KEY_SECRET
    || !env.SMS_SIGN_NAME
  ) {
    throw new Error('SERVICE_NOT_CONFIGURED');
  }

  const templateCode = (input.templateCode ?? env.SMS_TEMPLATE_CODE)?.trim();  
  if (!templateCode) throw new Error('SERVICE_NOT_CONFIGURED');

  const phone = normalizeChinaMobile(input.to);
  const nonce = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const params: Record<string, string> = {
    AccessKeyId: env.SMS_ACCESS_KEY_ID,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: phone,
    RegionId: 'cn-hangzhou',
    SignName: env.SMS_SIGN_NAME,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: nonce,
    SignatureVersion: '1.0',
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify(input.templateParams),
    Timestamp: timestamp,
    Version: '2017-05-25',
  };

  if (input.outId) params.OutId = input.outId;

  const signature = signAliyunQuery(params, env.SMS_ACCESS_KEY_SECRET);
  params.Signature = signature;

  const query = buildCanonicalizedQuery(params);
  const url = `https://dysmsapi.aliyuncs.com/?${query}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const json: unknown = await res.json().catch(() => null);
  const parsed = z
    .object({
      RequestId: z.string().optional(),
      BizId: z.string().optional(),
      Code: z.string().optional(),
      Message: z.string().optional(),
    })
    .passthrough()
    .safeParse(json);

  if (!res.ok) {
    const message = parsed.success ? `${parsed.data.Code ?? ''} ${parsed.data.Message ?? ''}`.trim() : '';
    throw new Error(`SMS_UPSTREAM_ERROR_${res.status}${message ? `: ${message}` : ''}`.slice(0, 500));
  }

  if (!parsed.success) {
    throw new Error('SMS_UPSTREAM_INVALID_RESPONSE');
  }

  const body: AliyunSmsResponse = parsed.data;
  if ((body.Code ?? '').toUpperCase() !== 'OK') {
    const code = body.Code || 'UNKNOWN';
    const message = body.Message || '发送短信失败';
    throw new Error(`SMS_PROVIDER_ERROR_${code}: ${message}`.slice(0, 500));
  }

  return {
    provider: 'aliyun',
    requestId: body.RequestId,
    bizId: body.BizId,
  };
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const env = getEnv();
  if (!env.SMS_PROVIDER) {
    throw new Error('SERVICE_NOT_CONFIGURED');
  }

  try {
    switch (env.SMS_PROVIDER) {
      case 'aliyun':
        return await sendAliyunSms(input);
      case 'tencent':
      case 'twilio':
        throw new Error('NOT_IMPLEMENTED');
      default:
        throw new Error('NOT_IMPLEMENTED');
    }
  } catch (error) {
    logger.error({ err: error, provider: env.SMS_PROVIDER }, '发送短信失败');
    throw error;
  }
}
