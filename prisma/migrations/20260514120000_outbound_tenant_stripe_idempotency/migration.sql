-- AlterTable
ALTER TABLE "OutboundLead" ADD COLUMN "workspaceRestaurantId" TEXT;

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StripeWebhookEvent_createdAt_idx" ON "StripeWebhookEvent"("createdAt");

CREATE INDEX "OutboundLead_workspaceRestaurantId_status_createdAt_idx" ON "OutboundLead"("workspaceRestaurantId", "status", "createdAt");

ALTER TABLE "OutboundLead" ADD CONSTRAINT "OutboundLead_workspaceRestaurantId_fkey" FOREIGN KEY ("workspaceRestaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
