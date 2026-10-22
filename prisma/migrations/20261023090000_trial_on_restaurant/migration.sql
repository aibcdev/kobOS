-- The free trial lives on the restaurant: plan TRIAL, an end date, and a billing status. Additive only.
ALTER TYPE "public"."SubscriptionPlan" ADD VALUE IF NOT EXISTS 'TRIAL';

DO $$ BEGIN
  CREATE TYPE "public"."BillingStatus" AS ENUM ('NONE', 'TRIALING', 'TRIAL_ENDED', 'ACTIVE', 'PAST_DUE', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "public"."Restaurant" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "public"."Restaurant" ADD COLUMN IF NOT EXISTS "billingStatus" "public"."BillingStatus" NOT NULL DEFAULT 'NONE';

CREATE INDEX IF NOT EXISTS "Restaurant_billingStatus_trialEndsAt_idx" ON "public"."Restaurant"("billingStatus", "trialEndsAt");
