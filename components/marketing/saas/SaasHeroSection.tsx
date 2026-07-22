"use client";

import { AuditBusinessSearch } from "@/components/marketing/audit/AuditBusinessSearch";
import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";

const CHEF_IMAGE =
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80";

export function SaasHeroSection() {
  return (
    <section id="audit-form" className="relative overflow-hidden bg-[#f9f6f1] px-6 pb-16 pt-10 md:pb-24 md:pt-16">
      <div className="mx-auto grid max-w-[83rem] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="max-w-xl">
          <h1 className="font-heading text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-[#1a1a1a] sm:text-5xl md:text-[3.4rem]">
            {marketingCopy.heroHeadlineLead}{" "}
            <span
              className="font-accent-script inline-block text-[1.2em] font-semibold italic leading-none text-[#a8ff2e]"
              style={{ textShadow: "0 0 1px rgba(9,68,19,0.15)" }}
            >
              {marketingCopy.heroHeadlineAccent}
            </span>{" "}
            {marketingCopy.heroHeadlineTail}
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#2c2c2c]/75 md:text-base">
            {marketingCopy.heroSubline}
          </p>

          <div className="mt-8">
            <AuditBusinessSearch variant="hero" />
          </div>

          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#2c2c2c]/70">
            {marketingCopy.heroProofPoints.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <SaasIcon icon="solar:check-circle-bold" className="text-[var(--color-forest-mid)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#e8e2d8] shadow-[0_30px_60px_-28px_rgba(0,0,0,0.35)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CHEF_IMAGE}
              alt="Restaurant ready for service"
              className="aspect-[4/5] w-full object-cover object-top sm:aspect-[5/6]"
            />

            <div className="absolute left-4 top-6 w-[min(100%,220px)] rounded-2xl border border-white/60 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm sm:left-6 sm:top-10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2c2c2c]/45">
                Today&apos;s brief
              </p>
              <ul className="mt-2 space-y-2 text-sm text-[#1a1a1a]">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-[var(--color-forest-mid)]" aria-hidden>
                    ✓
                  </span>
                  Reply to 2 new reviews
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-[var(--color-forest-mid)]" aria-hidden>
                    ✓
                  </span>
                  Update opening hours
                </li>
                <li className="flex items-start gap-2 text-[#2c2c2c]/55">
                  <span className="mt-0.5" aria-hidden>
                    ○
                  </span>
                  Holiday post draft
                </li>
              </ul>
            </div>

            <div className="absolute bottom-6 right-4 w-[min(100%,210px)] rounded-2xl border border-white/60 bg-white p-3.5 shadow-lg sm:bottom-10 sm:right-6">
              <p className="text-sm font-semibold text-[#1a1a1a]">Ready to approve</p>
              <p className="mt-1 text-xs text-[#2c2c2c]/60">3 tasks · takes ~2 minutes</p>
              <button
                type="button"
                tabIndex={-1}
                className="mt-3 w-full rounded-full bg-[var(--color-forest)] py-2.5 text-sm font-semibold text-white"
              >
                Review now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
