-- Shared fixed-window rate limiter (lib/security/rate-limit.ts). Additive only.
CREATE TABLE IF NOT EXISTS "public"."RateLimitHit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("key","windowStart")
);

CREATE INDEX IF NOT EXISTS "RateLimitHit_windowStart_idx" ON "public"."RateLimitHit"("windowStart");

-- Prisma connects as the owner role (bypasses RLS); deny the Supabase Data API.
ALTER TABLE "public"."RateLimitHit" ENABLE ROW LEVEL SECURITY;
