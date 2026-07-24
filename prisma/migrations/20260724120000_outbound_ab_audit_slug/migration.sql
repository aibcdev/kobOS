-- CreateEnum
CREATE TYPE "OutboundEmailVariant" AS ENUM ('A', 'B');

-- AlterTable OutboundLead
ALTER TABLE "OutboundLead" ADD COLUMN IF NOT EXISTS "emailVariant" "OutboundEmailVariant";
ALTER TABLE "OutboundLead" ADD COLUMN IF NOT EXISTS "visibilityAuditId" TEXT;
ALTER TABLE "OutboundLead" ADD COLUMN IF NOT EXISTS "auditUrl" TEXT;

CREATE INDEX IF NOT EXISTS "OutboundLead_visibilityAuditId_idx" ON "OutboundLead"("visibilityAuditId");
CREATE INDEX IF NOT EXISTS "OutboundLead_emailVariant_status_idx" ON "OutboundLead"("emailVariant", "status");

-- AlterTable VisibilityAudit
ALTER TABLE "VisibilityAudit" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "VisibilityAudit_slug_key" ON "VisibilityAudit"("slug");
