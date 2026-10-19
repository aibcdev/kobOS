-- Catch-up for schema changes that reached production via `prisma db push`
-- without a migration. Every statement is idempotent: on production this is a
-- no-op; on a fresh database it brings migrations in line with schema.prisma.

DO $$ BEGIN
  CREATE TYPE "MarketingFunnelKind" AS ENUM ('AD_METRICS_SNAPSHOT', 'AUDIT_STARTED', 'TRIAL_STARTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MarketingFunnelEvent" (
    "id" TEXT NOT NULL,
    "kind" "MarketingFunnelKind" NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "medium" TEXT NOT NULL DEFAULT '',
    "campaign" TEXT NOT NULL DEFAULT '',
    "gclid" TEXT,
    "auditId" TEXT,
    "restaurantId" TEXT,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketingFunnelEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketingFunnelEvent_kind_createdAt_idx" ON "MarketingFunnelEvent"("kind", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketingFunnelEvent_campaign_createdAt_idx" ON "MarketingFunnelEvent"("campaign", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketingFunnelEvent_restaurantId_kind_idx" ON "MarketingFunnelEvent"("restaurantId", "kind");
CREATE INDEX IF NOT EXISTS "MarketingFunnelEvent_auditId_idx" ON "MarketingFunnelEvent"("auditId");

ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMP(3);

ALTER TABLE "VisibilityAudit" ADD COLUMN IF NOT EXISTS "gclid" TEXT;
ALTER TABLE "VisibilityAudit" ADD COLUMN IF NOT EXISTS "landingPath" TEXT;
ALTER TABLE "VisibilityAudit" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "VisibilityAudit" ADD COLUMN IF NOT EXISTS "utmMedium" TEXT;
ALTER TABLE "VisibilityAudit" ADD COLUMN IF NOT EXISTS "utmSource" TEXT;
CREATE INDEX IF NOT EXISTS "VisibilityAudit_utmCampaign_createdAt_idx" ON "VisibilityAudit"("utmCampaign", "createdAt");
CREATE INDEX IF NOT EXISTS "VisibilityAudit_gclid_idx" ON "VisibilityAudit"("gclid");

DROP INDEX IF EXISTS "LeadProspect_workspaceRestaurantId_canonicalKey_idx";
ALTER TABLE "LeadProspect" ALTER COLUMN "canonicalKey" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "LeadProspect_workspaceRestaurantId_placeId_idx" ON "LeadProspect"("workspaceRestaurantId", "placeId");
ALTER INDEX IF EXISTS "LeadProspect_workspaceRestaurantId_status_kobOpportunityScore_i"
  RENAME TO "LeadProspect_workspaceRestaurantId_status_kobOpportunitySco_idx";

-- @updatedAt is set by Prisma; the DB default was dropped on production.
ALTER TABLE "AutomationRule" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "CampaignPerformance" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "ChannelPublish" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "CreativePack" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "DemandRecommendation" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "LiveOffer" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "ServiceRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;
