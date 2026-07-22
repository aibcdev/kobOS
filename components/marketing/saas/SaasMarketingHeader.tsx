"use client";

import Link from "next/link";
import { useState } from "react";

import { MarketingAuthNav } from "./MarketingAuthNav";
import { SaasIcon } from "./SaasIcon";

export function SaasMarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#2c2c2c]/5 bg-[#f9f6f1]/90 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-[83rem] items-center justify-between px-6 md:px-12">
        <Link href="/" className="group flex items-center gap-1.5">
          <span className="font-heading text-xl font-bold tracking-tight text-[var(--color-forest)]">KOB</span>
          <span className="block h-2 w-2 rounded-full bg-[var(--color-bright-green)] transition-transform group-hover:scale-125" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-[#2c2c2c]/75 md:flex">
          <Link href="/#how-it-works" className="py-2 transition-colors hover:text-[var(--color-forest)]">
            How it works
          </Link>
          <Link href="/pricing" className="py-2 transition-colors hover:text-[var(--color-forest)]">
            Pricing
          </Link>
          <Link href="/#compare" className="py-2 transition-colors hover:text-[var(--color-forest)]">
            About
          </Link>
          <div className="relative">
            <button
              type="button"
              aria-expanded={resourcesOpen}
              onClick={() => setResourcesOpen((o) => !o)}
              onBlur={() => window.setTimeout(() => setResourcesOpen(false), 200)}
              className="flex items-center gap-1 py-2 transition-colors hover:text-[var(--color-forest)]"
            >
              Resources
              <SaasIcon
                icon="solar:alt-arrow-down-linear"
                className={`text-xs transition-transform ${resourcesOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div
              className={`absolute left-1/2 top-full mt-2 w-56 -translate-x-1/2 rounded-2xl border border-[#2c2c2c]/10 bg-white p-3 shadow-xl transition-all ${
                resourcesOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <Link href="/resources" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-[#f9f6f1]">
                Resource hub
              </Link>
              <Link href="/demo" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-[#f9f6f1]">
                Book a demo
              </Link>
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-3 md:gap-5">
          <MarketingAuthNav compact />
          <Link
            href="/#audit-form"
            className="hidden items-center justify-center rounded-full bg-[var(--color-forest)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-forest-mid)] sm:inline-flex"
          >
            Run free scan
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex items-center p-1 text-[#2c2c2c] md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <SaasIcon
              icon={mobileMenuOpen ? "solar:close-square-linear" : "solar:hamburger-menu-linear"}
              className="text-2xl"
            />
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="space-y-3 border-b border-[#2c2c2c]/10 bg-[#f9f6f1] px-6 py-5 md:hidden">
          <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm">
            How it works
          </Link>
          <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm">
            Pricing
          </Link>
          <Link href="/#compare" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm">
            About
          </Link>
          <Link href="/resources" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm">
            Resources
          </Link>
          <hr className="border-[#2c2c2c]/10" />
          <MarketingAuthNav mobile onNavigate={() => setMobileMenuOpen(false)} />
          <Link
            href="/#audit-form"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-full bg-[var(--color-forest)] py-3 text-center text-sm font-semibold text-white"
          >
            Run free scan
          </Link>
        </div>
      ) : null}
    </header>
  );
}
