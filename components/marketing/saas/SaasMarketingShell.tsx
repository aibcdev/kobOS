import type { ReactNode } from "react";

import { SaasMarketingFooter } from "./SaasMarketingFooter";
import { SaasMarketingHeader } from "./SaasMarketingHeader";

export function SaasMarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f9f3ed]">
      <SaasMarketingHeader />
      <main>{children}</main>
      <SaasMarketingFooter />
    </div>
  );
}
