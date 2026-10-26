-- Assisted posting: the owner approves, copies and posts on Google themselves. Additive only.
ALTER TYPE "public"."OsActionStatus" ADD VALUE IF NOT EXISTS 'DONE_BY_OWNER';
ALTER TABLE "public"."CustomerReview" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
-- Both tables already have deny-all RLS (docs/adr/0002-rls-deny-all.md); re-assert it for this release.
ALTER TABLE "public"."OsAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CustomerReview" ENABLE ROW LEVEL SECURITY;
