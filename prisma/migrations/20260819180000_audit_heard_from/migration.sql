-- AlterTable
ALTER TABLE "public"."VisibilityAudit" ADD COLUMN IF NOT EXISTS "heardFrom" TEXT;
ALTER TABLE "public"."VisibilityAudit" ADD COLUMN IF NOT EXISTS "aiPrompt" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VisibilityAudit_heardFrom_createdAt_idx" ON "public"."VisibilityAudit"("heardFrom", "createdAt");
