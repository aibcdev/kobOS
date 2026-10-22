-- AlterTable
ALTER TABLE "RoiWeek" ADD COLUMN     "costMicros" BIGINT;

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "inputUnits" INTEGER NOT NULL DEFAULT 0,
    "outputUnits" INTEGER NOT NULL DEFAULT 0,
    "costMicros" BIGINT NOT NULL,
    "priceVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageEvent_restaurantId_occurredAt_idx" ON "UsageEvent"("restaurantId", "occurredAt");

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Deny-all RLS (T-07): the app connects as the table owner; anon/authenticated roles see nothing.
ALTER TABLE "public"."UsageEvent" ENABLE ROW LEVEL SECURITY;
