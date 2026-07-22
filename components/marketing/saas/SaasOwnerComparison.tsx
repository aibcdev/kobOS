import Link from "next/link";

import { LAUNCH_PRICING, OWNER_COMPARISON, PRICING_PLANS } from "@/lib/marketing/pricing-plans";
import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";

function Check() {
  return <SaasIcon icon="solar:check-circle-bold" className="text-lg text-[var(--color-forest-mid)]" aria-hidden />;
}

const BENEFITS = [
  "Free scan before you pay",
  "Daily list you approve",
  "Credits for website & SEO requests",
  "7-day free trial · no long contracts",
] as const;

export function SaasOwnerComparison() {
  const flex = PRICING_PLANS.find((p) => p.id === "flex");
  const flat = PRICING_PLANS.find((p) => p.id === "flat");

  return (
    <section id="compare" className="border-t border-[#2c2c2c]/5 bg-white px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[83rem]">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr_0.9fr] lg:items-start lg:gap-10">
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-[#1a1a1a] md:text-4xl">
              Same kind of help.{" "}
              <span className="text-[var(--color-forest)]">Lower price.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#2c2c2c]/70">{OWNER_COMPARISON.subline}</p>
            <ul className="mt-8 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm font-medium text-[#1a1a1a]">
                  <Check />
                  {b}
                </li>
              ))}
            </ul>
            {LAUNCH_PRICING.active ? (
              <p className="mt-6 inline-flex rounded-full bg-[var(--color-bright-green)]/25 px-3 py-1.5 text-xs font-semibold text-[var(--color-forest)]">
                {LAUNCH_PRICING.label}
              </p>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#2c2c2c]/10 bg-[#f9f6f1]">
            <div className="grid grid-cols-3 border-b border-[#2c2c2c]/10 bg-[#f0ebe3] text-left text-[10px] font-semibold uppercase tracking-wider text-[#2c2c2c]/55 sm:text-xs">
              <div className="p-3 sm:p-4">Feature</div>
              <div className="relative border-l border-[#2c2c2c]/10 p-3 text-[var(--color-forest)] sm:p-4">
                KOB
                <span className="absolute -top-2.5 left-2 rounded-full bg-[var(--color-bright-green)] px-2 py-0.5 text-[9px] font-bold tracking-wide text-[#1a1a1a] uppercase">
                  Best value
                </span>
              </div>
              <div className="border-l border-[#2c2c2c]/10 p-3 sm:p-4">{OWNER_COMPARISON.competitor}</div>
            </div>
            {OWNER_COMPARISON.rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-3 border-b border-[#2c2c2c]/8 text-left text-xs last:border-0 sm:text-sm"
              >
                <div className="p-3 font-medium text-[#2c2c2c] sm:p-4">{row.label}</div>
                <div className="flex items-start gap-1.5 border-l border-[#2c2c2c]/8 bg-white/70 p-3 sm:p-4">
                  {row.kobWins ? <Check /> : null}
                  <span className="font-semibold text-[var(--color-forest)]">{row.kob}</span>
                </div>
                <div className="border-l border-[#2c2c2c]/8 p-3 text-[#2c2c2c]/60 sm:p-4">{row.owner}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {flex ? (
              <div className="relative rounded-2xl border-2 border-[var(--color-forest)] bg-white p-6 shadow-sm">
                <span className="absolute -top-3 left-5 rounded-full bg-[var(--color-bright-green)] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[#1a1a1a] uppercase">
                  Most popular
                </span>
                <p className="font-mono-brand text-[10px] font-semibold uppercase tracking-wider text-[var(--color-forest-mid)]">
                  {flex.name}
                </p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="font-heading text-4xl font-semibold text-[var(--color-forest)]">
                    ${flex.priceMonthly}
                  </span>
                  <span className="text-sm text-[#2c2c2c]/55">/mo founding</span>
                </p>
                <p className="mt-1 text-sm text-[var(--color-forest-mid)]">{flex.priceNote}</p>
                <Link
                  href="/#audit-form"
                  className="mt-5 flex h-11 items-center justify-center rounded-full bg-[var(--color-forest)] text-sm font-semibold text-white hover:bg-[var(--color-forest-mid)]"
                >
                  {marketingCopy.cta.freeScan}
                </Link>
              </div>
            ) : null}
            {flat ? (
              <div className="rounded-2xl border border-[#2c2c2c]/12 bg-white p-6">
                <p className="font-mono-brand text-[10px] font-semibold uppercase tracking-wider text-[#2c2c2c]/50">
                  {flat.name}
                </p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="font-heading text-4xl font-semibold text-[#1a1a1a]">${flat.priceMonthly}</span>
                  <span className="text-sm text-[#2c2c2c]/55">/mo founding</span>
                </p>
                <p className="mt-1 text-sm text-[#2c2c2c]/60">{flat.priceNote}</p>
                <Link
                  href="/#audit-form"
                  className="mt-5 flex h-11 items-center justify-center rounded-full border border-[#2c2c2c]/20 text-sm font-semibold text-[#1a1a1a] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)]"
                >
                  {marketingCopy.cta.freeScan}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
