-- CreateEnum
CREATE TYPE "public"."NeutralType" AS ENUM ('ARBITRATOR', 'MEDIATOR');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "public"."NeutralResponseAction" AS ENUM ('ACCEPT', 'REJECT', 'REQUEST_MORE_TIME', 'UPDATE_DISCLOSURE');

-- CreateEnum
CREATE TYPE "public"."PartyConsentDecision" AS ENUM ('PENDING', 'CONSENTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "public"."PartyConsentStatus" AS ENUM ('PENDING', 'CONSENTED_BOTH', 'WITHDRAWN', 'EFFECTIVE');

-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'TERMINATED');

-- CreateTable
CREATE TABLE "public"."neutral_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "neutral_type" "public"."NeutralType" NOT NULL,
    "invited_user_id" UUID NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'DRAFT',
    "expires_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "responded_at" TIMESTAMPTZ,
    "requirements" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "neutral_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conflict_disclosures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invitation_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "disclosure_text" TEXT NOT NULL,
    "attachments" JSONB,
    "signed_at" TIMESTAMPTZ,
    "signature_ref" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "conflict_disclosures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."neutral_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invitation_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" "public"."NeutralResponseAction" NOT NULL,
    "reason" TEXT,
    "responded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "neutral_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."party_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "invitation_id" UUID,
    "target_type" "public"."NeutralType" NOT NULL,
    "target_user_id" UUID NOT NULL,
    "status" "public"."PartyConsentStatus" NOT NULL DEFAULT 'PENDING',
    "applicant_decision" "public"."PartyConsentDecision" NOT NULL DEFAULT 'PENDING',
    "applicant_decision_at" TIMESTAMPTZ,
    "applicant_signature_ref" TEXT,
    "applicant_reason" TEXT,
    "respondent_decision" "public"."PartyConsentDecision" NOT NULL DEFAULT 'PENDING',
    "respondent_decision_at" TIMESTAMPTZ,
    "respondent_signature_ref" TEXT,
    "respondent_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "party_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."neutral_appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "invitation_id" UUID,
    "target_type" "public"."NeutralType" NOT NULL,
    "target_user_id" UUID NOT NULL,
    "status" "public"."AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "effective_at" TIMESTAMPTZ,
    "terminated_at" TIMESTAMPTZ,
    "terminate_reason" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "neutral_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."case_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sequence" BIGSERIAL NOT NULL,
    "case_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "actor_user_id" UUID,
    "trace_id" VARCHAR(64),
    "payload" JSONB NOT NULL,
    "hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "neutral_invitations_case_id_idx" ON "public"."neutral_invitations"("case_id");

-- CreateIndex
CREATE INDEX "neutral_invitations_invited_user_id_idx" ON "public"."neutral_invitations"("invited_user_id");

-- CreateIndex
CREATE INDEX "neutral_invitations_invited_by_user_id_idx" ON "public"."neutral_invitations"("invited_by_user_id");

-- CreateIndex
CREATE INDEX "neutral_invitations_neutral_type_idx" ON "public"."neutral_invitations"("neutral_type");

-- CreateIndex
CREATE INDEX "neutral_invitations_status_idx" ON "public"."neutral_invitations"("status");

-- CreateIndex
CREATE INDEX "neutral_invitations_expires_at_idx" ON "public"."neutral_invitations"("expires_at");

-- CreateIndex
CREATE INDEX "conflict_disclosures_invitation_id_idx" ON "public"."conflict_disclosures"("invitation_id");

-- CreateIndex
CREATE INDEX "conflict_disclosures_created_by_idx" ON "public"."conflict_disclosures"("created_by");

-- CreateIndex
CREATE INDEX "conflict_disclosures_created_at_idx" ON "public"."conflict_disclosures"("created_at");

-- CreateIndex
CREATE INDEX "neutral_responses_invitation_id_idx" ON "public"."neutral_responses"("invitation_id");

-- CreateIndex
CREATE INDEX "neutral_responses_actor_user_id_idx" ON "public"."neutral_responses"("actor_user_id");

-- CreateIndex
CREATE INDEX "neutral_responses_responded_at_idx" ON "public"."neutral_responses"("responded_at");

-- CreateIndex
CREATE INDEX "party_consents_case_id_idx" ON "public"."party_consents"("case_id");

-- CreateIndex
CREATE INDEX "party_consents_invitation_id_idx" ON "public"."party_consents"("invitation_id");

-- CreateIndex
CREATE INDEX "party_consents_target_type_idx" ON "public"."party_consents"("target_type");

-- CreateIndex
CREATE INDEX "party_consents_target_user_id_idx" ON "public"."party_consents"("target_user_id");

-- CreateIndex
CREATE INDEX "party_consents_status_idx" ON "public"."party_consents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "party_consents_case_id_target_type_target_user_id_key" ON "public"."party_consents"("case_id", "target_type", "target_user_id");

-- CreateIndex
CREATE INDEX "neutral_appointments_case_id_idx" ON "public"."neutral_appointments"("case_id");

-- CreateIndex
CREATE INDEX "neutral_appointments_invitation_id_idx" ON "public"."neutral_appointments"("invitation_id");

-- CreateIndex
CREATE INDEX "neutral_appointments_target_type_idx" ON "public"."neutral_appointments"("target_type");

-- CreateIndex
CREATE INDEX "neutral_appointments_target_user_id_idx" ON "public"."neutral_appointments"("target_user_id");

-- CreateIndex
CREATE INDEX "neutral_appointments_status_idx" ON "public"."neutral_appointments"("status");

-- CreateIndex
CREATE INDEX "neutral_appointments_effective_at_idx" ON "public"."neutral_appointments"("effective_at");

-- CreateIndex
CREATE INDEX "case_events_case_id_sequence_idx" ON "public"."case_events"("case_id", "sequence");

-- CreateIndex
CREATE INDEX "case_events_event_type_idx" ON "public"."case_events"("event_type");

-- CreateIndex
CREATE INDEX "case_events_actor_user_id_idx" ON "public"."case_events"("actor_user_id");

-- CreateIndex
CREATE INDEX "case_events_created_at_idx" ON "public"."case_events"("created_at");

-- AddForeignKey
ALTER TABLE "public"."neutral_invitations" ADD CONSTRAINT "neutral_invitations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."neutral_invitations" ADD CONSTRAINT "neutral_invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."neutral_invitations" ADD CONSTRAINT "neutral_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conflict_disclosures" ADD CONSTRAINT "conflict_disclosures_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "public"."neutral_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conflict_disclosures" ADD CONSTRAINT "conflict_disclosures_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."neutral_responses" ADD CONSTRAINT "neutral_responses_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "public"."neutral_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."neutral_responses" ADD CONSTRAINT "neutral_responses_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."party_consents" ADD CONSTRAINT "party_consents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."party_consents" ADD CONSTRAINT "party_consents_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "public"."neutral_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."party_consents" ADD CONSTRAINT "party_consents_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."neutral_appointments" ADD CONSTRAINT "neutral_appointments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."neutral_appointments" ADD CONSTRAINT "neutral_appointments_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "public"."neutral_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."neutral_appointments" ADD CONSTRAINT "neutral_appointments_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."neutral_appointments" ADD CONSTRAINT "neutral_appointments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_events" ADD CONSTRAINT "case_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_events" ADD CONSTRAINT "case_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
