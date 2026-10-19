-- T-81: Integration Hub data model (Spec 2 §3.5). Additive only: new provider enum values, nullable/defaulted
-- Integration columns (existing rows become status CONNECTED, authKind OAUTH2_CODE), and three new tables.
-- AlterEnum


ALTER TYPE "IntegrationProvider" ADD VALUE 'STRIPE_CONNECT';
ALTER TYPE "IntegrationProvider" ADD VALUE 'CLOVER';
ALTER TYPE "IntegrationProvider" ADD VALUE 'LIGHTSPEED_K';
ALTER TYPE "IntegrationProvider" ADD VALUE 'EPOS_NOW';
ALTER TYPE "IntegrationProvider" ADD VALUE 'ZETTLE';
ALTER TYPE "IntegrationProvider" ADD VALUE 'RESDIARY';
ALTER TYPE "IntegrationProvider" ADD VALUE 'SEVENROOMS';
ALTER TYPE "IntegrationProvider" ADD VALUE 'TOCK';
ALTER TYPE "IntegrationProvider" ADD VALUE 'XERO';
ALTER TYPE "IntegrationProvider" ADD VALUE 'QUICKBOOKS';
ALTER TYPE "IntegrationProvider" ADD VALUE 'KLAVIYO';
ALTER TYPE "IntegrationProvider" ADD VALUE 'MAILCHIMP';
ALTER TYPE "IntegrationProvider" ADD VALUE 'PURPLE_WIFI';
ALTER TYPE "IntegrationProvider" ADD VALUE 'BEAMBOX';
ALTER TYPE "IntegrationProvider" ADD VALUE 'DEPUTY';
ALTER TYPE "IntegrationProvider" ADD VALUE 'SEVENSHIFTS';
ALTER TYPE "IntegrationProvider" ADD VALUE 'PLANDAY';
ALTER TYPE "IntegrationProvider" ADD VALUE 'ROTAREADY';
ALTER TYPE "IntegrationProvider" ADD VALUE 'TRIPADVISOR';
ALTER TYPE "IntegrationProvider" ADD VALUE 'YELP';

-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "authKind" TEXT NOT NULL DEFAULT 'OAUTH2_CODE',
ADD COLUMN     "connectedByUserId" UUID,
ADD COLUMN     "disconnectedAt" TIMESTAMP(3),
ADD COLUMN     "encryptedApiKey" TEXT,
ADD COLUMN     "externalAccountId" TEXT,
ADD COLUMN     "lastErrorAt" TIMESTAMP(3),
ADD COLUMN     "lastErrorCode" TEXT,
ADD COLUMN     "lastHealthAt" TIMESTAMP(3),
ADD COLUMN     "lastSuccessAt" TIMESTAMP(3),
ADD COLUMN     "region" TEXT,
ADD COLUMN     "scopesGranted" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'CONNECTED';

-- CreateTable
CREATE TABLE "SyncCursor" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "stream" TEXT NOT NULL,
    "cursor" TEXT,
    "backfillDone" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "rowsLastRun" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3),

    CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "restaurantId" TEXT,
    "integrationId" TEXT,
    "externalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,

    CONSTRAINT "ConnectorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSha256" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "mappingJson" JSONB NOT NULL DEFAULT '{}',
    "rowsTotal" INTEGER NOT NULL DEFAULT 0,
    "rowsImported" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorsJson" JSONB NOT NULL DEFAULT '[]',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncCursor_nextRunAt_idx" ON "SyncCursor"("nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncCursor_integrationId_stream_key" ON "SyncCursor"("integrationId", "stream");

-- CreateIndex
CREATE INDEX "ConnectorEvent_restaurantId_receivedAt_idx" ON "ConnectorEvent"("restaurantId", "receivedAt");

-- CreateIndex
CREATE INDEX "ConnectorEvent_status_receivedAt_idx" ON "ConnectorEvent"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectorEvent_provider_externalId_key" ON "ConnectorEvent"("provider", "externalId");

-- CreateIndex
CREATE INDEX "ImportJob_restaurantId_createdAt_idx" ON "ImportJob"("restaurantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJob_restaurantId_fileSha256_key" ON "ImportJob"("restaurantId", "fileSha256");

-- CreateIndex
CREATE INDEX "Integration_provider_externalAccountId_idx" ON "Integration"("provider", "externalAccountId");

-- CreateIndex
CREATE INDEX "Integration_status_idx" ON "Integration"("status");

-- AddForeignKey
ALTER TABLE "SyncCursor" ADD CONSTRAINT "SyncCursor_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "public"."SyncCursor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ConnectorEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ImportJob" ENABLE ROW LEVEL SECURITY;
