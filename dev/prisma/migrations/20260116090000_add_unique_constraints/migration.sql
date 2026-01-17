-- DataFix: deduplicate user_roles on (user_id, role) before adding constraint
DELETE FROM "public"."user_roles" AS ur
USING (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "user_id", "role"
            ORDER BY "assigned_at" DESC, "id" DESC
        ) AS rn
    FROM "public"."user_roles"
) AS ranked
WHERE ur."id" = ranked."id"
  AND ranked.rn > 1;

-- DataFix: deduplicate case_participants on (case_id, user_id, participant_type)
-- NOTE: user_id can be NULL for external participants; PostgreSQL UNIQUE allows multiple NULLs.
DELETE FROM "public"."case_participants" AS cp
USING (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "case_id", "user_id", "participant_type"
            ORDER BY "joined_at" DESC, "id" DESC
        ) AS rn
    FROM "public"."case_participants"
    WHERE "user_id" IS NOT NULL
) AS ranked
WHERE cp."id" = ranked."id"
  AND ranked.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "public"."user_roles"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "case_participants_case_id_user_id_participant_type_key" ON "public"."case_participants"("case_id", "user_id", "participant_type");
