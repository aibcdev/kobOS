import type { Metadata } from "next";
import { DemoPage } from "@/components/marketing/demo/DemoPage";

export const metadata: Metadata = {
  title: "Book a demo · KOB",
  description:
    "Talk to KOB about a free restaurant audit and approve-only daily list. We do not replace your POS. For Owner.com shoppers and UK independents.",
};

export default function MarketingDemoPage() {
  return <DemoPage />;
}
