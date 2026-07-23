"use client";

import { AuditBusinessSearch } from "@/components/marketing/audit/AuditBusinessSearch";
import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";

const CHEF_IMAGE =
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80";

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=64&h=64&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=64&h=64&q=80",
] as const;

export function SaasHeroSection() {
  return (
    <section id="audit-form" className="relative overflow-hidden bg-[#f9f6f1] px-6 pb-6 pt-8 md:pb-8 md:pt-10">
      <div className="mx-auto grid max-w-[83rem] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-[#2c2c2c]/55 uppercase">
            <SaasIcon icon="solar:shield-check-bold" className="text-[var(--color-forest-mid)]" />
            {marketingCopy.heroTrustBadge}
          </p>

          <h1 className="font-heading mt-3 text-[2.75rem] leading-[1.08] tracking-tight text-[var(--color-forest)] sm:text-5xl md:text-[3.5rem]">
            {marketingCopy.heroHeadlineLead}{" "}
            <em className="italic">{marketingCopy.heroHeadlineAccent}</em>{" "}
            {marketingCopy.heroHeadlineTail}
          </h1>

          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#2c2c2c]/70 md:text-base">
            {marketingCopy.heroSubline}
          </p>
          <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-[#2c2c2c]/70 md:text-base">
            {marketingCopy.heroSublineSecondary}
          </p>

          <div className="mt-5">
            <AuditBusinessSearch variant="hero" />
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#2c2c2c]/70">
            {marketingCopy.heroProofPoints.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <SaasIcon icon="solar:check-circle-bold" className="text-[var(--color-forest-mid)]" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex -space-x-2">
              {AVATARS.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="h-8 w-8 rounded-full border-2 border-[#f9f6f1] object-cover"
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-[#2c2c2c]/70">
              <span className="tracking-tight text-[#e8a317]" aria-label="5 stars">
                ★★★★★
              </span>
              <span>{marketingCopy.heroSocialProof}</span>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <p className="font-accent-script absolute -left-2 top-[42%] z-20 hidden max-w-[9.5rem] -rotate-6 text-lg leading-snug text-[var(--color-forest)] lg:block xl:-left-8">
            {marketingCopy.heroAnnotation}
            <svg
              className="mt-1 ml-6 h-10 w-16 text-[var(--color-forest)]"
              viewBox="0 0 64 40"
              fill="none"
              aria-hidden
            >
              <path
                d="M2 8c18 2 28 18 48 22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M42 24l10 6-8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </p>

          <div className="relative overflow-hidden rounded-[2rem] bg-[#e8e2d8] shadow-[0_30px_60px_-28px_rgba(0,0,0,0.35)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CHEF_IMAGE}
              alt="Restaurant ready for service"
              className="aspect-[4/5] w-full object-cover object-top sm:aspect-[5/6]"
            />

            <div className="absolute top-6 left-4 w-[min(100%,220px)] rounded-2xl border border-white/60 bg-white/95 p-3.5 shadow-lg backdrop-blur-sm sm:top-10 sm:left-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-wider text-[#2c2c2c]/45 uppercase">
                  Today&apos;s brief
                </p>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-forest)] px-1.5 text-[10px] font-bold text-white">
                  3
                </span>
              </div>
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
                  Update your opening hours
                </li>
                <li className="flex items-start gap-2 text-[#2c2c2c]/55">
                  <span className="mt-0.5" aria-hidden>
                    ○
                  </span>
                  Holiday post draft
                </li>
              </ul>
            </div>

            <div className="absolute right-4 bottom-6 w-[min(100%,210px)] rounded-2xl border border-white/60 bg-white p-3.5 shadow-lg sm:right-6 sm:bottom-10">
              <p className="text-sm font-semibold text-[#1a1a1a]">Ready to approve</p>
              <p className="mt-1 text-xs text-[#2c2c2c]/60">3 tasks · takes ~2 minutes</p>
              <button
                type="button"
                tabIndex={-1}
                className="mt-3 w-full rounded-full bg-[var(--color-forest)] py-2.5 text-sm font-semibold text-white"
              >
                Review &amp; approve →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
