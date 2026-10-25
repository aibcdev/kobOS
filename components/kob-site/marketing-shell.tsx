"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { MarkdownAlternate } from "@/components/kob-site/markdown-alternate";
import { SiteFooter } from "@/components/kob-site/site-footer";
import { SiteNav } from "@/components/kob-site/site-nav";

export function MarketingShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const onPhoto = path === "/";
  return (
    <div className="kob-employee min-h-dvh bg-bone text-espresso">
      <MarkdownAlternate />
      <SiteNav onPhoto={onPhoto} />
      {children}
      <SiteFooter />
    </div>
  );
}
