import nodemailer, { type Transporter } from 'nodemailer';

import { getEnv } from '@/lib/env-validator';

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  fromName: string;
  fromEmail: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
};

export type SendEmailResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response?: string;
};

let cachedTransporter: Transporter | null = null;
let cachedTransporterKey: string | null = null;

export function getSmtpConfig(): SmtpConfig | null {
  const env = getEnv();

  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_FROM_EMAIL) {
    return null;
  }

  const fromName = env.SMTP_FROM_NAME || env.NEXT_PUBLIC_APP_NAME || 'LegalMind仲裁平台';

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromName,
    fromEmail: env.SMTP_FROM_EMAIL,
  };
}

function getTransporter(config: SmtpConfig): Transporter {
  const key = JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user ?? null,
  });

  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }

  cachedTransporterKey = key;
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user && config.password
        ? { user: config.user, pass: config.password }
        : undefined,
  });

  return cachedTransporter;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error('SERVICE_NOT_CONFIGURED');
  }

  const transporter = getTransporter(config);
  const info = await transporter.sendMail({
    from: { name: config.fromName, address: config.fromEmail },
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    headers: input.headers,
  });

  return {
    messageId: info.messageId,
    accepted: (info.accepted ?? []).map(String),
    rejected: (info.rejected ?? []).map(String),
    response: typeof info.response === 'string' ? info.response : undefined,
  };
}

