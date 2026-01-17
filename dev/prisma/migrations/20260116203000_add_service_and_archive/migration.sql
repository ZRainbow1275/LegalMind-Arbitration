-- CreateEnum
CREATE TYPE "ServiceChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ServiceAttemptStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING', 'NOT_IMPLEMENTED', 'SERVICE_NOT_CONFIGURED');

-- CreateEnum
CREATE TYPE "ArchiveStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "service_of_process" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "document_id" UUID,
    "channel" "ServiceChannel" NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'PENDING',
    "recipient_name" VARCHAR(200),
    "recipient_email" VARCHAR(255),
    "recipient_phone" VARCHAR(20),
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT,
    "legal_basis" VARCHAR(200),
    "requested_by_user_id" UUID,
    "trace_id" VARCHAR(64),
    "delivered_at" TIMESTAMPTZ,
    "effective_at" TIMESTAMPTZ,
    "last_error" TEXT,
    "proof_hash" VARCHAR(64),
    "proof_generated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "service_of_process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "channel" "ServiceChannel" NOT NULL,
    "status" "ServiceAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(50),
    "provider_message_id" VARCHAR(200),
    "metadata" JSONB,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archive_packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "status" "ArchiveStatus" NOT NULL DEFAULT 'PENDING',
    "created_by_user_id" UUID,
    "trace_id" VARCHAR(64),
    "bucket" VARCHAR(255),
    "object_key" TEXT,
    "file_name" VARCHAR(255),
    "content_type" VARCHAR(100),
    "size" BIGINT,
    "sha256" VARCHAR(64),
    "manifest" JSONB,
    "manifest_hash" VARCHAR(64),
    "error" TEXT,
    "completed_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "archive_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_of_process_case_id_idx" ON "service_of_process"("case_id");

-- CreateIndex
CREATE INDEX "service_of_process_document_id_idx" ON "service_of_process"("document_id");

-- CreateIndex
CREATE INDEX "service_of_process_status_idx" ON "service_of_process"("status");

-- CreateIndex
CREATE INDEX "service_of_process_channel_idx" ON "service_of_process"("channel");

-- CreateIndex
CREATE INDEX "service_of_process_created_at_idx" ON "service_of_process"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "service_attempts_service_id_attempt_number_key" ON "service_attempts"("service_id", "attempt_number");

-- CreateIndex
CREATE INDEX "service_attempts_service_id_idx" ON "service_attempts"("service_id");

-- CreateIndex
CREATE INDEX "service_attempts_status_idx" ON "service_attempts"("status");

-- CreateIndex
CREATE INDEX "service_attempts_created_at_idx" ON "service_attempts"("created_at");

-- CreateIndex
CREATE INDEX "archive_packages_case_id_idx" ON "archive_packages"("case_id");

-- CreateIndex
CREATE INDEX "archive_packages_status_idx" ON "archive_packages"("status");

-- CreateIndex
CREATE INDEX "archive_packages_created_at_idx" ON "archive_packages"("created_at");

-- AddForeignKey
ALTER TABLE "service_of_process" ADD CONSTRAINT "service_of_process_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_of_process" ADD CONSTRAINT "service_of_process_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "case_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_of_process" ADD CONSTRAINT "service_of_process_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_attempts" ADD CONSTRAINT "service_attempts_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_of_process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_packages" ADD CONSTRAINT "archive_packages_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_packages" ADD CONSTRAINT "archive_packages_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
