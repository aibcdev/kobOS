-- Link visibility audits to a workspace restaurant after signup / trial (optional FK).
ALTER TABLE "VisibilityAudit" ADD COLUMN "restaurantId" TEXT;

CREATE INDEX "VisibilityAudit_restaurantId_idx" ON "VisibilityAudit"("restaurantId");

ALTER TABLE "VisibilityAudit" ADD CONSTRAINT "VisibilityAudit_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
