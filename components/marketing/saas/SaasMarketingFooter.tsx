import Link from "next/link";

import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";

export function SaasMarketingFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#094413] px-6 pb-12 pt-20 text-[#fbf8f5]">
      <div className="mx-auto max-w-[83rem]">
        <div className="grid grid-cols-1 gap-12 border-b border-white/10 pb-16 md:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <div className="space-y-6 text-left lg:col-span-2">
            <Link href="/" className="group flex items-center gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-white">KOB</span>
              <span className="block h-2.5 w-2.5 rounded-full bg-[#088924] transition-transform group-hover:scale-125" />
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-white/70">{marketingCopy.footerTagline}</p>
            <div className="flex items-center gap-4 text-lg text-white/50">
              <Link href="/features/website" className="transition-colors hover:text-white" aria-label="Website">
                <SaasIcon icon="solar:global-linear" />
              </Link>
              <Link href="/pricing" className="transition-colors hover:text-white" aria-label="Pricing">
                <SaasIcon icon="solar:graph-up-linear" />
              </Link>
              <Link href="/features/branding" className="transition-colors hover:text-white" aria-label="Branding">
                <SaasIcon icon="solar:smartphone-linear" />
              </Link>
            </div>
          </div>

          <div className="space-y-4 text-left">
            <h5 className="font-mono-brand text-xs font-semibold uppercase tracking-wider text-white/40">Product</h5>
            <ul className="space-y-2.5 text-xs text-white/70">
              <li>
                <Link href="/product" className="transition-colors hover:text-white">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/features/online-ordering" className="transition-colors hover:text-white">
                  Online ordering
                </Link>
              </li>
              <li>
                <Link href="/features/branding" className="transition-colors hover:text-white">
                  Branding
                </Link>
              </li>
              <li>
                <Link href="/features/website" className="transition-colors hover:text-white">
                  Website
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="transition-colors hover:text-white">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4 text-left">
            <h5 className="font-mono-brand text-xs font-semibold uppercase tracking-wider text-white/40">Company</h5>
            <ul className="space-y-2.5 text-xs text-white/70">
              <li>
                <Link href="/demo" className="transition-colors hover:text-white">
                  Demo
                </Link>
              </li>
              <li>
                <Link href="/product" className="transition-colors hover:text-white">
                  Product
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="transition-colors hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="transition-colors hover:text-white">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-white">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-white">
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4 text-left">
            <h5 className="font-mono-brand text-xs font-semibold uppercase tracking-wider text-white/40">Resources</h5>
            <ul className="space-y-2.5 text-xs text-white/70">
              <li>
                <Link href="/resources" className="transition-colors hover:text-white">
                  Resource hub
                </Link>
              </li>
              <li>
                <Link href="/features/delivery" className="transition-colors hover:text-white">
                  Delivery
                </Link>
              </li>
              <li>
                <Link href="/features/ai-menu" className="transition-colors hover:text-white">
                  AI menu
                </Link>
              </li>
              <li>
                <Link href="/demo" className="transition-colors hover:text-white">
                  Book a demo
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-[11px] text-white/40 sm:flex-row">
          <p>© 2026 KOB. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
            <a href="mailto:hello@trykob.com" className="transition-colors hover:text-white">
              hello@trykob.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
