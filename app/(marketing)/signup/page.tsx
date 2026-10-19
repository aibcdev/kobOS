import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Start | KOB",
  description: "Find your restaurant. 7 days free. No card.",
};

export default function MarketingSignupPage() {
  permanentRedirect("/onboard");
}
