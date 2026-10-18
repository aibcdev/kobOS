-- T-09: where the restaurant is, and how to write dates/currency for it.
ALTER TABLE "public"."Restaurant" ADD COLUMN IF NOT EXISTS "countryCode" TEXT;
ALTER TABLE "public"."Restaurant" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'en-GB';
