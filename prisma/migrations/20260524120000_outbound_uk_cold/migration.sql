-- UK cold outreach pipeline fields on OutboundLead

CREATE TYPE "OutboundLeadSource" AS ENUM ('UK_COLD', 'AUDIT', 'MANUAL', 'LEGACY');

ALTER TABLE "OutboundLead" ADD COLUMN IF NOT EXISTS "placeId" TEXT;
ALTER TABLE "OutboundLead" ADD COLUMN IF NOT EXISTS "source" "OutboundLeadSource" NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "OutboundLead" ADD COLUMN IF NOT EXISTS "qualifyScore" INTEGER;
ALTER TABLE "OutboundLead" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER;
ALTER TABLE "OutboundLead" ADD COLUMN IF NOT EXISTS "enrichmentSource" TEXT;

CREATE INDEX IF NOT EXISTS "OutboundLead_workspaceRestaurantId_source_status_idx" ON "OutboundLead"("workspaceRestaurantId", "source", "status");
CREATE INDEX IF NOT EXISTS "OutboundLead_placeId_idx" ON "OutboundLead"("placeId");
