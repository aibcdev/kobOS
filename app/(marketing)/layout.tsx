import type { ReactNode } from "react";

import { MarketingPageChrome } from "@/components/marketing/MarketingPageChrome";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingPageChrome>{children}</MarketingPageChrome>;
}
