// dev/src/app/api/external/payment/webhook/route.ts
// 支付回调（Webhook）：验签 → 记录事件 → 更新订单 → 驱动案件缴费状态
//
// 约定：
// - Header: x-payment-timestamp + x-payment-signature
// - Signature: HMAC-SHA256(secret, `${timestamp}.${rawBody}`) ，hex，可带 `sha256=` 前缀
// - Secret: PAYMENT_WEBHOOK_SECRET（未配置则拒绝处理）
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { getTraceId, appendCaseEvent } from '@/lib/case-events';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { getEnv } from '@/lib/env-validator';
import {
  paymentWebhookPayloadSchema,
  toDecimalAmountString,
  toPaymentOrderStatus,
  verifyPaymentWebhookSignature,
} from '@/lib/payment';
import { PaymentOrderStatus, Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

function sanitizeProvider(value: string | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return 'generic';
  return raw.slice(0, 50);
}

function computeEventId(timestampHeader: string | null, rawBody: string): string {
  const material = `${timestampHeader ?? ''}.${rawBody}`;
  return crypto.createHash('sha256').update(material).digest('hex');
}

function canTransition(from: PaymentOrderStatus, to: PaymentOrderStatus): boolean {
  if (from === to) return true;
  switch (from) {
    case PaymentOrderStatus.PENDING:
      return (
        to === PaymentOrderStatus.PROCESSING
        || to === PaymentOrderStatus.PAID
        || to === PaymentOrderStatus.FAILED
        || to === PaymentOrderStatus.CANCELED
      );
    case PaymentOrderStatus.PROCESSING:
      return (
        to === PaymentOrderStatus.PAID
        || to === PaymentOrderStatus.FAILED
        || to === PaymentOrderStatus.CANCELED
      );
    case PaymentOrderStatus.PAID:
      return to === PaymentOrderStatus.REFUNDED;
    case PaymentOrderStatus.FAILED:
    case PaymentOrderStatus.CANCELED:
    case PaymentOrderStatus.REFUNDED:
      return false;
  }
}

async function recordPaymentEvent(params: {
  provider: string;
  providerEventId: string;
  eventType: string;
  signatureVerified: boolean;
  orderId: string | null;
  payload: unknown;
  error?: string;
}) {
  try {
    return await prisma.paymentEvent.create({
      data: {
        provider: params.provider,
        providerEventId: params.providerEventId,
        eventType: params.eventType,
        signatureVerified: params.signatureVerified,
        orderId: params.orderId ?? undefined,
        payload: params.payload as Prisma.InputJsonValue,
        error: params.error,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return null;
    }
    logger.error({ err: error }, 'paymentEvent 写入失败');
    return null;
  }
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const env = getEnv();
    if (!env.PAYMENT_WEBHOOK_SECRET) {
      return ErrorResponses.SERVICE_NOT_CONFIGURED('支付回调验签密钥');
    }

    const rawBody = await request.text();
    const provider = sanitizeProvider(request.headers.get('x-payment-provider'));

    const signatureCheck = verifyPaymentWebhookSignature({
      signatureHeader: request.headers.get('x-payment-signature'),
      timestampHeader: request.headers.get('x-payment-timestamp'),
      rawBody,
    });

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      await recordPaymentEvent({
        provider,
        providerEventId: computeEventId(request.headers.get('x-payment-timestamp'), rawBody),
        eventType: 'payment.webhook.invalid_json',
        signatureVerified: signatureCheck.ok,
        orderId: null,
        payload: { raw: rawBody.slice(0, 2000), traceId },
        error: 'INVALID_JSON',
      });
      return ErrorResponses.BAD_REQUEST_MESSAGE('无效的 JSON');
    }

    const parsed = paymentWebhookPayloadSchema.safeParse(parsedJson);
    if (!parsed.success) {
      await recordPaymentEvent({
        provider,
        providerEventId: computeEventId(request.headers.get('x-payment-timestamp'), rawBody),
        eventType: 'payment.webhook.invalid_payload',
        signatureVerified: signatureCheck.ok,
        orderId: null,
        payload: { traceId, issues: parsed.error.issues },
        error: 'INVALID_PAYLOAD',
      });
      return ErrorResponses.BAD_REQUEST_MESSAGE('无效的回调载荷', parsed.error.issues);
    }

    const payload = parsed.data;
    const providerEventId = payload.eventId ?? computeEventId(signatureCheck.timestamp ?? null, rawBody);

    await AuditLogger.log({
      level: signatureCheck.ok ? AuditLevel.INFO : AuditLevel.WARNING,
      eventType: AuditEventType.PAYMENT_WEBHOOK_RECEIVED,
      resource: 'external/payment/webhook',
      action: provider,
      details: {
        traceId,
        provider,
        providerEventId,
        signatureOk: signatureCheck.ok,
        signatureReason: signatureCheck.ok ? null : signatureCheck.reason,
        orderId: payload.orderId,
        status: payload.status,
      },
      result: signatureCheck.ok ? 'SUCCESS' : 'FAILURE',
      errorMessage: signatureCheck.ok ? undefined : signatureCheck.reason,
    });

    // 即使验签失败，也记录事件但不修改订单。
    const order = await prisma.paymentOrder.findUnique({
      where: { id: payload.orderId },
      select: {
        id: true,
        caseId: true,
        amount: true,
        currency: true,
        status: true,
        providerTransactionId: true,
      },
    });

    await recordPaymentEvent({
      provider,
      providerEventId,
      eventType: `payment.${payload.status}`,
      signatureVerified: signatureCheck.ok,
      orderId: order?.id ?? null,
      payload: {
        ...payload,
        traceId,
        signature: {
          ok: signatureCheck.ok,
          reason: signatureCheck.ok ? null : signatureCheck.reason,
          timestamp: signatureCheck.timestamp ?? null,
        },
        raw: payload.raw ?? null,
      },
      error: signatureCheck.ok ? undefined : signatureCheck.reason,
    });

    if (!signatureCheck.ok) {
      return ErrorResponses.UNAUTHORIZED_MESSAGE('支付回调验签失败', {
        traceId,
        reason: signatureCheck.reason,
      });
    }

    if (!order) {
      return ErrorResponses.NOT_FOUND('支付订单');
    }

    // 金额与币种一致性校验（防止回调串单）
    if (payload.amount) {
      const amountStr = toDecimalAmountString(payload.amount);
      const incoming = new Prisma.Decimal(amountStr);
      if (!order.amount.equals(incoming)) {
        return ErrorResponses.RESOURCE_CONFLICT('回调金额与订单金额不一致');
      }
    }
    if (payload.currency && payload.currency !== order.currency) {
      return ErrorResponses.RESOURCE_CONFLICT('回调币种与订单币种不一致');
    }

    const nextStatus = toPaymentOrderStatus(payload.status);
    if (!canTransition(order.status, nextStatus)) {
      return ErrorResponses.RESOURCE_CONFLICT(`不允许的订单状态迁移：${order.status} -> ${nextStatus}`);
    }

    const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          provider: provider,
          providerTransactionId: payload.transactionId ?? order.providerTransactionId,
          paidAt: nextStatus === PaymentOrderStatus.PAID ? paidAt : undefined,
          canceledAt: nextStatus === PaymentOrderStatus.CANCELED ? new Date() : undefined,
          refundedAt: nextStatus === PaymentOrderStatus.REFUNDED ? new Date() : undefined,
          failureReason: nextStatus === PaymentOrderStatus.FAILED ? 'PAYMENT_FAILED' : undefined,
        },
      });

      if (nextStatus === PaymentOrderStatus.PAID) {
        await tx.arbitrationCase.update({
          where: { id: order.caseId },
          data: { feePaid: true, feePaidAt: paidAt },
        });
      }

      await appendCaseEvent(
        {
          caseId: order.caseId,
          eventType: nextStatus === PaymentOrderStatus.PAID ? 'PAYMENT_CONFIRMED' : 'PAYMENT_STATUS_UPDATED',
          traceId,
          payload: {
            orderId: order.id,
            status: nextStatus,
            provider,
            providerEventId,
            transactionId: payload.transactionId ?? null,
            paidAt: nextStatus === PaymentOrderStatus.PAID ? paidAt.toISOString() : null,
          },
        },
        tx
      );

      return updatedOrder;
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.PAYMENT_ORDER_STATUS_CHANGED,
      resource: 'payment',
      action: 'webhook_update',
      details: {
        traceId,
        provider,
        providerEventId,
        orderId: updated.id,
        caseId: updated.caseId,
        status: updated.status,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        ok: true,
        orderId: updated.id,
        caseId: updated.caseId,
        status: updated.status,
        traceId,
      },
      '回调处理完成'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '支付回调处理失败');
    return ErrorResponses.INTERNAL_ERROR();
  }
}

export async function GET() {
  return ErrorResponses.METHOD_NOT_ALLOWED();
}
