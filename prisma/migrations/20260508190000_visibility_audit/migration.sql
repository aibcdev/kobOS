-- CreateTable
CREATE TABLE "VisibilityAudit" (
    "id" TEXT NOT NULL,
    "restaurantName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "overallScore" INTEGER NOT NULL,
    "seoScore" INTEGER NOT NULL,
    "designScore" INTEGER NOT NULL,
    "mobileScore" INTEGER NOT NULL,
    "conversionScore" INTEGER NOT NULL,
    "resultPayload" JSONB NOT NULL DEFAULT '{}',
    "leadEmail" TEXT,
    "leadPhone" TEXT,
    "leadCapturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisibilityAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisibilityAudit_createdAt_idx" ON "VisibilityAudit"("createdAt");
