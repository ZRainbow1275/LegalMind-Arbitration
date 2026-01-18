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
  provider: 'aliyun' | 'tencent' | 'twilio';
  requestId?: string;
  bizId?: string;
};

type AliyunSmsResponse = {
  RequestId?: string;
  BizId?: string;
  Code?: string;
  Message?: string;
};

type TencentSmsSendStatus = {
  SerialNo?: string;
  PhoneNumber?: string;
  Fee?: number;
  SessionContext?: string;
  Code?: string;
  Message?: string;
};

type TencentSmsResponse = {
  Response?: {
    RequestId?: string;
    SendStatusSet?: TencentSmsSendStatus[];
    Error?: { Code?: string; Message?: string };
  };
};

type TwilioMessageResponse = {
  sid?: string;
  status?: string;
  error_code?: number | null;
  error_message?: string | null;
  message?: string;
  code?: number;
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

function normalizeE164(phone: string): string {
  const trimmed = phone.trim().replace(/[\s-]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (/^86\d{11}$/.test(trimmed)) return `+${trimmed}`;
  if (/^1\d{10}$/.test(trimmed)) return `+86${trimmed}`;
  return trimmed;
}

function sha256Hex(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function hmacSha256(key: Buffer | string, msg: string): Buffer {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function hmacSha256Hex(key: Buffer | string, msg: string): string {
  return crypto.createHmac('sha256', key).update(msg).digest('hex');
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

async function sendTencentSms(input: SendSmsInput): Promise<SendSmsResult> {
  const env = getEnv();

  if (!env.TENCENT_SECRET_ID || !env.TENCENT_SECRET_KEY) {
    throw new Error('SERVICE_NOT_CONFIGURED');
  }
  if (!env.TENCENT_SMS_SDK_APP_ID) {
    throw new Error('SERVICE_NOT_CONFIGURED');
  }
  const signName = env.SMS_SIGN_NAME?.trim();
  if (!signName) throw new Error('SERVICE_NOT_CONFIGURED');

  const templateId = (input.templateCode ?? env.SMS_TEMPLATE_CODE)?.trim();
  if (!templateId) throw new Error('SERVICE_NOT_CONFIGURED');

  const region = (env.TENCENT_SMS_REGION ?? env.TENCENT_OCR_REGION ?? 'ap-guangzhou').trim();
  const phone = normalizeE164(input.to);
  const templateParams = Object.values(input.templateParams);

  const bodyObject: Record<string, unknown> = {
    PhoneNumberSet: [phone],
    SmsSdkAppId: env.TENCENT_SMS_SDK_APP_ID,
    SignName: signName,
    TemplateId: templateId,
    TemplateParamSet: templateParams,
  };
  if (input.outId) bodyObject.SessionContext = input.outId;
  const body = JSON.stringify(bodyObject);

  const host = 'sms.tencentcloudapi.com';
  const service = 'sms';
  const action = 'SendSms';
  const version = '2021-01-11';
  const timestamp = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    throw new Error('TENCENT_SMS_INVALID_TIMESTAMP');
  }
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';
  const hashedRequestPayload = sha256Hex(body);
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = sha256Hex(canonicalRequest);
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  const secretDate = hmacSha256(`TC3${env.TENCENT_SECRET_KEY}`, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = hmacSha256Hex(secretSigning, stringToSign);

  const authorization = `${algorithm} Credential=${env.TENCENT_SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json; charset=utf-8',
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Region': region,
    },
    body,
  });

  const json: unknown = await res.json().catch(() => null);
  const parsed = z
    .object({
      Response: z
        .object({
          RequestId: z.string().optional(),
          SendStatusSet: z
            .array(
              z
                .object({
                  SerialNo: z.string().optional(),
                  PhoneNumber: z.string().optional(),
                  Fee: z.number().optional(),
                  SessionContext: z.string().optional(),
                  Code: z.string().optional(),
                  Message: z.string().optional(),
                })
                .passthrough()
            )
            .optional(),
          Error: z
            .object({ Code: z.string().optional(), Message: z.string().optional() })
            .optional(),
        })
        .optional(),
    })
    .passthrough()
    .safeParse(json);

  if (!res.ok) {
    const message = parsed.success ? parsed.data.Response?.Error?.Message ?? '' : '';
    const code = parsed.success ? parsed.data.Response?.Error?.Code ?? '' : '';
    const suffix = `${code} ${message}`.trim();
    throw new Error(`SMS_UPSTREAM_ERROR_${res.status}${suffix ? `: ${suffix}` : ''}`.slice(0, 500));
  }

  if (!parsed.success) {
    throw new Error('SMS_UPSTREAM_INVALID_RESPONSE');
  }

  const bodyData: TencentSmsResponse = parsed.data;
  const response = bodyData.Response;
  if (!response) {
    throw new Error('SMS_UPSTREAM_INVALID_RESPONSE');
  }

  if (response.Error?.Code) {
    throw new Error(
      `SMS_PROVIDER_ERROR_${response.Error.Code}: ${response.Error.Message || '发送短信失败'}`.slice(0, 500)
    );
  }

  const status = response.SendStatusSet?.[0];
  const statusCode = (status?.Code ?? '').toLowerCase();
  if (!status || statusCode !== 'ok') {
    const code = status?.Code || 'UNKNOWN';
    const message = status?.Message || '发送短信失败';
    throw new Error(`SMS_PROVIDER_ERROR_${code}: ${message}`.slice(0, 500));
  }

  return {
    provider: 'tencent',
    requestId: response.RequestId,
    bizId: status.SerialNo,
  };
}

function isTwilioContentSid(value: string): boolean {
  return /^HX[a-zA-Z0-9]{8,}$/.test(value);
}

function renderSmsTemplate(template: string, params: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(params)) {
    const safeValue = value ?? '';
    rendered = rendered.replaceAll(`{{${key}}}`, safeValue);
    rendered = rendered.replaceAll(`{${key}}`, safeValue);
  }
  return rendered;
}

async function sendTwilioSms(input: SendSmsInput): Promise<SendSmsResult> {
  const env = getEnv();
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = env.TWILIO_AUTH_TOKEN?.trim();
  if (!accountSid || !authToken) throw new Error('SERVICE_NOT_CONFIGURED');

  const from = env.TWILIO_FROM?.trim() || null;
  const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID?.trim() || null;
  if (!from && !messagingServiceSid) throw new Error('SERVICE_NOT_CONFIGURED');

  const template = (input.templateCode ?? env.SMS_TEMPLATE_CODE)?.trim();
  if (!template) throw new Error('SERVICE_NOT_CONFIGURED');

  const to = normalizeE164(input.to);
  const params = new URLSearchParams();
  params.set('To', to);

  if (messagingServiceSid) {
    params.set('MessagingServiceSid', messagingServiceSid);
  } else if (from) {
    params.set('From', from);
  }

  if (isTwilioContentSid(template)) {
    params.set('ContentSid', template);
    params.set('ContentVariables', JSON.stringify(input.templateParams));
  } else {
    params.set('Body', renderSmsTemplate(template, input.templateParams));
  }

  const authorization = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authorization}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  const json: unknown = await res.json().catch(() => null);
  const parsed = z
    .object({
      sid: z.string().optional(),
      status: z.string().optional(),
      error_code: z.number().nullable().optional(),
      error_message: z.string().nullable().optional(),
      message: z.string().optional(),
      code: z.number().optional(),
    })
    .passthrough()
    .safeParse(json);

  if (!res.ok) {
    const message = parsed.success ? parsed.data.message || parsed.data.error_message || '' : '';
    const code = parsed.success ? parsed.data.code || parsed.data.error_code || '' : '';
    const suffix = `${code} ${message}`.trim();
    throw new Error(`SMS_UPSTREAM_ERROR_${res.status}${suffix ? `: ${suffix}` : ''}`.slice(0, 500));
  }

  if (!parsed.success || !parsed.data.sid) {
    throw new Error('SMS_UPSTREAM_INVALID_RESPONSE');
  }

  const bodyData: TwilioMessageResponse = parsed.data;
  if (bodyData.error_code) {
    throw new Error(
      `SMS_PROVIDER_ERROR_${bodyData.error_code}: ${bodyData.error_message || '发送短信失败'}`.slice(0, 500)
    );
  }

  return { provider: 'twilio', requestId: bodyData.sid, bizId: bodyData.sid };
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
        return await sendTencentSms(input);
      case 'twilio':
        return await sendTwilioSms(input);
      default:
        throw new Error('SERVICE_NOT_CONFIGURED');
    }
  } catch (error) {
    logger.error({ err: error, provider: env.SMS_PROVIDER }, '发送短信失败');   
    throw error;
  }
}
