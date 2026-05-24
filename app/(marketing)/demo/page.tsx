import type { Metadata } from "next";
import { DemoPage } from "@/components/marketing/demo/DemoPage";

export const metadata: Metadata = {
  title: "Book a demo · KOB",
  description:
    "See how KOB helps independent restaurants grow online — free AI visibility scan, SEO priorities, and your growth roadmap.",
};

export default function MarketingDemoPage() {
  return <DemoPage />;
}
