-- Lead engine platform-first ICP fields
ALTER TABLE "public"."LeadProspect" ADD COLUMN IF NOT EXISTS "canonicalKey" TEXT;
ALTER TABLE "public"."LeadProspect" ADD COLUMN IF NOT EXISTS "deliveryPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "public"."LeadProspect" ADD COLUMN IF NOT EXISTS "platformRank" INTEGER;
ALTER TABLE "public"."LeadProspect" ADD COLUMN IF NOT EXISTS "platformRankPercentile" DOUBLE PRECISION;
ALTER TABLE "public"."LeadProspect" ADD COLUMN IF NOT EXISTS "platformRegion" TEXT;
ALTER TABLE "public"."LeadProspect" ADD COLUMN IF NOT EXISTS "websiteStale" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."LeadProspect" ADD COLUMN IF NOT EXISTS "websiteCopyrightYear" INTEGER;

-- Backfill canonicalKey for existing rows
UPDATE "public"."LeadProspect"
SET "canonicalKey" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '', 'g')) || ':' || LOWER(REGEXP_REPLACE("city", '[^a-zA-Z0-9]+', '', 'g'))
WHERE "canonicalKey" IS NULL;

-- placeId may be pending until Google match
ALTER TABLE "public"."LeadProspect" ALTER COLUMN "placeId" DROP NOT NULL;

DROP INDEX IF EXISTS "LeadProspect_workspaceRestaurantId_placeId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "LeadProspect_workspaceRestaurantId_canonicalKey_key"
  ON "public"."LeadProspect"("workspaceRestaurantId", "canonicalKey");

CREATE INDEX IF NOT EXISTS "LeadProspect_workspaceRestaurantId_canonicalKey_idx"
  ON "public"."LeadProspect"("workspaceRestaurantId", "canonicalKey");
