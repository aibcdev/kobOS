-- CreateEnum
CREATE TYPE "public"."LeadProspectStatus" AS ENUM ('DISCOVERED', 'ANALYZED', 'QUEUED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."LeadBusinessType" AS ENUM ('RESTAURANT', 'CAFE', 'TAKEAWAY', 'SMALL_GROUP');

-- AlterEnum
ALTER TYPE "public"."OutboundLeadSource" ADD VALUE 'LEAD_ENGINE';

-- CreateTable
CREATE TABLE "public"."LeadProspect" (
    "id" TEXT NOT NULL,
    "workspaceRestaurantId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'GB',
    "formattedAddress" TEXT,
    "businessType" "public"."LeadBusinessType" NOT NULL DEFAULT 'RESTAURANT',
    "locationCount" INTEGER,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "hasContactForm" BOOLEAN NOT NULL DEFAULT false,
    "reviewCount" INTEGER,
    "rating" DOUBLE PRECISION,
    "lastReviewAt" TIMESTAMP(3),
    "googleBusinessClaimed" BOOLEAN,
    "instagramUrl" TEXT,
    "instagramFollowers" INTEGER,
    "instagramPostGapDays" INTEGER,
    "hasTikTok" BOOLEAN NOT NULL DEFAULT false,
    "facebookUrl" TEXT,
    "weakWebsite" BOOLEAN NOT NULL DEFAULT false,
    "weakPhotography" BOOLEAN NOT NULL DEFAULT false,
    "hasEmailCapture" BOOLEAN NOT NULL DEFAULT false,
    "pdfMenu" BOOLEAN NOT NULL DEFAULT false,
    "hasGoogleBusinessPosts" BOOLEAN NOT NULL DEFAULT false,
    "hasTripadvisor" BOOLEAN NOT NULL DEFAULT false,
    "hasOnlineOrdering" BOOLEAN NOT NULL DEFAULT false,
    "kobOpportunityScore" INTEGER,
    "scoreBreakdown" JSONB NOT NULL DEFAULT '{}',
    "opportunities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disqualifiers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "public"."LeadProspectStatus" NOT NULL DEFAULT 'DISCOVERED',
    "outboundLeadId" TEXT,
    "visibilityAuditId" TEXT,
    "enrichmentSource" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadProspect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadProspect_workspaceRestaurantId_placeId_key" ON "public"."LeadProspect"("workspaceRestaurantId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadProspect_outboundLeadId_key" ON "public"."LeadProspect"("outboundLeadId");

-- CreateIndex
CREATE INDEX "LeadProspect_workspaceRestaurantId_status_kobOpportunityScore_idx" ON "public"."LeadProspect"("workspaceRestaurantId", "status", "kobOpportunityScore");

-- CreateIndex
CREATE INDEX "LeadProspect_status_createdAt_idx" ON "public"."LeadProspect"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."LeadProspect" ADD CONSTRAINT "LeadProspect_workspaceRestaurantId_fkey" FOREIGN KEY ("workspaceRestaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeadProspect" ADD CONSTRAINT "LeadProspect_outboundLeadId_fkey" FOREIGN KEY ("outboundLeadId") REFERENCES "public"."OutboundLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
