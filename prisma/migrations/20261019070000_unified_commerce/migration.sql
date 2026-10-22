-- T-87: Unified commerce (Spec 2 §4). Additive only: four SalesSnapshotSource values and seven new tables.
-- Money is integer minor units next to an ISO 4217 currency; fact rows carry SourceRef columns.
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SalesSnapshotSource" ADD VALUE 'EPOS_NOW';
ALTER TYPE "SalesSnapshotSource" ADD VALUE 'ZETTLE';
ALTER TYPE "SalesSnapshotSource" ADD VALUE 'CLOVER';
ALTER TYPE "SalesSnapshotSource" ADD VALUE 'IMPORT';

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "displayName" TEXT,
    "firstSeenAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpendMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT,
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestIdentity" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT,
    "valueHash" TEXT NOT NULL,
    "encryptedValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestConsent" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "sourceExternalId" TEXT NOT NULL,
    "sourceImportJobId" TEXT,
    "evidenceJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "guestId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "status" TEXT NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "currency" TEXT NOT NULL,
    "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "tipMinor" INTEGER NOT NULL DEFAULT 0,
    "serviceChargeMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL,
    "refundedMinor" INTEGER NOT NULL DEFAULT 0,
    "externalLocationId" TEXT,
    "sourceKind" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "sourceExternalId" TEXT NOT NULL,
    "sourceImportJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemLinkId" TEXT,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "modifiersJson" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "guestId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "partySize" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "depositMinor" INTEGER,
    "currency" TEXT,
    "externalLocationId" TEXT,
    "sourceKind" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "sourceExternalId" TEXT NOT NULL,
    "sourceImportJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemLink" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalName" TEXT NOT NULL,
    "category" TEXT,
    "priceMinor" INTEGER,
    "currency" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guest_restaurantId_lastSeenAt_idx" ON "Guest"("restaurantId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "GuestIdentity_guestId_idx" ON "GuestIdentity"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestIdentity_restaurantId_kind_valueHash_key" ON "GuestIdentity"("restaurantId", "kind", "valueHash");

-- CreateIndex
CREATE INDEX "GuestConsent_guestId_channel_purpose_capturedAt_idx" ON "GuestConsent"("guestId", "channel", "purpose", "capturedAt");

-- CreateIndex
CREATE INDEX "GuestConsent_restaurantId_idx" ON "GuestConsent"("restaurantId");

-- CreateIndex
CREATE INDEX "Order_restaurantId_placedAt_idx" ON "Order"("restaurantId", "placedAt");

-- CreateIndex
CREATE INDEX "Order_guestId_idx" ON "Order"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_restaurantId_sourceProvider_sourceExternalId_key" ON "Order"("restaurantId", "sourceProvider", "sourceExternalId");

-- CreateIndex
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");

-- CreateIndex
CREATE INDEX "OrderLine_menuItemLinkId_idx" ON "OrderLine"("menuItemLinkId");

-- CreateIndex
CREATE INDEX "Booking_restaurantId_startsAt_idx" ON "Booking"("restaurantId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_guestId_idx" ON "Booking"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_restaurantId_sourceProvider_sourceExternalId_key" ON "Booking"("restaurantId", "sourceProvider", "sourceExternalId");

-- CreateIndex
CREATE INDEX "MenuItemLink_menuItemId_idx" ON "MenuItemLink"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemLink_restaurantId_provider_externalId_key" ON "MenuItemLink"("restaurantId", "provider", "externalId");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestIdentity" ADD CONSTRAINT "GuestIdentity_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestIdentity" ADD CONSTRAINT "GuestIdentity_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestConsent" ADD CONSTRAINT "GuestConsent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestConsent" ADD CONSTRAINT "GuestConsent_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_menuItemLinkId_fkey" FOREIGN KEY ("menuItemLinkId") REFERENCES "MenuItemLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemLink" ADD CONSTRAINT "MenuItemLink_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemLink" ADD CONSTRAINT "MenuItemLink_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "OsMenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Deny-all RLS (T-07): the app connects as the table owner; anon/authenticated roles see nothing.
ALTER TABLE "public"."Guest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."GuestIdentity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."GuestConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OrderLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MenuItemLink" ENABLE ROW LEVEL SECURITY;
