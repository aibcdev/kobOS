-- Multi-channel outbound sequence (email → Instagram → Facebook)
CREATE TYPE "OutboundSequenceStatus" AS ENUM (
  'EMAIL_SENT',
  'INSTAGRAM_QUEUED',
  'INSTAGRAM_SENT',
  'READY_FOR_FACEBOOK',
  'FACEBOOK_QUEUED',
  'FACEBOOK_SENT',
  'REPLIED',
  'COMPLETED',
  'STOPPED'
);

CREATE TYPE "OutboundChannelStatus" AS ENUM (
  'PENDING',
  'QUEUED',
  'SENT',
  'FAILED',
  'SKIPPED',
  'REPLIED'
);

CREATE TABLE "OutboundSequence" (
  "id" TEXT NOT NULL,
  "outboundLeadId" TEXT NOT NULL,
  "workspaceRestaurantId" TEXT,
  "restaurantName" TEXT NOT NULL,
  "city" TEXT NOT NULL DEFAULT '',
  "observation" TEXT NOT NULL,
  "emailAngle" TEXT NOT NULL DEFAULT 'general',
  "emailSentAt" TIMESTAMP(3) NOT NULL,
  "emailReplied" BOOLEAN NOT NULL DEFAULT false,
  "emailOpened" BOOLEAN,
  "instagramHandle" TEXT,
  "instagramUrl" TEXT,
  "instagramDmText" TEXT,
  "instagramDmStatus" "OutboundChannelStatus" NOT NULL DEFAULT 'PENDING',
  "instagramDmQueuedAt" TIMESTAMP(3),
  "instagramDmSentAt" TIMESTAMP(3),
  "facebookPageUrl" TEXT,
  "facebookMsgText" TEXT,
  "facebookMsgStatus" "OutboundChannelStatus" NOT NULL DEFAULT 'PENDING',
  "facebookMsgQueuedAt" TIMESTAMP(3),
  "facebookMsgSentAt" TIMESTAMP(3),
  "sequenceStatus" "OutboundSequenceStatus" NOT NULL DEFAULT 'EMAIL_SENT',
  "stopReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OutboundSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutboundSequence_outboundLeadId_key" ON "OutboundSequence"("outboundLeadId");
CREATE INDEX "OutboundSequence_sequenceStatus_emailSentAt_idx" ON "OutboundSequence"("sequenceStatus", "emailSentAt");
CREATE INDEX "OutboundSequence_instagramDmStatus_emailSentAt_idx" ON "OutboundSequence"("instagramDmStatus", "emailSentAt");
CREATE INDEX "OutboundSequence_facebookMsgStatus_instagramDmSentAt_idx" ON "OutboundSequence"("facebookMsgStatus", "instagramDmSentAt");
CREATE INDEX "OutboundSequence_workspaceRestaurantId_sequenceStatus_idx" ON "OutboundSequence"("workspaceRestaurantId", "sequenceStatus");

ALTER TABLE "OutboundSequence" ADD CONSTRAINT "OutboundSequence_outboundLeadId_fkey"
  FOREIGN KEY ("outboundLeadId") REFERENCES "OutboundLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
