-- CreateEnum
CREATE TYPE "CaseReviewStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'NEED_MORE_INFO', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ArbitratorProfileStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ArbitratorAvailabilityStatus" AS ENUM ('AVAILABLE', 'BLOCKED', 'BOOKED');

-- CreateEnum
CREATE TYPE "ArbitratorReviewStatus" AS ENUM ('PENDING_MODERATION', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "RecusalRequestStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CaseTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "EvidenceVerificationMethod" AS ENUM ('HASH', 'NOTARY');

-- CreateEnum
CREATE TYPE "EvidenceVerificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'VERIFIED', 'FAILED', 'NOT_SUPPORTED', 'SERVICE_NOT_CONFIGURED');

-- CreateEnum
CREATE TYPE "DocumentSignatureRequestStatus" AS ENUM ('DRAFT', 'REQUESTED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DocumentSignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SealStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "SealUsageStatus" AS ENUM ('APPLIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "HearingRecordingStatus" AS ENUM ('REQUESTED', 'RUNNING', 'COMPLETED', 'FAILED', 'STOPPED');

-- CreateEnum
CREATE TYPE "HearingTranscriptStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'NOT_SUPPORTED', 'SERVICE_NOT_CONFIGURED');

-- CreateEnum
CREATE TYPE "MultipartUploadStatus" AS ENUM ('INITIATED', 'UPLOADING', 'COMPLETED', 'ABORTED', 'FAILED');

-- CreateTable
CREATE TABLE "arbitrator_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "status" "ArbitratorProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(200),
    "bio" TEXT,
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "location" VARCHAR(100),
    "languages" JSONB,
    "specialties" JSONB,
    "hourly_rate" DECIMAL(10,2),
    "verification_documents" JSONB,
    "verified_at" TIMESTAMPTZ,
    "verified_by_user_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "arbitrator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arbitrator_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "arbitrator_user_id" UUID NOT NULL,
    "case_id" UUID,
    "author_user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT,
    "status" "ArbitratorReviewStatus" NOT NULL DEFAULT 'PENDING_MODERATION',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "arbitrator_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arbitrator_availability_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "arbitrator_user_id" UUID NOT NULL,
    "status" "ArbitratorAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Shanghai',
    "note" VARCHAR(200),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "arbitrator_availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "status" "CaseReviewStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submitted_by_user_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by_user_id" UUID,
    "decided_at" TIMESTAMPTZ,
    "decision_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "case_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recusal_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "status" "RecusalRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reason" TEXT NOT NULL,
    "decision_reason" TEXT,
    "decided_by_user_id" UUID,
    "decided_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recusal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "method" "EvidenceVerificationMethod" NOT NULL,
    "status" "EvidenceVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_user_id" UUID,
    "trace_id" VARCHAR(64),
    "checked_at" TIMESTAMPTZ,
    "verified_at" TIMESTAMPTZ,
    "error" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "evidence_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_signature_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "status" "DocumentSignatureRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "provider" VARCHAR(50),
    "requested_by_user_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "document_signature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_signatures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "signer_user_id" UUID NOT NULL,
    "status" "DocumentSignatureStatus" NOT NULL DEFAULT 'PENDING',
    "signed_at" TIMESTAMPTZ,
    "signature_alg" VARCHAR(50),
    "signature_value" TEXT,
    "public_key_pem" TEXT,
    "certificate_pem" TEXT,
    "document_hash" VARCHAR(64),
    "signature_hash" VARCHAR(64),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "document_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "SealStatus" NOT NULL DEFAULT 'ACTIVE',
    "image_bucket" VARCHAR(255),
    "image_key" TEXT,
    "image_sha256" VARCHAR(64),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "seals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seal_usages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seal_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "signature_request_id" UUID,
    "used_by_user_id" UUID,
    "status" "SealUsageStatus" NOT NULL DEFAULT 'APPLIED',
    "used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,
    "metadata" JSONB,

    CONSTRAINT "seal_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "CaseTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "due_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_by_user_id" UUID NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "case_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_by_user_id" UUID,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMPTZ,
    "metadata" JSONB,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hearing_recordings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hearing_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_egress_id" VARCHAR(200),
    "status" "HearingRecordingStatus" NOT NULL DEFAULT 'REQUESTED',
    "requested_by_user_id" UUID,
    "stopped_by_user_id" UUID,
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "bucket" VARCHAR(255),
    "object_key" TEXT,
    "file_name" VARCHAR(255),
    "content_type" VARCHAR(100),
    "size" BIGINT,
    "sha256" VARCHAR(64),
    "metadata" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hearing_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hearing_transcripts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hearing_id" UUID NOT NULL,
    "recording_id" UUID,
    "provider" VARCHAR(50),
    "status" "HearingTranscriptStatus" NOT NULL DEFAULT 'REQUESTED',
    "requested_by_user_id" UUID,
    "language" VARCHAR(20),
    "format" VARCHAR(50),
    "text" TEXT,
    "segments" JSONB,
    "bucket" VARCHAR(255),
    "object_key" TEXT,
    "sha256" VARCHAR(64),
    "metadata" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hearing_transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multipart_upload_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "case_id" UUID,
    "upload_id" VARCHAR(200) NOT NULL,
    "bucket" VARCHAR(255) NOT NULL,
    "object_key" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "status" "MultipartUploadStatus" NOT NULL DEFAULT 'INITIATED',
    "parts" JSONB,
    "completed_at" TIMESTAMPTZ,
    "error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "multipart_upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "arbitrator_profiles_user_id_key" ON "arbitrator_profiles"("user_id");

-- CreateIndex
CREATE INDEX "arbitrator_profiles_user_id_idx" ON "arbitrator_profiles"("user_id");

-- CreateIndex
CREATE INDEX "arbitrator_profiles_status_idx" ON "arbitrator_profiles"("status");

-- CreateIndex
CREATE INDEX "arbitrator_profiles_verified_at_idx" ON "arbitrator_profiles"("verified_at");

-- CreateIndex
CREATE INDEX "arbitrator_profiles_verified_by_user_id_idx" ON "arbitrator_profiles"("verified_by_user_id");

-- CreateIndex
CREATE INDEX "arbitrator_reviews_arbitrator_user_id_idx" ON "arbitrator_reviews"("arbitrator_user_id");

-- CreateIndex
CREATE INDEX "arbitrator_reviews_case_id_idx" ON "arbitrator_reviews"("case_id");

-- CreateIndex
CREATE INDEX "arbitrator_reviews_author_user_id_idx" ON "arbitrator_reviews"("author_user_id");

-- CreateIndex
CREATE INDEX "arbitrator_reviews_status_idx" ON "arbitrator_reviews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "arbitrator_reviews_case_id_author_user_id_arbitrator_user_i_key" ON "arbitrator_reviews"("case_id", "author_user_id", "arbitrator_user_id");

-- CreateIndex
CREATE INDEX "arbitrator_availability_slots_arbitrator_user_id_idx" ON "arbitrator_availability_slots"("arbitrator_user_id");

-- CreateIndex
CREATE INDEX "arbitrator_availability_slots_status_idx" ON "arbitrator_availability_slots"("status");

-- CreateIndex
CREATE INDEX "arbitrator_availability_slots_start_at_idx" ON "arbitrator_availability_slots"("start_at");

-- CreateIndex
CREATE INDEX "arbitrator_availability_slots_end_at_idx" ON "arbitrator_availability_slots"("end_at");

-- CreateIndex
CREATE UNIQUE INDEX "case_reviews_case_id_key" ON "case_reviews"("case_id");

-- CreateIndex
CREATE INDEX "case_reviews_status_idx" ON "case_reviews"("status");

-- CreateIndex
CREATE INDEX "case_reviews_submitted_by_user_id_idx" ON "case_reviews"("submitted_by_user_id");

-- CreateIndex
CREATE INDEX "case_reviews_decided_by_user_id_idx" ON "case_reviews"("decided_by_user_id");

-- CreateIndex
CREATE INDEX "case_reviews_submitted_at_idx" ON "case_reviews"("submitted_at");

-- CreateIndex
CREATE INDEX "recusal_requests_case_id_idx" ON "recusal_requests"("case_id");

-- CreateIndex
CREATE INDEX "recusal_requests_requested_by_user_id_idx" ON "recusal_requests"("requested_by_user_id");

-- CreateIndex
CREATE INDEX "recusal_requests_target_user_id_idx" ON "recusal_requests"("target_user_id");

-- CreateIndex
CREATE INDEX "recusal_requests_status_idx" ON "recusal_requests"("status");

-- CreateIndex
CREATE INDEX "recusal_requests_created_at_idx" ON "recusal_requests"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_verifications_document_id_key" ON "evidence_verifications"("document_id");

-- CreateIndex
CREATE INDEX "evidence_verifications_status_idx" ON "evidence_verifications"("status");

-- CreateIndex
CREATE INDEX "evidence_verifications_method_idx" ON "evidence_verifications"("method");

-- CreateIndex
CREATE INDEX "evidence_verifications_requested_by_user_id_idx" ON "evidence_verifications"("requested_by_user_id");

-- CreateIndex
CREATE INDEX "evidence_verifications_created_at_idx" ON "evidence_verifications"("created_at");

-- CreateIndex
CREATE INDEX "document_signature_requests_case_id_idx" ON "document_signature_requests"("case_id");

-- CreateIndex
CREATE INDEX "document_signature_requests_document_id_idx" ON "document_signature_requests"("document_id");

-- CreateIndex
CREATE INDEX "document_signature_requests_status_idx" ON "document_signature_requests"("status");

-- CreateIndex
CREATE INDEX "document_signature_requests_requested_by_user_id_idx" ON "document_signature_requests"("requested_by_user_id");

-- CreateIndex
CREATE INDEX "document_signatures_request_id_idx" ON "document_signatures"("request_id");

-- CreateIndex
CREATE INDEX "document_signatures_signer_user_id_idx" ON "document_signatures"("signer_user_id");

-- CreateIndex
CREATE INDEX "document_signatures_status_idx" ON "document_signatures"("status");

-- CreateIndex
CREATE UNIQUE INDEX "document_signatures_request_id_signer_user_id_key" ON "document_signatures"("request_id", "signer_user_id");

-- CreateIndex
CREATE INDEX "seals_owner_user_id_idx" ON "seals"("owner_user_id");

-- CreateIndex
CREATE INDEX "seals_status_idx" ON "seals"("status");

-- CreateIndex
CREATE INDEX "seal_usages_seal_id_idx" ON "seal_usages"("seal_id");

-- CreateIndex
CREATE INDEX "seal_usages_case_id_idx" ON "seal_usages"("case_id");

-- CreateIndex
CREATE INDEX "seal_usages_document_id_idx" ON "seal_usages"("document_id");

-- CreateIndex
CREATE INDEX "seal_usages_signature_request_id_idx" ON "seal_usages"("signature_request_id");

-- CreateIndex
CREATE INDEX "seal_usages_used_by_user_id_idx" ON "seal_usages"("used_by_user_id");

-- CreateIndex
CREATE INDEX "seal_usages_status_idx" ON "seal_usages"("status");

-- CreateIndex
CREATE INDEX "case_tasks_case_id_idx" ON "case_tasks"("case_id");

-- CreateIndex
CREATE INDEX "case_tasks_status_idx" ON "case_tasks"("status");

-- CreateIndex
CREATE INDEX "case_tasks_priority_idx" ON "case_tasks"("priority");

-- CreateIndex
CREATE INDEX "case_tasks_due_at_idx" ON "case_tasks"("due_at");

-- CreateIndex
CREATE INDEX "case_tasks_created_by_user_id_idx" ON "case_tasks"("created_by_user_id");

-- CreateIndex
CREATE INDEX "task_assignments_task_id_idx" ON "task_assignments"("task_id");

-- CreateIndex
CREATE INDEX "task_assignments_user_id_idx" ON "task_assignments"("user_id");

-- CreateIndex
CREATE INDEX "task_assignments_assigned_at_idx" ON "task_assignments"("assigned_at");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_task_id_user_id_key" ON "task_assignments"("task_id", "user_id");

-- CreateIndex
CREATE INDEX "task_comments_task_id_idx" ON "task_comments"("task_id");

-- CreateIndex
CREATE INDEX "task_comments_author_user_id_idx" ON "task_comments"("author_user_id");

-- CreateIndex
CREATE INDEX "task_comments_created_at_idx" ON "task_comments"("created_at");

-- CreateIndex
CREATE INDEX "hearing_recordings_hearing_id_idx" ON "hearing_recordings"("hearing_id");

-- CreateIndex
CREATE INDEX "hearing_recordings_provider_idx" ON "hearing_recordings"("provider");

-- CreateIndex
CREATE INDEX "hearing_recordings_status_idx" ON "hearing_recordings"("status");

-- CreateIndex
CREATE INDEX "hearing_recordings_created_at_idx" ON "hearing_recordings"("created_at");

-- CreateIndex
CREATE INDEX "hearing_transcripts_hearing_id_idx" ON "hearing_transcripts"("hearing_id");

-- CreateIndex
CREATE INDEX "hearing_transcripts_recording_id_idx" ON "hearing_transcripts"("recording_id");

-- CreateIndex
CREATE INDEX "hearing_transcripts_status_idx" ON "hearing_transcripts"("status");

-- CreateIndex
CREATE INDEX "multipart_upload_sessions_user_id_idx" ON "multipart_upload_sessions"("user_id");

-- CreateIndex
CREATE INDEX "multipart_upload_sessions_case_id_idx" ON "multipart_upload_sessions"("case_id");

-- CreateIndex
CREATE INDEX "multipart_upload_sessions_status_idx" ON "multipart_upload_sessions"("status");

-- CreateIndex
CREATE INDEX "multipart_upload_sessions_created_at_idx" ON "multipart_upload_sessions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "multipart_upload_sessions_bucket_object_key_upload_id_key" ON "multipart_upload_sessions"("bucket", "object_key", "upload_id");

-- AddForeignKey
ALTER TABLE "arbitrator_profiles" ADD CONSTRAINT "arbitrator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbitrator_profiles" ADD CONSTRAINT "arbitrator_profiles_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbitrator_reviews" ADD CONSTRAINT "arbitrator_reviews_arbitrator_user_id_fkey" FOREIGN KEY ("arbitrator_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbitrator_reviews" ADD CONSTRAINT "arbitrator_reviews_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "arbitration_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbitrator_reviews" ADD CONSTRAINT "arbitrator_reviews_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbitrator_availability_slots" ADD CONSTRAINT "arbitrator_availability_slots_arbitrator_user_id_fkey" FOREIGN KEY ("arbitrator_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_reviews" ADD CONSTRAINT "case_reviews_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_reviews" ADD CONSTRAINT "case_reviews_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_reviews" ADD CONSTRAINT "case_reviews_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recusal_requests" ADD CONSTRAINT "recusal_requests_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recusal_requests" ADD CONSTRAINT "recusal_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recusal_requests" ADD CONSTRAINT "recusal_requests_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recusal_requests" ADD CONSTRAINT "recusal_requests_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_verifications" ADD CONSTRAINT "evidence_verifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "case_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_verifications" ADD CONSTRAINT "evidence_verifications_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signature_requests" ADD CONSTRAINT "document_signature_requests_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signature_requests" ADD CONSTRAINT "document_signature_requests_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "case_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signature_requests" ADD CONSTRAINT "document_signature_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "document_signature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_signer_user_id_fkey" FOREIGN KEY ("signer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seals" ADD CONSTRAINT "seals_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seal_usages" ADD CONSTRAINT "seal_usages_seal_id_fkey" FOREIGN KEY ("seal_id") REFERENCES "seals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seal_usages" ADD CONSTRAINT "seal_usages_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seal_usages" ADD CONSTRAINT "seal_usages_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "case_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seal_usages" ADD CONSTRAINT "seal_usages_signature_request_id_fkey" FOREIGN KEY ("signature_request_id") REFERENCES "document_signature_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seal_usages" ADD CONSTRAINT "seal_usages_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_tasks" ADD CONSTRAINT "case_tasks_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_tasks" ADD CONSTRAINT "case_tasks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "case_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "case_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearing_recordings" ADD CONSTRAINT "hearing_recordings_hearing_id_fkey" FOREIGN KEY ("hearing_id") REFERENCES "hearings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearing_recordings" ADD CONSTRAINT "hearing_recordings_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearing_recordings" ADD CONSTRAINT "hearing_recordings_stopped_by_user_id_fkey" FOREIGN KEY ("stopped_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearing_transcripts" ADD CONSTRAINT "hearing_transcripts_hearing_id_fkey" FOREIGN KEY ("hearing_id") REFERENCES "hearings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearing_transcripts" ADD CONSTRAINT "hearing_transcripts_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "hearing_recordings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearing_transcripts" ADD CONSTRAINT "hearing_transcripts_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multipart_upload_sessions" ADD CONSTRAINT "multipart_upload_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multipart_upload_sessions" ADD CONSTRAINT "multipart_upload_sessions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "arbitration_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
