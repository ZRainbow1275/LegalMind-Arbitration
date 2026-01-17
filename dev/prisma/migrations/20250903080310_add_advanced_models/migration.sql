-- CreateEnum
CREATE TYPE "public"."HearingStatus" AS ENUM ('SCHEDULED', 'PREPARING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."HearingType" AS ENUM ('INITIAL', 'EVIDENCE', 'DEBATE', 'FINAL');

-- CreateEnum
CREATE TYPE "public"."MediationStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'AGREEMENT_DRAFT', 'AGREEMENT_SIGNED', 'JUDICIAL_CONFIRMATION_PENDING', 'JUDICIAL_CONFIRMED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('CASE_UPDATE', 'HEARING_REMINDER', 'DOCUMENT_UPLOADED', 'MEDIATION_REQUEST', 'SYSTEM_ANNOUNCEMENT', 'AI_SUGGESTION');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('PENDING', 'DELIVERED', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."ProcessStage" AS ENUM ('CASE_FILING', 'CASE_ACCEPTANCE', 'ARBITRATOR_APPOINTMENT', 'EVIDENCE_EXCHANGE', 'HEARING_PREPARATION', 'HEARING_CONDUCT', 'DELIBERATION', 'AWARD_DRAFTING', 'AWARD_ISSUANCE', 'CASE_CLOSURE');

-- CreateTable
CREATE TABLE "public"."hearings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hearing_number" VARCHAR(50) NOT NULL,
    "case_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "hearing_type" "public"."HearingType" NOT NULL,
    "status" "public"."HearingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "is_online" BOOLEAN NOT NULL DEFAULT true,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "estimated_duration" INTEGER NOT NULL DEFAULT 120,
    "actual_duration" INTEGER,
    "webrtc_config" JSONB,
    "recording_enabled" BOOLEAN NOT NULL DEFAULT true,
    "recording_url" VARCHAR(500),
    "transcript_url" VARCHAR(500),
    "ai_features" JSONB,
    "ai_analysis" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hearings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hearing_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hearing_id" UUID NOT NULL,
    "user_id" UUID,
    "role" "public"."ParticipantType" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "connection_status" VARCHAR(50) NOT NULL DEFAULT 'not_connected',
    "joined_at" TIMESTAMPTZ,
    "left_at" TIMESTAMPTZ,
    "audio_enabled" BOOLEAN NOT NULL DEFAULT true,
    "video_enabled" BOOLEAN NOT NULL DEFAULT true,
    "device_info" JSONB,
    "network_quality" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hearing_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mediations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mediation_number" VARCHAR(50) NOT NULL,
    "case_id" UUID NOT NULL,
    "application_type" VARCHAR(50) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "public"."MediationStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "proposed_mediator" UUID,
    "preferred_schedule" JSONB,
    "mediation_terms" JSONB,
    "participant_consent" JSONB,
    "ai_analysis" JSONB,
    "applicant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mediations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mediation_agreements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mediation_id" UUID NOT NULL,
    "agreement_number" VARCHAR(50) NOT NULL,
    "agreement_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "terms" JSONB NOT NULL,
    "financial_terms" JSONB,
    "implementation_plan" JSONB,
    "judicial_confirmation" JSONB,
    "ai_analysis" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "signed_at" TIMESTAMPTZ,

    CONSTRAINT "mediation_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "channels" JSONB NOT NULL,
    "delivery_status" JSONB,
    "related_entity" JSONB,
    "scheduled_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "archived_at" TIMESTAMPTZ,
    "ai_analysis" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "template_type" VARCHAR(50) NOT NULL,
    "template_content" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "styles" JSONB,
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."generated_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "case_id" UUID,
    "document_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "generated_content" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "file_url" VARCHAR(500),
    "file_format" VARCHAR(20) NOT NULL DEFAULT 'pdf',
    "file_size" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "generated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."arbitration_processes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "current_stage" "public"."ProcessStage" NOT NULL,
    "stages" JSONB NOT NULL,
    "stage_history" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_end_at" TIMESTAMPTZ,
    "actual_end_at" TIMESTAMPTZ,
    "completed_stages" INTEGER NOT NULL DEFAULT 0,
    "total_stages" INTEGER NOT NULL,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "ai_analysis" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "arbitration_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batch_operations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation_type" VARCHAR(50) NOT NULL,
    "operation_name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "parameters" JSONB NOT NULL,
    "source_file" VARCHAR(500),
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "success_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB,
    "error_log" JSONB,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "batch_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hearings_hearing_number_key" ON "public"."hearings"("hearing_number");

-- CreateIndex
CREATE INDEX "hearings_case_id_idx" ON "public"."hearings"("case_id");

-- CreateIndex
CREATE INDEX "hearings_status_idx" ON "public"."hearings"("status");

-- CreateIndex
CREATE INDEX "hearings_scheduled_at_idx" ON "public"."hearings"("scheduled_at");

-- CreateIndex
CREATE INDEX "hearings_created_by_idx" ON "public"."hearings"("created_by");

-- CreateIndex
CREATE INDEX "hearings_hearing_number_idx" ON "public"."hearings"("hearing_number");

-- CreateIndex
CREATE INDEX "hearing_participants_hearing_id_idx" ON "public"."hearing_participants"("hearing_id");

-- CreateIndex
CREATE INDEX "hearing_participants_user_id_idx" ON "public"."hearing_participants"("user_id");

-- CreateIndex
CREATE INDEX "hearing_participants_role_idx" ON "public"."hearing_participants"("role");

-- CreateIndex
CREATE UNIQUE INDEX "mediations_mediation_number_key" ON "public"."mediations"("mediation_number");

-- CreateIndex
CREATE INDEX "mediations_case_id_idx" ON "public"."mediations"("case_id");

-- CreateIndex
CREATE INDEX "mediations_status_idx" ON "public"."mediations"("status");

-- CreateIndex
CREATE INDEX "mediations_applicant_id_idx" ON "public"."mediations"("applicant_id");

-- CreateIndex
CREATE INDEX "mediations_mediation_number_idx" ON "public"."mediations"("mediation_number");

-- CreateIndex
CREATE UNIQUE INDEX "mediation_agreements_mediation_id_key" ON "public"."mediation_agreements"("mediation_id");

-- CreateIndex
CREATE UNIQUE INDEX "mediation_agreements_agreement_number_key" ON "public"."mediation_agreements"("agreement_number");

-- CreateIndex
CREATE INDEX "mediation_agreements_mediation_id_idx" ON "public"."mediation_agreements"("mediation_id");

-- CreateIndex
CREATE INDEX "mediation_agreements_status_idx" ON "public"."mediation_agreements"("status");

-- CreateIndex
CREATE INDEX "mediation_agreements_created_by_idx" ON "public"."mediation_agreements"("created_by");

-- CreateIndex
CREATE INDEX "mediation_agreements_agreement_number_idx" ON "public"."mediation_agreements"("agreement_number");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "public"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "public"."notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "public"."notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_scheduled_at_idx" ON "public"."notifications"("scheduled_at");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "public"."notifications"("created_at");

-- CreateIndex
CREATE INDEX "document_templates_category_idx" ON "public"."document_templates"("category");

-- CreateIndex
CREATE INDEX "document_templates_template_type_idx" ON "public"."document_templates"("template_type");

-- CreateIndex
CREATE INDEX "document_templates_is_active_idx" ON "public"."document_templates"("is_active");

-- CreateIndex
CREATE INDEX "document_templates_created_by_idx" ON "public"."document_templates"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "generated_documents_document_number_key" ON "public"."generated_documents"("document_number");

-- CreateIndex
CREATE INDEX "generated_documents_template_id_idx" ON "public"."generated_documents"("template_id");

-- CreateIndex
CREATE INDEX "generated_documents_case_id_idx" ON "public"."generated_documents"("case_id");

-- CreateIndex
CREATE INDEX "generated_documents_status_idx" ON "public"."generated_documents"("status");

-- CreateIndex
CREATE INDEX "generated_documents_generated_by_idx" ON "public"."generated_documents"("generated_by");

-- CreateIndex
CREATE INDEX "generated_documents_document_number_idx" ON "public"."generated_documents"("document_number");

-- CreateIndex
CREATE UNIQUE INDEX "arbitration_processes_case_id_key" ON "public"."arbitration_processes"("case_id");

-- CreateIndex
CREATE INDEX "arbitration_processes_case_id_idx" ON "public"."arbitration_processes"("case_id");

-- CreateIndex
CREATE INDEX "arbitration_processes_current_stage_idx" ON "public"."arbitration_processes"("current_stage");

-- CreateIndex
CREATE INDEX "arbitration_processes_progress_percent_idx" ON "public"."arbitration_processes"("progress_percent");

-- CreateIndex
CREATE INDEX "batch_operations_operation_type_idx" ON "public"."batch_operations"("operation_type");

-- CreateIndex
CREATE INDEX "batch_operations_status_idx" ON "public"."batch_operations"("status");

-- CreateIndex
CREATE INDEX "batch_operations_created_by_idx" ON "public"."batch_operations"("created_by");

-- CreateIndex
CREATE INDEX "batch_operations_created_at_idx" ON "public"."batch_operations"("created_at");

-- AddForeignKey
ALTER TABLE "public"."hearings" ADD CONSTRAINT "hearings_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hearings" ADD CONSTRAINT "hearings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hearing_participants" ADD CONSTRAINT "hearing_participants_hearing_id_fkey" FOREIGN KEY ("hearing_id") REFERENCES "public"."hearings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hearing_participants" ADD CONSTRAINT "hearing_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mediations" ADD CONSTRAINT "mediations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mediations" ADD CONSTRAINT "mediations_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mediations" ADD CONSTRAINT "mediations_proposed_mediator_fkey" FOREIGN KEY ("proposed_mediator") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mediation_agreements" ADD CONSTRAINT "mediation_agreements_mediation_id_fkey" FOREIGN KEY ("mediation_id") REFERENCES "public"."mediations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mediation_agreements" ADD CONSTRAINT "mediation_agreements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_templates" ADD CONSTRAINT "document_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."generated_documents" ADD CONSTRAINT "generated_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."generated_documents" ADD CONSTRAINT "generated_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."arbitration_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."generated_documents" ADD CONSTRAINT "generated_documents_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."arbitration_processes" ADD CONSTRAINT "arbitration_processes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_operations" ADD CONSTRAINT "batch_operations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
