-- UpdateData
UPDATE "service_attempts"
SET "status" = 'SERVICE_NOT_CONFIGURED'
WHERE "status" = 'NOT_IMPLEMENTED';

-- AlterEnum
ALTER TABLE "service_attempts" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "ServiceAttemptStatus_new" AS ENUM (
  'PENDING',
  'DELIVERED',
  'FAILED',
  'RETRYING',
  'SERVICE_NOT_CONFIGURED'
);

ALTER TABLE "service_attempts"
ALTER COLUMN "status" TYPE "ServiceAttemptStatus_new"
USING ("status"::text::"ServiceAttemptStatus_new");

ALTER TABLE "service_attempts" ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "ServiceAttemptStatus";
ALTER TYPE "ServiceAttemptStatus_new" RENAME TO "ServiceAttemptStatus";

