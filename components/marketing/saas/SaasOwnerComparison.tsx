import Link from "next/link";

import { LAUNCH_PRICING, OWNER_COMPARISON, PRICING_PLANS } from "@/lib/marketing/pricing-plans";
import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";

function Check() {
  return <SaasIcon icon="solar:check-circle-bold" className="inline text-lg text-[#088924]" aria-hidden />;
}

export function SaasOwnerComparison() {
  const flex = PRICING_PLANS.find((p) => p.id === "flex");
  const flat = PRICING_PLANS.find((p) => p.id === "flat");

  return (
    <section id="compare" className="border-t border-[#2c2c2c]/5 bg-white px-6 py-24">
      <div className="mx-auto max-w-[83rem]">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="font-mono-brand mb-2 block text-xs font-semibold uppercase tracking-wider text-[#088924]">
            KOB vs {OWNER_COMPARISON.competitor}
          </span>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-[#2c2c2c] md:text-5xl">
            {OWNER_COMPARISON.headline}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#2c2c2c]/75 md:text-base">{OWNER_COMPARISON.subline}</p>
          {LAUNCH_PRICING.active ? (
            <p className="mt-4 inline-flex rounded-full bg-[#088924]/10 px-4 py-2 text-xs font-semibold text-[#094413]">
              {LAUNCH_PRICING.label} — {LAUNCH_PRICING.detail}
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#2c2c2c]/10 bg-[#fbf8f5] shadow-sm">
          <div className="grid grid-cols-3 border-b border-[#2c2c2c]/10 bg-[#f6eee5] text-left text-xs font-semibold uppercase tracking-wider text-[#2c2c2c]/60">
            <div className="p-4 md:p-6">Compare</div>
            <div className="border-l border-[#2c2c2c]/10 p-4 md:p-6 text-[#094413]">KOB</div>
            <div className="border-l border-[#2c2c2c]/10 p-4 md:p-6">{OWNER_COMPARISON.competitor}</div>
          </div>

          {OWNER_COMPARISON.rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-3 border-b border-[#2c2c2c]/8 last:border-0 text-left text-sm"
            >
              <div className="p-4 font-medium text-[#2c2c2c] md:p-5">{row.label}</div>
              <div className="flex items-start gap-2 border-l border-[#2c2c2c]/8 bg-white/80 p-4 md:p-5">
                {row.kobWins ? <Check /> : null}
                <span className="font-semibold text-[#094413]">{row.kob}</span>
              </div>
              <div className="border-l border-[#2c2c2c]/8 p-4 text-[#2c2c2c]/65 md:p-5">{row.owner}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {flex ? (
            <div className="rounded-2xl border border-[#2c2c2c]/10 bg-white p-6">
              <p className="font-mono-brand text-[10px] font-semibold uppercase tracking-wider text-[#088924]">Flex</p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-semibold text-[#094413]">${flex.priceMonthly}</span>
                <span className="text-sm text-[#2c2c2c]/60">/mo founding</span>
                {flex.regularPriceMonthly ? (
                  <span className="text-sm text-[#2c2c2c]/40 line-through">${flex.regularPriceMonthly}</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-[#088924]">{flex.priceNote}</p>
              <p className="mt-1 text-xs text-[#2c2c2c]/55">vs {OWNER_COMPARISON.ownerFlexNote}</p>
            </div>
          ) : null}
          {flat ? (
            <div className="rounded-2xl border-2 border-[#088924]/30 bg-white p-6 ring-1 ring-[#088924]/10">
              <p className="font-mono-brand text-[10px] font-semibold uppercase tracking-wider text-[#088924]">Flat</p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-semibold text-[#094413]">${flat.priceMonthly}</span>
                <span className="text-sm text-[#2c2c2c]/60">/mo founding</span>
                {flat.regularPriceMonthly ? (
                  <span className="text-sm text-[#2c2c2c]/40 line-through">${flat.regularPriceMonthly}</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-[#088924]">{flat.priceNote}</p>
              <p className="mt-1 text-xs text-[#2c2c2c]/55">vs {OWNER_COMPARISON.ownerFlatNote}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/#audit-form"
            className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-full bg-[#094413] px-8 text-sm font-semibold text-[#fbf8f5] hover:bg-[#088924]"
          >
            {marketingCopy.cta.aiReport}
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-full border border-[#2c2c2c]/15 bg-white px-8 text-sm font-semibold text-[#094413] hover:bg-[#f9f3ed]"
          >
            View full pricing
          </Link>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] leading-relaxed text-[#2c2c2c]/45">
          Owner.com pricing based on public list rates ($249/mo + 5% flex, $499/mo flat). KOB founding rates for first{" "}
          {LAUNCH_PRICING.foundingSlots} restaurants. Competitor names used for comparison only.
        </p>
      </div>
    </section>
  );
}
