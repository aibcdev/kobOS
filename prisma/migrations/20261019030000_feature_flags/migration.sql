-- Per-restaurant feature flag overrides (lib/flags.ts). Additive only.
CREATE TABLE IF NOT EXISTS "public"."FeatureFlagOverride" (
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlagOverride_pkey" PRIMARY KEY ("restaurantId","name")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeatureFlagOverride_restaurantId_fkey') THEN
    ALTER TABLE "public"."FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_restaurantId_fkey"
      FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Prisma connects as the owner role (bypasses RLS); deny the Supabase Data API.
ALTER TABLE "public"."FeatureFlagOverride" ENABLE ROW LEVEL SECURITY;
