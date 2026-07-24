"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SaasMarketingShell } from "@/components/marketing/saas/SaasMarketingShell";

/** Audit funnel: report, scanning, upgrade, plain share view — Owner header only (no marketing footer). */
function isAuditFunnelPath(pathname: string | null) {
  if (!pathname) return false;
  return /^\/audit\/[^/]+(\/(scanning|upgrade(\/checkout)?|plain)?)?$/.test(pathname);
}

/** All other marketing routes use SaaS template header + footer. */
export function MarketingPageChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isAuditFunnelPath(pathname)) {
    return <>{children}</>;
  }
  return <SaasMarketingShell>{children}</SaasMarketingShell>;
}
