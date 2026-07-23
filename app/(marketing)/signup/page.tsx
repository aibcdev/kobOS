import type { Metadata } from "next";

import { SaasSignupPage } from "@/components/marketing/saas/SaasSignupPage";

export const metadata: Metadata = {
  title: "Start free trial | KOB",
  description:
    "Start your free 7-day trial. See what’s holding your restaurant back — opportunity report in minutes. No card required.",
};

export default function MarketingSignupPage() {
  return <SaasSignupPage />;
}
