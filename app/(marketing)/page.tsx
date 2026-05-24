import type { Metadata } from "next";

import { defaultSiteMeta } from "@/lib/homepage-defaults";

import { MarketingHome } from "@/components/marketing/MarketingHome";

export const metadata: Metadata = {
  title: { absolute: defaultSiteMeta.title },
  description: defaultSiteMeta.description,
};

export default function MarketingHomePage() {
  return <MarketingHome />;
}
