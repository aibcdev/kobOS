ALTER TABLE "public"."OutboundLead"
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "resendEmailId" TEXT;

CREATE UNIQUE INDEX "OutboundLead_resendEmailId_key"
  ON "public"."OutboundLead"("resendEmailId");

CREATE TABLE "public"."OutboundDelivery" (
  "id" TEXT NOT NULL,
  "outboundLeadId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "bouncedAt" TIMESTAMP(3),
  "complainedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutboundDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OutboundDelivery_outboundLeadId_fkey"
    FOREIGN KEY ("outboundLeadId") REFERENCES "public"."OutboundLead"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OutboundDelivery_outboundLeadId_key" ON "public"."OutboundDelivery"("outboundLeadId");
CREATE UNIQUE INDEX "OutboundDelivery_idempotencyKey_key" ON "public"."OutboundDelivery"("idempotencyKey");
CREATE UNIQUE INDEX "OutboundDelivery_providerMessageId_key" ON "public"."OutboundDelivery"("providerMessageId");
CREATE INDEX "OutboundDelivery_status_createdAt_idx" ON "public"."OutboundDelivery"("status", "createdAt");
CREATE INDEX "OutboundDelivery_sentAt_idx" ON "public"."OutboundDelivery"("sentAt");

CREATE TABLE "public"."OutboundSuppression" (
  "id" TEXT NOT NULL,
  "normalizedEmail" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutboundSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutboundSuppression_normalizedEmail_key"
  ON "public"."OutboundSuppression"("normalizedEmail");
CREATE INDEX "OutboundSuppression_reason_createdAt_idx"
  ON "public"."OutboundSuppression"("reason", "createdAt");

ALTER TABLE "public"."VisibilityAudit"
  ADD COLUMN "processingAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "processingStartedAt" TIMESTAMP(3),
  ADD COLUMN "processingCompletedAt" TIMESTAMP(3),
  ADD COLUMN "processingLastError" TEXT;

ALTER TYPE "public"."ServiceRequestType" ADD VALUE IF NOT EXISTS 'SOCIAL_TEXT';
ALTER TYPE "public"."ServiceRequestType" ADD VALUE IF NOT EXISTS 'SOCIAL_IMAGES';
ALTER TYPE "public"."ServiceRequestType" ADD VALUE IF NOT EXISTS 'SOCIAL_VIDEO';
ALTER TYPE "public"."ServiceRequestStatus" ADD VALUE IF NOT EXISTS 'DRAFTS_READY';
ALTER TYPE "public"."ServiceRequestStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

ALTER TABLE "public"."ServiceRequest"
  ADD COLUMN "reservedCredits" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "chargedAt" TIMESTAMP(3),
  ADD COLUMN "approvedDraftId" TEXT;

CREATE TABLE "public"."ServiceRequestDraft" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "draftNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "assetUrl" TEXT,
  "previewToken" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceRequestDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceRequestDraft_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "public"."ServiceRequest"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceRequestDraft_previewToken_key" ON "public"."ServiceRequestDraft"("previewToken");
CREATE UNIQUE INDEX "ServiceRequestDraft_requestId_draftNumber_key" ON "public"."ServiceRequestDraft"("requestId", "draftNumber");
CREATE INDEX "ServiceRequestDraft_requestId_createdAt_idx" ON "public"."ServiceRequestDraft"("requestId", "createdAt");

CREATE TABLE "public"."OpsHeartbeat" (
  "key" TEXT NOT NULL,
  "lastSuccessAt" TIMESTAMP(3) NOT NULL,
  "detail" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpsHeartbeat_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "CreditLedgerEntry_requestId_key"
ON "public"."CreditLedgerEntry"("requestId");
