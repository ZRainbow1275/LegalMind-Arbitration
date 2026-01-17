-- CreateTable
CREATE TABLE "user_mfa" (
    "user_id" UUID NOT NULL,
    "totp_secret_enc" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ,
    "recovery_codes" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_mfa_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
