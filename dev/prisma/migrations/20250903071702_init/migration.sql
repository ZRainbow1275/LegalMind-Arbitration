-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('INDIVIDUAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."ProfileType" AS ENUM ('INDIVIDUAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('APPLICANT', 'RESPONDENT', 'ARBITRATOR', 'MEDIATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."CaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'IN_PROGRESS', 'MEDIATION', 'HEARING', 'DELIBERATION', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."ParticipantType" AS ENUM ('APPLICANT', 'RESPONDENT', 'ARBITRATOR', 'WITNESS', 'AGENT');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('APPLICATION', 'EVIDENCE', 'RESPONSE', 'DECISION', 'AGREEMENT', 'OTHER');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "user_type" "public"."UserType" NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "profile_type" "public"."ProfileType" NOT NULL,
    "real_name" VARCHAR(100),
    "id_number" VARCHAR(18),
    "id_card_front_url" TEXT,
    "id_card_back_url" TEXT,
    "face_verification_data" TEXT,
    "company_name" VARCHAR(200),
    "business_license" VARCHAR(50),
    "legal_representative" VARCHAR(100),
    "legal_rep_id_number" VARCHAR(18),
    "company_address" TEXT,
    "verification_status" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verification_documents" JSONB,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role" "public"."Role" NOT NULL,
    "permissions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."arbitration_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "case_type" VARCHAR(100) NOT NULL,
    "dispute_amount" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "applicant_id" UUID NOT NULL,
    "respondent_id" UUID,
    "respondent_info" JSONB,
    "status" "public"."CaseStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "arbitration_agreement_url" TEXT,
    "application_form_url" TEXT,
    "submitted_at" TIMESTAMPTZ,
    "accepted_at" TIMESTAMPTZ,
    "deadline" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "arbitration_fee" DECIMAL(10,2),
    "fee_paid" BOOLEAN NOT NULL DEFAULT false,
    "fee_paid_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "arbitration_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."case_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "user_id" UUID,
    "participant_type" "public"."ParticipantType" NOT NULL,
    "role_description" VARCHAR(200),
    "contact_info" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."case_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "file_type" VARCHAR(100) NOT NULL,
    "mime_type" VARCHAR(100),
    "file_hash" VARCHAR(64),
    "document_type" "public"."DocumentType" NOT NULL,
    "category" VARCHAR(100),
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "access_level" VARCHAR(50) NOT NULL DEFAULT 'case_participants',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_document_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "case_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "public"."users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "public"."users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "public"."users"("status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "public"."users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "public"."user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_verification_status_idx" ON "public"."user_profiles"("verification_status");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "public"."user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_idx" ON "public"."user_roles"("role");

-- CreateIndex
CREATE UNIQUE INDEX "arbitration_cases_case_number_key" ON "public"."arbitration_cases"("case_number");

-- CreateIndex
CREATE INDEX "arbitration_cases_case_number_idx" ON "public"."arbitration_cases"("case_number");

-- CreateIndex
CREATE INDEX "arbitration_cases_applicant_id_idx" ON "public"."arbitration_cases"("applicant_id");

-- CreateIndex
CREATE INDEX "arbitration_cases_respondent_id_idx" ON "public"."arbitration_cases"("respondent_id");

-- CreateIndex
CREATE INDEX "arbitration_cases_status_idx" ON "public"."arbitration_cases"("status");

-- CreateIndex
CREATE INDEX "arbitration_cases_created_at_idx" ON "public"."arbitration_cases"("created_at");

-- CreateIndex
CREATE INDEX "arbitration_cases_dispute_amount_idx" ON "public"."arbitration_cases"("dispute_amount");

-- CreateIndex
CREATE INDEX "case_participants_case_id_idx" ON "public"."case_participants"("case_id");

-- CreateIndex
CREATE INDEX "case_participants_user_id_idx" ON "public"."case_participants"("user_id");

-- CreateIndex
CREATE INDEX "case_participants_participant_type_idx" ON "public"."case_participants"("participant_type");

-- CreateIndex
CREATE INDEX "case_documents_case_id_idx" ON "public"."case_documents"("case_id");

-- CreateIndex
CREATE INDEX "case_documents_uploaded_by_idx" ON "public"."case_documents"("uploaded_by");

-- CreateIndex
CREATE INDEX "case_documents_document_type_idx" ON "public"."case_documents"("document_type");

-- CreateIndex
CREATE INDEX "case_documents_created_at_idx" ON "public"."case_documents"("created_at");

-- CreateIndex
CREATE INDEX "case_documents_file_hash_idx" ON "public"."case_documents"("file_hash");

-- AddForeignKey
ALTER TABLE "public"."user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."arbitration_cases" ADD CONSTRAINT "arbitration_cases_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."arbitration_cases" ADD CONSTRAINT "arbitration_cases_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_participants" ADD CONSTRAINT "case_participants_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_participants" ADD CONSTRAINT "case_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_documents" ADD CONSTRAINT "case_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_documents" ADD CONSTRAINT "case_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_documents" ADD CONSTRAINT "case_documents_parent_document_id_fkey" FOREIGN KEY ("parent_document_id") REFERENCES "public"."case_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
