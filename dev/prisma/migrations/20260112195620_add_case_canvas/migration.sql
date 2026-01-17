-- CreateTable
CREATE TABLE "public"."case_canvases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "latest_version" INTEGER NOT NULL DEFAULT 0,
    "latest_snapshot" JSONB,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "case_canvases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."case_canvas_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "canvas_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "options" JSONB,

    CONSTRAINT "case_canvas_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "case_canvases_case_id_key" ON "public"."case_canvases"("case_id");

-- CreateIndex
CREATE INDEX "case_canvases_case_id_idx" ON "public"."case_canvases"("case_id");

-- CreateIndex
CREATE INDEX "case_canvas_versions_canvas_id_idx" ON "public"."case_canvas_versions"("canvas_id");

-- CreateIndex
CREATE INDEX "case_canvas_versions_created_at_idx" ON "public"."case_canvas_versions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "case_canvas_versions_canvas_id_version_key" ON "public"."case_canvas_versions"("canvas_id", "version");

-- AddForeignKey
ALTER TABLE "public"."case_canvases" ADD CONSTRAINT "case_canvases_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."arbitration_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_canvas_versions" ADD CONSTRAINT "case_canvas_versions_canvas_id_fkey" FOREIGN KEY ("canvas_id") REFERENCES "public"."case_canvases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
