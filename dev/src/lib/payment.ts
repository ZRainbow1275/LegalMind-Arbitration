// dev/src/lib/payment.ts
// 支付子系统：订单、回调验签、状态机映射（禁止 Mock：未配置必须显式失败）。
import crypto from 'crypto';
import { z } from 'zod';
import { getEnv } from '@/lib/env-validator';
import { PaymentMethod, PaymentOrderStatus, Prisma } from '@/generated/prisma';

export const paymentMethodInputSchema = z
  .string()
  .min(1)
  .max(50)
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.enum(['wechat', 'alipay']));

export type PaymentMethodInput = z.infer<typeof paymentMethodInputSchema>;

export function toPaymentMethod(method: PaymentMethodInput): PaymentMethod {
  switch (method) {
    case 'wechat':
      return PaymentMethod.WECHAT;
    case 'alipay':
      return PaymentMethod.ALIPAY;
  }
}

export function toDecimalAmountString(value: unknown): string {
  const schema = z
    .union([
      z.number().finite(),
      z.string().min(1).max(50),
    ])
    .transform((raw) => {
      if (typeof raw === 'number') {
        if (!Number.isFinite(raw)) throw new Error('INVALID_AMOUNT');
        return raw.toFixed(2);
      }
      const trimmed = raw.trim();
      if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) throw new Error('INVALID_AMOUNT');
      const [intPart, fracPart] = trimmed.split('.');
      const normalizedFrac = (fracPart ?? '').padEnd(2, '0');
      return `${intPart}.${normalizedFrac}`;
    });

  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error('INVALID_AMOUNT');

  // Ensure Decimal can parse it
  // eslint-disable-next-line no-new
  new Prisma.Decimal(parsed.data);
  return parsed.data;
}

export function areDecimalsEqual(a: Prisma.Decimal, b: Prisma.Decimal): boolean {
  return a.equals(b);
}

export type PaymentWebhookSignatureCheck = {
  ok: boolean;
  reason?:
    | 'PAYMENT_WEBHOOK_SECRET_NOT_CONFIGURED'
    | 'MISSING_SIGNATURE'
    | 'MISSING_TIMESTAMP'
    | 'INVALID_SIGNATURE';
  timestamp?: string;
};

function normalizeSignature(signature: string): string {
  const trimmed = signature.trim();
  if (trimmed.startsWith('sha256=')) return trimmed.slice('sha256='.length);
  return trimmed;
}

export function verifyPaymentWebhookSignature(params: {
  signatureHeader: string | null;
  timestampHeader: string | null;
  rawBody: string;
}): PaymentWebhookSignatureCheck {
  const env = getEnv();
  if (!env.PAYMENT_WEBHOOK_SECRET) {
    return { ok: false, reason: 'PAYMENT_WEBHOOK_SECRET_NOT_CONFIGURED' };
  }

  const signature = params.signatureHeader;
  if (!signature) return { ok: false, reason: 'MISSING_SIGNATURE' };
  const timestamp = params.timestampHeader;
  if (!timestamp) return { ok: false, reason: 'MISSING_TIMESTAMP' };

  const material = `${timestamp}.${params.rawBody}`;
  const expected = crypto
    .createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET)
    .update(material)
    .digest('hex');

  const received = normalizeSignature(signature);

  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(received, 'hex');
    if (expectedBuf.length !== receivedBuf.length) {
      return { ok: false, reason: 'INVALID_SIGNATURE' };
    }
    const ok = crypto.timingSafeEqual(expectedBuf, receivedBuf);
    if (!ok) return { ok: false, reason: 'INVALID_SIGNATURE' };
    return { ok: true, timestamp };
  } catch {
    return { ok: false, reason: 'INVALID_SIGNATURE' };
  }
}

export const paymentWebhookPayloadSchema = z
  .object({
    orderId: z.string().uuid(),
    eventId: z.string().min(1).max(200).optional(),
    status: z
      .string()
      .min(1)
      .max(50)
      .transform((v) => v.trim().toLowerCase())
      .pipe(z.enum(['pending', 'processing', 'paid', 'failed', 'canceled', 'refunded'])),
    paymentMethod: paymentMethodInputSchema.optional(),
    transactionId: z.string().min(1).max(200).optional(),
    paidAt: z.string().datetime().optional(),
    amount: z.union([z.number().finite(), z.string().min(1).max(50)]).optional(),
    currency: z.string().length(3).optional(),
    raw: z.unknown().optional(),
  })
  .strict();

export type PaymentWebhookPayload = z.infer<typeof paymentWebhookPayloadSchema>;

export function toPaymentOrderStatus(status: PaymentWebhookPayload['status']): PaymentOrderStatus {
  switch (status) {
    case 'pending':
      return PaymentOrderStatus.PENDING;
    case 'processing':
      return PaymentOrderStatus.PROCESSING;
    case 'paid':
      return PaymentOrderStatus.PAID;
    case 'failed':
      return PaymentOrderStatus.FAILED;
    case 'canceled':
      return PaymentOrderStatus.CANCELED;
    case 'refunded':
      return PaymentOrderStatus.REFUNDED;
  }
}

export function isTerminalPaymentStatus(status: PaymentOrderStatus): boolean {
  return (
    status === PaymentOrderStatus.PAID
    || status === PaymentOrderStatus.FAILED
    || status === PaymentOrderStatus.CANCELED
    || status === PaymentOrderStatus.REFUNDED
  );
}

export function getIdempotencyKey(headers: Headers): string | null {
  const key =
    headers.get('idempotency-key')
    || headers.get('x-idempotency-key')
    || headers.get('x-request-id')
    || headers.get('x-trace-id');
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 200);
}

