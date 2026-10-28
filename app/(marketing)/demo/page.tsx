import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/page-metadata";
import { DemoPage } from "@/components/marketing/demo/DemoPage";

export const metadata: Metadata = pageMetadata({
  title: "Book a demo",
  description:
    "Book a call about reviews, your Google listing, website mistakes and supplier prices. KOB drafts, you approve and post in one tap.",
  path: "/demo",
});

export default function MarketingDemoPage() {
  return <DemoPage />;
}
