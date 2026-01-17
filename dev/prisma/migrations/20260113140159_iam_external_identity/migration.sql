-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ParticipantType" ADD VALUE 'PRESIDING_ARBITRATOR';
ALTER TYPE "public"."ParticipantType" ADD VALUE 'MEDIATOR';
ALTER TYPE "public"."ParticipantType" ADD VALUE 'CLERK';
ALTER TYPE "public"."ParticipantType" ADD VALUE 'OBSERVER';
ALTER TYPE "public"."ParticipantType" ADD VALUE 'COURT';
ALTER TYPE "public"."ParticipantType" ADD VALUE 'NOTARY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."Role" ADD VALUE 'END_USER';
ALTER TYPE "public"."Role" ADD VALUE 'LAWYER';
ALTER TYPE "public"."Role" ADD VALUE 'COURT';
ALTER TYPE "public"."Role" ADD VALUE 'NOTARY';
ALTER TYPE "public"."Role" ADD VALUE 'OPS_ADMIN';
ALTER TYPE "public"."Role" ADD VALUE 'AUDITOR_READONLY';

-- CreateTable
CREATE TABLE "public"."external_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider_type" VARCHAR(50) NOT NULL,
    "issuer" VARCHAR(500) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "email_verified" BOOLEAN,
    "raw_claims" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "last_login_at" TIMESTAMPTZ,

    CONSTRAINT "external_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_identities_user_id_idx" ON "public"."external_identities"("user_id");

-- CreateIndex
CREATE INDEX "external_identities_email_idx" ON "public"."external_identities"("email");

-- CreateIndex
CREATE UNIQUE INDEX "external_identities_issuer_subject_key" ON "public"."external_identities"("issuer", "subject");

-- AddForeignKey
ALTER TABLE "public"."external_identities" ADD CONSTRAINT "external_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
