import type { Metadata } from "next";
import { DemoPage } from "@/components/marketing/demo/DemoPage";

export const metadata: Metadata = {
  title: "Book a demo · KOB",
  description:
    "Book a call about reviews, your Google listing, website mistakes and supplier prices. KOB does not replace your till.",
};

export default function MarketingDemoPage() {
  return <DemoPage />;
}
