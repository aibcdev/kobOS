"use client";

import Link from "next/link";
import { useState } from "react";

import { SaasIcon } from "./SaasIcon";

export function SaasMarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#2c2c2c]/5 bg-[#f9f3ed]/80 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex h-20 max-w-[83rem] items-center justify-between px-6 md:px-12">
        <Link href="/" className="group flex items-center gap-1.5">
          <span className="text-xl font-bold tracking-tight text-[#094413] transition-colors">KOB</span>
          <span className="block h-2 w-2 rounded-full bg-[#088924] transition-transform group-hover:scale-125" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-[#2c2c2c]/80 md:flex">
          <div className="relative">
            <button
              type="button"
              aria-expanded={productsDropdownOpen}
              aria-haspopup="true"
              onClick={() => setProductsDropdownOpen((open) => !open)}
              onBlur={() => {
                window.setTimeout(() => setProductsDropdownOpen(false), 200);
              }}
              className="flex items-center gap-1 py-2 transition-colors hover:text-[#094413]"
            >
              Products
              <SaasIcon
                icon="solar:alt-arrow-down-linear"
                stroke-width="1.5"
                className={`text-xs transition-transform ${productsDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            <div
              className={`absolute left-1/2 top-full mt-2 w-72 -translate-x-1/2 rounded-2xl border border-[#2c2c2c]/10 bg-[#fbf8f5] p-4 shadow-xl transition-all duration-200 ${
                productsDropdownOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
              }`}
            >
              <Link
                href="/features/website"
                className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#094413]/5"
              >
                <SaasIcon icon="solar:laptop-minimalistic-linear" className="mt-0.5 text-xl text-[#088924]" />
                <div>
                  <p className="text-sm font-medium text-[#094413]">Your online shop window</p>
                  <p className="text-xs text-[#2c2c2c]/60">What guests see before they book</p>
                </div>
              </Link>
              <Link
                href="/features/online-ordering"
                className="mt-1 flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#094413]/5"
              >
                <SaasIcon icon="solar:global-linear" className="mt-0.5 text-xl text-[#088924]" />
                <div>
                  <p className="text-sm font-medium text-[#094413]">Booking & ordering</p>
                  <p className="text-xs text-[#2c2c2c]/60">Make it obvious how to book</p>
                </div>
              </Link>
              <Link
                href="/features/branding"
                className="mt-1 flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#094413]/5"
              >
                <SaasIcon icon="solar:smartphone-linear" className="mt-0.5 text-xl text-[#088924]" />
                <div>
                  <p className="text-sm font-medium text-[#094413]">Posts & promotions</p>
                  <p className="text-xs text-[#2c2c2c]/60">Holiday and social drafts to approve</p>
                </div>
              </Link>
            </div>
          </div>
          <Link href="/pricing" className="py-2 transition-colors hover:text-[#094413]">
            Pricing
          </Link>
          <Link href="/resources" className="py-2 transition-colors hover:text-[#094413]">
            Resources
          </Link>
        </nav>

        <div className="flex items-center gap-4 md:gap-6">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-[#2c2c2c]/80 transition-colors hover:text-[#094413] sm:inline-block"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="hidden text-sm font-medium text-[#094413] underline-offset-4 transition-colors hover:underline sm:inline-block"
          >
            Sign up
          </Link>
          <Link
            href="/#audit-form"
            className="inline-flex transform items-center justify-center rounded-full bg-[#094413] px-5 py-2.5 text-sm font-medium text-[#fbf8f5] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#088924]"
          >
            Free AI scan
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex items-center p-1 text-[#2c2c2c] md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <SaasIcon icon={mobileMenuOpen ? "solar:close-square-linear" : "solar:hamburger-menu-linear"} className="text-2xl" />
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="animate-fade-in space-y-4 border-b border-[#2c2c2c]/10 bg-[#f9f3ed] px-6 py-6 md:hidden">
          <div className="space-y-1">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#088924]">Products</p>
            <Link
              href="/features/website"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#2c2c2c] hover:text-[#094413]"
            >
              AI website
            </Link>
            <Link
              href="/features/online-ordering"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#2c2c2c] hover:text-[#094413]"
            >
              Online ordering
            </Link>
            <Link
              href="/features/branding"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#2c2c2c] hover:text-[#094413]"
            >
              Branding
            </Link>
          </div>
          <hr className="border-[#2c2c2c]/5" />
          <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-sm text-[#2c2c2c] hover:text-[#094413]">
            Pricing
          </Link>
          <Link href="/resources" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-sm text-[#2c2c2c] hover:text-[#094413]">
            Resources
          </Link>
          <hr className="border-[#2c2c2c]/5" />
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-full border border-[#2c2c2c]/10 py-2 text-center text-sm text-[#2c2c2c] hover:text-[#094413]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-full bg-[#094413] py-2 text-center text-sm text-[#fbf8f5] hover:bg-[#088924]"
            >
              Sign up
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
