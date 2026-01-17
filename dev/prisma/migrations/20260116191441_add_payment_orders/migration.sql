-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('WECHAT', 'ALIPAY');

-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "payer_user_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(50),
    "provider_order_id" VARCHAR(200),
    "provider_transaction_id" VARCHAR(200),
    "idempotency_key" VARCHAR(200),
    "description" VARCHAR(500),
    "failure_reason" VARCHAR(500),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "paid_at" TIMESTAMPTZ,
    "canceled_at" TIMESTAMPTZ,
    "refunded_at" TIMESTAMPTZ,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID,
    "provider" VARCHAR(50) NOT NULL,
    "provider_event_id" VARCHAR(200),
    "event_type" VARCHAR(100) NOT NULL,
    "signature_verified" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "error" VARCHAR(500),
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_orders_case_id_idx" ON "payment_orders"("case_id");

-- CreateIndex
CREATE INDEX "payment_orders_payer_user_id_idx" ON "payment_orders"("payer_user_id");

-- CreateIndex
CREATE INDEX "payment_orders_status_idx" ON "payment_orders"("status");

-- CreateIndex
CREATE INDEX "payment_orders_created_at_idx" ON "payment_orders"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_provider_provider_order_id_key" ON "payment_orders"("provider", "provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_idempotency_key_key" ON "payment_orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_events_order_id_idx" ON "payment_events"("order_id");

-- CreateIndex
CREATE INDEX "payment_events_provider_idx" ON "payment_events"("provider");

-- CreateIndex
CREATE INDEX "payment_events_event_type_idx" ON "payment_events"("event_type");

-- CreateIndex
CREATE INDEX "payment_events_received_at_idx" ON "payment_events"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_provider_event_id_key" ON "payment_events"("provider", "provider_event_id");

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_payer_user_id_fkey" FOREIGN KEY ("payer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "payment_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
