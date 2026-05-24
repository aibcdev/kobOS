-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('FOOD_PHOTO', 'VIDEO', 'LOGO', 'BRANDING', 'WEBSITE_SCREENSHOT');

-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('GOOGLE', 'YELP', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewReplyStatus" AS ENUM ('DRAFT', 'APPROVED', 'POSTED');

-- CreateEnum
CREATE TYPE "AgentActionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "OutboundLeadStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'SENT', 'CONTACTED', 'RESPONDED', 'CONVERTED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "vibe" TEXT,
ADD COLUMN "googleBusinessUrl" TEXT;

-- CreateTable
CREATE TABLE "DailyScan" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "scanDate" DATE NOT NULL,
    "visibilityScore" INTEGER,
    "visualHealthScore" INTEGER,
    "reviewHealthScore" INTEGER,
    "briefingJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "url" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReview" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "source" "ReviewSource" NOT NULL,
    "externalReviewId" TEXT,
    "reviewerName" TEXT,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "replied" BOOLEAN NOT NULL DEFAULT false,
    "relationshipScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReply" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "replyText" TEXT NOT NULL DEFAULT '',
    "status" "ReviewReplyStatus" NOT NULL DEFAULT 'DRAFT',
    "postedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewerProfile" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactInfo" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "influenceScore" INTEGER NOT NULL DEFAULT 0,
    "lastContactAt" TIMESTAMP(3),

    CONSTRAINT "ReviewerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentAction" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "AgentActionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundLead" (
    "id" TEXT NOT NULL,
    "city" TEXT,
    "restaurantName" TEXT,
    "websiteUrl" TEXT,
    "insightSummary" TEXT,
    "messageSubject" TEXT,
    "messageBody" TEXT,
    "suggestedTone" TEXT,
    "status" "OutboundLeadStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyScan_restaurantId_scanDate_key" ON "DailyScan"("restaurantId", "scanDate");

-- CreateIndex
CREATE INDEX "DailyScan_restaurantId_idx" ON "DailyScan"("restaurantId");

-- CreateIndex
CREATE INDEX "Asset_restaurantId_type_idx" ON "Asset"("restaurantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerReview_source_externalReviewId_key" ON "CustomerReview"("source", "externalReviewId");

-- CreateIndex
CREATE INDEX "CustomerReview_restaurantId_reviewedAt_idx" ON "CustomerReview"("restaurantId", "reviewedAt");

-- CreateIndex
CREATE INDEX "ReviewReply_reviewId_idx" ON "ReviewReply"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewerProfile_restaurantId_idx" ON "ReviewerProfile"("restaurantId");

-- CreateIndex
CREATE INDEX "AgentAction_restaurantId_createdAt_idx" ON "AgentAction"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundLead_status_createdAt_idx" ON "OutboundLead"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "DailyScan" ADD CONSTRAINT "DailyScan_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "CustomerReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerProfile" ADD CONSTRAINT "ReviewerProfile_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
