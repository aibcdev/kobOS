-- Product emails to owners, one row per send; dedupeKey makes each send happen once. Additive only.
CREATE TABLE IF NOT EXISTS "public"."OwnerEmail" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "providerId" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OwnerEmail_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OwnerEmail_dedupeKey_key" ON "public"."OwnerEmail"("dedupeKey");
CREATE INDEX IF NOT EXISTS "OwnerEmail_restaurantId_kind_sentAt_idx" ON "public"."OwnerEmail"("restaurantId", "kind", "sentAt");
DO $$ BEGIN
  ALTER TABLE "public"."OwnerEmail" ADD CONSTRAINT "OwnerEmail_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Deny-all RLS like every other public table; the app reaches it through Prisma.
ALTER TABLE "public"."OwnerEmail" ENABLE ROW LEVEL SECURITY;
