import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { TRIAL_DAYS_FREE } from "@/lib/billing/offer";

export const metadata: Metadata = {
  title: "Start | KOB",
  description: `Find your restaurant. ${TRIAL_DAYS_FREE}. No card.`,
};

export default function MarketingSignupPage() {
  permanentRedirect("/onboard");
}
