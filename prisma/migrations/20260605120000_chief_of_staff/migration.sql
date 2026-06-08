-- Chief of Staff task queue + daily brief cache; AI personality on Restaurant

CREATE TYPE "public"."AiPersonality" AS ENUM ('BALANCED', 'WARM', 'DIRECT', 'CONCISE', 'SASSY');
CREATE TYPE "public"."TaskSource" AS ENUM ('AUDIT', 'AI', 'ENGINE', 'MANUAL');
CREATE TYPE "public"."TaskStatus" AS ENUM ('PENDING', 'APPROVED', 'DONE', 'DISMISSED');
CREATE TYPE "public"."TaskCategory" AS ENUM ('REVIEWS', 'SOCIAL', 'SEO', 'EMAIL', 'HOLIDAY', 'MENU', 'COMPETITOR', 'OPERATIONS', 'CONTENT');

ALTER TABLE "public"."Restaurant" ADD COLUMN "aiPersonality" "public"."AiPersonality" NOT NULL DEFAULT 'BALANCED';

CREATE TABLE "public"."ChiefOfStaffTask" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "category" "public"."TaskCategory" NOT NULL,
    "source" "public"."TaskSource" NOT NULL,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "impactLabel" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 5,
    "confidenceScore" INTEGER NOT NULL DEFAULT 75,
    "revenueLowGbp" INTEGER,
    "revenueHighGbp" INTEGER,
    "requiresIntegration" TEXT,
    "draftPayload" JSONB,
    "auditId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChiefOfStaffTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."DailyBriefSnapshot" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "briefDate" DATE NOT NULL,
    "greeting" TEXT NOT NULL,
    "summaryJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyBriefSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChiefOfStaffTask_restaurantId_status_createdAt_idx" ON "public"."ChiefOfStaffTask"("restaurantId", "status", "createdAt");

CREATE UNIQUE INDEX "DailyBriefSnapshot_restaurantId_briefDate_key" ON "public"."DailyBriefSnapshot"("restaurantId", "briefDate");

CREATE INDEX "DailyBriefSnapshot_restaurantId_idx" ON "public"."DailyBriefSnapshot"("restaurantId");

ALTER TABLE "public"."ChiefOfStaffTask" ADD CONSTRAINT "ChiefOfStaffTask_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."DailyBriefSnapshot" ADD CONSTRAINT "DailyBriefSnapshot_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
