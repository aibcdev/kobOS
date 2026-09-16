"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SaasMarketingShell } from "@/components/marketing/saas/SaasMarketingShell";

/** Only old SaaS template pages get that banner. Homepage and onboard never do. */
function usesSaasBanner(pathname: string | null) {
  if (!pathname) return false;
  if (pathname === "/") return false;
  if (pathname === "/onboard" || pathname.startsWith("/onboard/")) return false;
  if (pathname.startsWith("/audit")) return false;
  return (
    pathname === "/pricing" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/resources") ||
    pathname.startsWith("/features") ||
    pathname.startsWith("/solutions") ||
    pathname === "/demo"
  );
}

export function MarketingPageChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!usesSaasBanner(pathname)) {
    return <>{children}</>;
  }
  return <SaasMarketingShell>{children}</SaasMarketingShell>;
}
