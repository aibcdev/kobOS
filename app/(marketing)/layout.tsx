import type { ReactNode } from "react";

import { MarketingShell } from "@/components/kob-site/marketing-shell";
import { JsonLd, organizationJsonLd } from "@/lib/seo/structured-data";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingShell>
      <JsonLd data={organizationJsonLd()} />
      {children}
    </MarketingShell>
  );
}
