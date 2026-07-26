-- Demand Engine: offer recommendations, live offers, publish + performance

DO $$ BEGIN
  CREATE TYPE "public"."DemandRecommendationStatus" AS ENUM ('PENDING', 'APPROVED', 'DISMISSED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."LiveOfferStatus" AS ENUM ('DRAFT', 'LIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."ChannelPublishStatus" AS ENUM ('QUEUED', 'PUBLISHED', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."AutomationRuleMode" AS ENUM ('NOTIFY_ONLY', 'AUTO_APPROVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "public"."LiveOffer" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "campaignId" TEXT,
    "status" "public"."LiveOfferStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "discountLabel" TEXT,
    "offer" JSONB NOT NULL DEFAULT '{}',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LiveOffer_restaurantId_status_idx" ON "public"."LiveOffer"("restaurantId", "status");
CREATE INDEX IF NOT EXISTS "LiveOffer_status_validTo_idx" ON "public"."LiveOffer"("status", "validTo");

ALTER TABLE "public"."LiveOffer" DROP CONSTRAINT IF EXISTS "LiveOffer_restaurantId_fkey";
ALTER TABLE "public"."LiveOffer"
  ADD CONSTRAINT "LiveOffer_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."LiveOffer" DROP CONSTRAINT IF EXISTS "LiveOffer_campaignId_fkey";
ALTER TABLE "public"."LiveOffer"
  ADD CONSTRAINT "LiveOffer_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "public"."DemandRecommendation" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "status" "public"."DemandRecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 70,
    "impactScore" INTEGER NOT NULL DEFAULT 50,
    "estimatedExtraCustomers" INTEGER NOT NULL DEFAULT 0,
    "estimatedExtraRevenue" INTEGER NOT NULL DEFAULT 0,
    "offer" JSONB NOT NULL DEFAULT '{}',
    "templateKey" TEXT,
    "expiresAt" TIMESTAMP(3),
    "campaignId" TEXT,
    "liveOfferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemandRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DemandRecommendation_restaurantId_status_idx" ON "public"."DemandRecommendation"("restaurantId", "status");
CREATE INDEX IF NOT EXISTS "DemandRecommendation_restaurantId_createdAt_idx" ON "public"."DemandRecommendation"("restaurantId", "createdAt");

ALTER TABLE "public"."DemandRecommendation" DROP CONSTRAINT IF EXISTS "DemandRecommendation_restaurantId_fkey";
ALTER TABLE "public"."DemandRecommendation"
  ADD CONSTRAINT "DemandRecommendation_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."DemandRecommendation" DROP CONSTRAINT IF EXISTS "DemandRecommendation_campaignId_fkey";
ALTER TABLE "public"."DemandRecommendation"
  ADD CONSTRAINT "DemandRecommendation_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."DemandRecommendation" DROP CONSTRAINT IF EXISTS "DemandRecommendation_liveOfferId_fkey";
ALTER TABLE "public"."DemandRecommendation"
  ADD CONSTRAINT "DemandRecommendation_liveOfferId_fkey"
  FOREIGN KEY ("liveOfferId") REFERENCES "public"."LiveOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "public"."ChannelPublish" (
    "id" TEXT NOT NULL,
    "liveOfferId" TEXT NOT NULL,
    "channel" "public"."CampaignChannel" NOT NULL,
    "status" "public"."ChannelPublishStatus" NOT NULL DEFAULT 'QUEUED',
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelPublish_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChannelPublish_liveOfferId_channel_idx" ON "public"."ChannelPublish"("liveOfferId", "channel");

ALTER TABLE "public"."ChannelPublish" DROP CONSTRAINT IF EXISTS "ChannelPublish_liveOfferId_fkey";
ALTER TABLE "public"."ChannelPublish"
  ADD CONSTRAINT "ChannelPublish_liveOfferId_fkey"
  FOREIGN KEY ("liveOfferId") REFERENCES "public"."LiveOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "public"."CampaignPerformance" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "liveOfferId" TEXT,
    "extraCustomers" INTEGER NOT NULL DEFAULT 0,
    "estimatedRevenue" INTEGER NOT NULL DEFAULT 0,
    "redemptions" INTEGER NOT NULL DEFAULT 0,
    "channelBreakdown" JSONB NOT NULL DEFAULT '{}',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignPerformance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CampaignPerformance_campaignId_idx" ON "public"."CampaignPerformance"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignPerformance_liveOfferId_idx" ON "public"."CampaignPerformance"("liveOfferId");

ALTER TABLE "public"."CampaignPerformance" DROP CONSTRAINT IF EXISTS "CampaignPerformance_campaignId_fkey";
ALTER TABLE "public"."CampaignPerformance"
  ADD CONSTRAINT "CampaignPerformance_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."CampaignPerformance" DROP CONSTRAINT IF EXISTS "CampaignPerformance_liveOfferId_fkey";
ALTER TABLE "public"."CampaignPerformance"
  ADD CONSTRAINT "CampaignPerformance_liveOfferId_fkey"
  FOREIGN KEY ("liveOfferId") REFERENCES "public"."LiveOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "public"."AutomationRule" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "mode" "public"."AutomationRuleMode" NOT NULL DEFAULT 'NOTIFY_ONLY',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AutomationRule_restaurantId_idx" ON "public"."AutomationRule"("restaurantId");

ALTER TABLE "public"."AutomationRule" DROP CONSTRAINT IF EXISTS "AutomationRule_restaurantId_fkey";
ALTER TABLE "public"."AutomationRule"
  ADD CONSTRAINT "AutomationRule_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE IF EXISTS public."DemandRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."LiveOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."ChannelPublish" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CampaignPerformance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AutomationRule" ENABLE ROW LEVEL SECURITY;
