-- CreateTable
CREATE TABLE "SiteScan" (
    "id" TEXT NOT NULL,
    "visibilityAuditId" TEXT NOT NULL,
    "browserbaseSessionId" TEXT,
    "screenshotUrls" JSONB NOT NULL DEFAULT '[]',
    "rawStagehandJson" JSONB,
    "visualMetricsJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteScan_visibilityAuditId_key" ON "SiteScan"("visibilityAuditId");

-- AddForeignKey
ALTER TABLE "SiteScan" ADD CONSTRAINT "SiteScan_visibilityAuditId_fkey" FOREIGN KEY ("visibilityAuditId") REFERENCES "VisibilityAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
