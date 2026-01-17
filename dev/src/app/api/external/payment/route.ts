// dev/src/app/api/external/payment/route.ts
// 支付接口：对齐 docs/API_REFERENCE.md 的 POST /api/external/payment
//
// 说明：
// - 禁止“模拟成功”。必须落库订单，并依赖回调验签驱动状态变化。
// - 回调端点：POST /api/external/payment/webhook（HMAC-SHA256，见 PAYMENT_WEBHOOK_SECRET）
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser, PermissionCheckers } from '@/lib/auth';
import { validateRequestBody } from '@/lib/validation';
import { createSuccessResponse, ErrorResponses } from '@/lib/api-response';
import { AuditEventType, AuditLevel, AuditLogger } from '@/lib/security/audit-logger';
import { appendCaseEvent, getTraceId } from '@/lib/case-events';
import { getEnv } from '@/lib/env-validator';
import { getArbitrationFeeCalculator } from '@/lib/arbitration-fee';
import {
  getIdempotencyKey,
  paymentMethodInputSchema,
  toDecimalAmountString,
  toPaymentMethod,
} from '@/lib/payment';
import { PaymentOrderStatus, Prisma } from '@/generated/prisma';
import { logger } from '@/lib/logger';

const paymentRequestSchema = z
  .object({
    caseId: z.string().uuid(),
    amount: z.union([z.number().finite(), z.string().min(1).max(50)]),
    paymentMethod: paymentMethodInputSchema,
  })
  .strict();

function toMoneyString(amount: Prisma.Decimal): string {
  return amount.toFixed(2);
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request.headers);
  try {
    const env = getEnv();
    if (!env.PAYMENT_WEBHOOK_SECRET) {
      return ErrorResponses.SERVICE_NOT_CONFIGURED('支付回调验签密钥');
    }

    const guard = await requireAuthenticatedUser(request, { csrf: true });
    if (!guard.ok) return guard.response;
    const authUser = guard.user;

    const validation = await validateRequestBody(request, paymentRequestSchema);
    if (!validation.success) return validation.error;

    const { caseId, amount, paymentMethod } = validation.data;

    const arbitrationCase = await prisma.arbitrationCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        caseType: true,
        currency: true,
        disputeAmount: true,
        arbitrationFee: true,
        feePaid: true,
        feePaidAt: true,
        applicantId: true,
        respondentId: true,
        participants: { select: { userId: true, isActive: true } },
      },
    });

    if (!arbitrationCase) return ErrorResponses.NOT_FOUND('案件');

    const hasAccess =
      PermissionCheckers.canViewAllCases(authUser)
      || arbitrationCase.applicantId === authUser.id
      || arbitrationCase.respondentId === authUser.id
      || arbitrationCase.participants.some((p) => p.userId === authUser.id && p.isActive);

    if (!hasAccess) return ErrorResponses.FORBIDDEN();

    if (arbitrationCase.feePaid) {
      return ErrorResponses.RESOURCE_CONFLICT('案件费用已缴纳，无需重复支付');
    }

    const requestedAmount = new Prisma.Decimal(toDecimalAmountString(amount));

    const calculator = getArbitrationFeeCalculator();
    const computedFee =
      arbitrationCase.arbitrationFee
      ?? (arbitrationCase.disputeAmount
        ? new Prisma.Decimal(
          calculator.calculate({
            disputeAmount: arbitrationCase.disputeAmount.toNumber(),
            caseType: arbitrationCase.caseType,
            currency: arbitrationCase.currency,
          }).fee
        )
        : null);

    if (!computedFee) {
      return ErrorResponses.BAD_REQUEST_MESSAGE(
        '案件费用未计算，且缺少争议金额，无法发起支付',
        { traceId }
      );
    }

    if (!requestedAmount.equals(computedFee)) {
      return ErrorResponses.RESOURCE_CONFLICT(
        `支付金额与应缴费用不一致，应缴：${toMoneyString(computedFee)} ${arbitrationCase.currency}`
      );
    }

    const idempotencyKey = getIdempotencyKey(request.headers) ?? traceId;

    const order = await prisma.$transaction(async (tx) => {
      const existingByKey = idempotencyKey
        ? await tx.paymentOrder.findUnique({ where: { idempotencyKey } })
        : null;
      if (existingByKey) return existingByKey;

      const activeOrder = await tx.paymentOrder.findFirst({
        where: {
          caseId,
          status: { in: [PaymentOrderStatus.PENDING, PaymentOrderStatus.PROCESSING] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (activeOrder) return activeOrder;

      if (!arbitrationCase.arbitrationFee) {
        await tx.arbitrationCase.update({
          where: { id: caseId },
          data: { arbitrationFee: computedFee },
        });
      }

      const created = await tx.paymentOrder.create({
        data: {
          caseId,
          payerUserId: authUser.id,
          amount: computedFee,
          currency: arbitrationCase.currency,
          paymentMethod: toPaymentMethod(paymentMethod),
          status: PaymentOrderStatus.PENDING,
          idempotencyKey,
          description: `仲裁费(${arbitrationCase.caseNumber})`,
          metadata: {
            traceId,
            feeRuleVersion: calculator.calculate({
              disputeAmount: arbitrationCase.disputeAmount?.toNumber() ?? 0,
              caseType: arbitrationCase.caseType,
              currency: arbitrationCase.currency,
            }).ruleVersion,
          },
        },
      });

      await appendCaseEvent(
        {
          caseId,
          eventType: 'PAYMENT_ORDER_CREATED',
          actorUserId: authUser.id,
          traceId,
          payload: {
            orderId: created.id,
            amount: toMoneyString(created.amount),
            currency: created.currency,
            paymentMethod: paymentMethod,
            status: created.status,
          },
        },
        tx
      );

      return created;
    });

    await AuditLogger.log({
      level: AuditLevel.INFO,
      eventType: AuditEventType.PAYMENT_ORDER_CREATED,
      userId: authUser.id,
      userName: authUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'external/payment',
      action: 'create_order',
      details: {
        traceId,
        caseId,
        orderId: order.id,
        amount: toMoneyString(order.amount),
        currency: order.currency,
        paymentMethod,
        status: order.status,
      },
      result: 'SUCCESS',
    });

    return createSuccessResponse(
      {
        order: {
          id: order.id,
          caseId: order.caseId,
          amount: toMoneyString(order.amount),
          currency: order.currency,
          paymentMethod: paymentMethod,
          status: order.status,
          createdAt: order.createdAt,
        },
        nextAction: {
          type: 'WEBHOOK_CONFIRM',
          webhookPath: '/api/external/payment/webhook',
          signature: {
            algorithm: 'HMAC-SHA256',
            headerName: 'x-payment-signature',
            timestampHeaderName: 'x-payment-timestamp',
            format: 'sha256=<hex>',
          },
        },
        traceId,
      },
      '支付订单已创建'
    );
  } catch (error) {
    logger.error({ err: error, traceId }, '创建支付订单失败');

    await AuditLogger.log({
      level: AuditLevel.ERROR,
      eventType: AuditEventType.PAYMENT_ORDER_CREATED,
      userId: undefined,
      userName: undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      resource: 'external/payment',
      action: 'create_order',
      details: {
        traceId,
        error: error instanceof Error ? error.message : String(error),
      },
      result: 'FAILURE',
      errorMessage: error instanceof Error ? error.message : String(error),
    });

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

