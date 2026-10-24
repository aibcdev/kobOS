import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { SaasAuthPage } from "@/components/marketing/saas/SaasAuthPage";
import { TRIAL_DAYS_FREE } from "@/lib/billing/offer";

export const metadata: Metadata = {
  title: "Start | KOB",
  description: `Find your restaurant. ${TRIAL_DAYS_FREE}. No card.`,
};

/**
 * With a `next` (e.g. onboarding's "/onboard?resume=1"), this is the account step: show sign-up on this same URL so
 * the whole `next`, query included, reaches the sign-in form. The form only follows same-origin paths
 * (safeNextPath). Without one, people start at onboarding.
 */
export default async function MarketingSignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = (await searchParams).next;
  if (typeof next !== "string" || !next.trim()) permanentRedirect("/onboard");
  return <SaasAuthPage defaultMode="signup" />;
}
