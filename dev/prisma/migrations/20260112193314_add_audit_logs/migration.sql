-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" VARCHAR(20) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "result" VARCHAR(20) NOT NULL,
    "user_id" UUID,
    "user_name" VARCHAR(200),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "resource" VARCHAR(200),
    "action" VARCHAR(200),
    "details" JSONB,
    "error_message" TEXT,
    "signature" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "public"."audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_event_type_idx" ON "public"."audit_logs"("event_type");

-- CreateIndex
CREATE INDEX "audit_logs_level_idx" ON "public"."audit_logs"("level");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs"("user_id");

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
