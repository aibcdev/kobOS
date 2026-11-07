-- Visit counts and audit origin. Additive only.
ALTER TABLE "public"."VisibilityAudit" ADD COLUMN IF NOT EXISTS "origin" TEXT;
CREATE INDEX IF NOT EXISTS "VisibilityAudit_origin_createdAt_idx" ON "public"."VisibilityAudit"("origin", "createdAt");

-- Audits an outreach lead points at were KOB auditing a prospect.
UPDATE "public"."VisibilityAudit" SET "origin" = 'outbound'
WHERE "origin" IS NULL AND "id" IN (
  SELECT "visibilityAuditId" FROM "public"."OutboundLead" WHERE "visibilityAuditId" IS NOT NULL
  UNION
  SELECT "visibilityAuditId" FROM "public"."LeadProspect" WHERE "visibilityAuditId" IS NOT NULL
);
-- Only the site form records a landing page, a "how did you hear" answer or ad tags.
UPDATE "public"."VisibilityAudit" SET "origin" = 'visitor'
WHERE "origin" IS NULL
  AND COALESCE("landingPath", "heardFrom", "utmSource", "gclid") IS NOT NULL;

CREATE TABLE IF NOT EXISTS "public"."SiteVisitDay" (
  "day" DATE NOT NULL,
  "path" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "entries" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SiteVisitDay_pkey" PRIMARY KEY ("day", "path", "source")
);
CREATE INDEX IF NOT EXISTS "SiteVisitDay_day_idx" ON "public"."SiteVisitDay"("day");
-- Deny-all RLS like every other table (docs/adr/0002-rls-deny-all.md); only the server writes it.
ALTER TABLE "public"."SiteVisitDay" ENABLE ROW LEVEL SECURITY;
