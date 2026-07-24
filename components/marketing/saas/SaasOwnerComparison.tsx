import Link from "next/link";

import { OWNER_COMPARISON, PRICING_PLANS } from "@/lib/marketing/pricing-plans";
import { marketingCopy } from "@/lib/marketing/copy";

import { SaasIcon } from "./SaasIcon";
import { SaasSocialProof } from "./SaasSocialProof";

function Check() {
  return <SaasIcon icon="solar:check-circle-bold" className="text-lg text-[var(--color-forest-mid)]" aria-hidden />;
}

const BENEFITS = [
  "Daily visibility tasks",
  "Approve in one tap",
  "Credits for website & SEO",
  "7-day free trial",
  "No long-term contracts",
  "Plain-English briefs",
] as const;

/** Compact comparison rows for homepage mock */
const HOME_ROWS = OWNER_COMPARISON.rows.filter((row) =>
  [
    "Monthly (flex-style plan)",
    "Daily 24/7 assistance employee",
    "Monthly (flat plan)",
    "Daily task list (reviews, holidays, hours)",
    "7-day free trial",
    "Long-term contract",
  ].includes(row.label),
);

export function SaasOwnerComparison() {
  const flex = PRICING_PLANS.find((p) => p.id === "flex");
  const flat = PRICING_PLANS.find((p) => p.id === "flat");

  return (
    <section id="compare" className="border-t border-[#2c2c2c]/5 bg-[#f9f6f1] px-6 py-10 md:py-14">
      <div className="mx-auto max-w-[83rem]">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.15fr_0.85fr] lg:items-start lg:gap-6">
          <div>
            <p className="font-mono-brand text-[11px] font-semibold tracking-[0.16em] text-[var(--color-forest-mid)] uppercase">
              {OWNER_COMPARISON.eyebrow}
            </p>
            <h2 className="font-heading mt-2 text-[2rem] tracking-tight text-[#1a1a1a] md:text-[2.5rem]">
              {OWNER_COMPARISON.headline}
            </h2>
            <ul className="mt-5 space-y-2.5">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm font-medium text-[#1a1a1a]">
                  <Check />
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-[var(--color-forest)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-forest-mid)]"
            >
              {marketingCopy.cta.startTrial} →
            </Link>
            <SaasSocialProof className="mt-5" label="Trusted by 500+ restaurant owners" />
          </div>

          <div>
            <div className="overflow-hidden rounded-2xl border border-[#2c2c2c]/10 bg-[#f3efe8]">
              <div className="grid grid-cols-3 border-b border-[#2c2c2c]/10 text-left text-[10px] font-semibold tracking-wider text-[#2c2c2c]/55 uppercase sm:text-xs">
                <div className="p-3 sm:p-4">Features</div>
                <div className="border-l border-[#2c2c2c]/10 p-3 text-[var(--color-forest)] sm:p-4">KOB</div>
                <div className="border-l border-[#2c2c2c]/10 p-3 sm:p-4">{OWNER_COMPARISON.competitor}*</div>
              </div>
              {HOME_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-3 border-b border-[#2c2c2c]/8 text-left text-xs last:border-0 sm:text-sm"
                >
                  <div className="p-3 font-medium text-[#2c2c2c] sm:p-4">{row.label}</div>
                  <div className="flex items-start gap-1.5 border-l border-[#2c2c2c]/8 bg-white/60 p-3 sm:p-4">
                    {row.kobWins ? <Check /> : null}
                    <span className="font-semibold text-[var(--color-forest)]">{row.kob}</span>
                  </div>
                  <div className="border-l border-[#2c2c2c]/8 p-3 text-[#2c2c2c]/60 sm:p-4">{row.owner}</div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#2c2c2c]/15 bg-white px-5 text-sm font-semibold text-[#1a1a1a] hover:border-[var(--color-forest)]"
              >
                View full pricing
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {flex ? (
              <div className="relative rounded-2xl border border-[#2c2c2c]/10 bg-white p-6 shadow-sm">
                <span className="absolute -top-3 right-5 rounded-full bg-[#c8e6c0] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--color-forest)] uppercase">
                  Most popular
                </span>
                <p className="font-mono-brand text-[10px] font-semibold tracking-wider text-[var(--color-forest-mid)] uppercase">
                  {flex.name}
                </p>
                <p className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span className="font-heading text-5xl tracking-tight text-[var(--color-forest)]">
                    ${flex.priceMonthly}
                  </span>
                  <span className="text-sm text-[#2c2c2c]/55">/mo</span>
                </p>
                <p className="mt-1 text-sm text-[var(--color-forest-mid)]">{flex.priceNote}</p>
                <Link
                  href="/signup"
                  className="mt-5 flex h-11 items-center justify-center rounded-full bg-[var(--color-forest)] text-sm font-semibold text-white hover:bg-[var(--color-forest-mid)]"
                >
                  {marketingCopy.cta.startTrial} →
                </Link>
              </div>
            ) : null}
            {flat ? (
              <div className="rounded-2xl border border-[#2c2c2c]/10 bg-white p-6 shadow-sm">
                <p className="font-mono-brand text-[10px] font-semibold tracking-wider text-[#2c2c2c]/50 uppercase">
                  {flat.name}
                </p>
                <p className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span className="font-heading text-5xl tracking-tight text-[var(--color-forest)]">
                    ${flat.priceMonthly}
                  </span>
                  <span className="text-sm text-[#2c2c2c]/55">/mo</span>
                </p>
                <p className="mt-1 text-sm text-[#2c2c2c]/60">{flat.priceNote}</p>
                <Link
                  href="/signup"
                  className="mt-5 flex h-11 items-center justify-center rounded-full border border-[var(--color-forest)] text-sm font-semibold text-[var(--color-forest)] hover:bg-[var(--color-forest)] hover:text-white"
                >
                  {marketingCopy.cta.startTrial}
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#2c2c2c]/45">{OWNER_COMPARISON.footnote}</p>
      </div>
    </section>
  );
}
