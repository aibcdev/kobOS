-- Credits + human-fulfilled service requests
ALTER TABLE "public"."Restaurant" ADD COLUMN IF NOT EXISTS "creditBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "public"."Restaurant" ADD COLUMN IF NOT EXISTS "creditsRefreshedAt" TIMESTAMP(3);

DO $$ BEGIN
  CREATE TYPE "public"."ServiceRequestType" AS ENUM ('WEBSITE', 'LOGO', 'SEO_RESURFACE', 'CREATIVE_PACK', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."ServiceRequestStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."CreditLedgerReason" AS ENUM ('MONTHLY_GRANT', 'SERVICE_REQUEST', 'MANUAL_ADJUST', 'REFUND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "public"."ServiceRequest" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "type" "public"."ServiceRequestType" NOT NULL,
    "status" "public"."ServiceRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "creditCost" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ServiceRequest_restaurantId_createdAt_idx" ON "public"."ServiceRequest"("restaurantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ServiceRequest_status_createdAt_idx" ON "public"."ServiceRequest"("status", "createdAt");

ALTER TABLE "public"."ServiceRequest" DROP CONSTRAINT IF EXISTS "ServiceRequest_restaurantId_fkey";
ALTER TABLE "public"."ServiceRequest"
  ADD CONSTRAINT "ServiceRequest_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "public"."CreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" "public"."CreditLedgerReason" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CreditLedgerEntry_restaurantId_createdAt_idx" ON "public"."CreditLedgerEntry"("restaurantId", "createdAt");

ALTER TABLE "public"."CreditLedgerEntry" DROP CONSTRAINT IF EXISTS "CreditLedgerEntry_restaurantId_fkey";
ALTER TABLE "public"."CreditLedgerEntry"
  ADD CONSTRAINT "CreditLedgerEntry_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
