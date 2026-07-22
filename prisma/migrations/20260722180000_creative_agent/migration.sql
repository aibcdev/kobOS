-- Creative Agent: brand brief + UGC / dish creatives
ALTER TYPE "public"."ContentType" ADD VALUE IF NOT EXISTS 'CREATIVE_BRAND_BRIEF';
ALTER TYPE "public"."ContentType" ADD VALUE IF NOT EXISTS 'CREATIVE_UGC';
ALTER TYPE "public"."ContentType" ADD VALUE IF NOT EXISTS 'CREATIVE_DISH';

DO $$ BEGIN
  CREATE TYPE "public"."CreativePackStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "public"."CreativePack" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "status" "public"."CreativePackStatus" NOT NULL DEFAULT 'PENDING',
    "brief" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "targetCount" INTEGER NOT NULL DEFAULT 12,
    "doneCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreativePack_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CreativePack_restaurantId_createdAt_idx" ON "public"."CreativePack"("restaurantId", "createdAt");

ALTER TABLE "public"."CreativePack"
  DROP CONSTRAINT IF EXISTS "CreativePack_restaurantId_fkey";
ALTER TABLE "public"."CreativePack"
  ADD CONSTRAINT "CreativePack_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."GeneratedContent" ADD COLUMN IF NOT EXISTS "creativePackId" TEXT;

CREATE INDEX IF NOT EXISTS "GeneratedContent_creativePackId_idx" ON "public"."GeneratedContent"("creativePackId");

ALTER TABLE "public"."GeneratedContent"
  DROP CONSTRAINT IF EXISTS "GeneratedContent_creativePackId_fkey";
ALTER TABLE "public"."GeneratedContent"
  ADD CONSTRAINT "GeneratedContent_creativePackId_fkey"
  FOREIGN KEY ("creativePackId") REFERENCES "public"."CreativePack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
