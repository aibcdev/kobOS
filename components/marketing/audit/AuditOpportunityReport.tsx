"use client";

import Link from "next/link";

import {
  ensureMoneyFirstOpportunityReport,
  computeAuditOpportunityReport,
} from "@/lib/audit/audit-opportunity-from-payload";
import type { AuditOpportunityReportV1, AuditResultPayload } from "@/lib/audit/types";
import { marketingCopy } from "@/lib/marketing/copy";

function FixWithKobButton({
  unlocked,
  trialHref,
  onUnlockClick,
  className,
}: {
  unlocked: boolean;
  trialHref: string;
  onUnlockClick?: () => void;
  className?: string;
}) {
  const base =
    className ??
    "inline-flex items-center justify-center rounded-xl bg-[var(--color-forest)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-forest-mid)]";

  if (unlocked) {
    return (
      <Link href={trialHref} className={base}>
        Fix automatically with KOB
      </Link>
    );
  }

  return (
    <button type="button" onClick={onUnlockClick} className={base}>
      Fix automatically with KOB
    </button>
  );
}

export function AuditOpportunityReport({
  auditId: _auditId,
  restaurantName,
  city,
  websiteUrl,
  payload,
  unlocked,
  report: reportProp,
  onUnlockClick,
  trialHref = "/signup",
}: {
  auditId: string;
  restaurantName: string;
  city: string;
  websiteUrl?: string | null;
  payload: AuditResultPayload;
  unlocked: boolean;
  report?: AuditOpportunityReportV1 | null;
  onUnlockClick?: () => void;
  /** Free-trial onboarding. */
  trialHref?: string;
}) {
  const baseReport =
    reportProp ??
    computeAuditOpportunityReport(payload, {
      name: restaurantName,
      city,
      websiteUrl,
    });
  const report = ensureMoneyFirstOpportunityReport(baseReport, payload);

  const metrics = report.opportunity_score;
  const lostCustomers = metrics?.est_monthly_lost_customers ?? 0;
  const growthScore = report.growthScore ?? 55;
  const peerBottom = report.peerPercentileBottom ?? Math.max(5, 100 - growthScore);
  const projected = report.projectedGrowthScore ?? Math.min(95, growthScore + 12);
  const nearby = report.nearbyComparison ?? [];
  const wins = report.topFixes.slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 text-[11px] leading-snug text-[#2c2c2c]/45">
        Estimates from a public web scan — location count and city can differ from your internal data.
      </p>

      <div className="mb-8">
        <p className="font-mono-brand text-xs font-semibold tracking-wider text-[var(--color-forest-mid)] uppercase">
          Opportunity Report
        </p>
        <h1 className="font-heading mt-1 text-3xl tracking-tight text-[#1a1a1a] md:text-4xl">
          {restaurantName}
        </h1>
        <p className="mt-1 text-sm text-[#2c2c2c]/55">
          {report.locationLabel}
          {report.displayCity ? ` · ${report.displayCity}` : ""}
        </p>
      </div>

      {/* Hero: Growth Score — customers only (no £ / revenue estimates). */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-[#2c2c2c]/10 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-6 px-6 py-8 sm:flex-row sm:justify-between sm:px-8">
          <div className="text-center sm:text-left">
            <p className="text-xs font-medium tracking-wide text-[#2c2c2c]/50 uppercase">
              Restaurant Growth Score
            </p>
            <p className="mt-2 text-5xl font-semibold tracking-tight text-[#1a1a1a] tabular-nums">
              {growthScore}
              <span className="text-2xl font-normal text-[#2c2c2c]/35">/100</span>
            </p>
            <p className="mt-2 text-sm font-medium text-[#b45309]">
              Bottom {peerBottom}% vs similar restaurants
            </p>
          </div>
          <div className="w-full max-w-sm sm:w-auto sm:min-w-[240px]">
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-center sm:text-left">
              <p className="text-xs font-medium text-red-800/70">Customers lost / month</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums text-red-900">
                ~{lostCustomers.toLocaleString("en-GB")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Biggest wins */}
      <div className="mb-8 rounded-3xl border border-[#2c2c2c]/10 bg-white p-6 md:p-8">
        <h2 className="font-heading text-xl tracking-tight text-[#1a1a1a] md:text-2xl">
          Biggest wins
        </h2>
        <p className="mt-2 text-sm text-[#2c2c2c]/60">
          Three changes that recover the most customers — fix them automatically with KOB.
        </p>

        <ol className="mt-6 space-y-5">
          {wins.map((fix, i) => (
            <li
              key={`${fix.title}-${i}`}
              className="flex flex-col gap-3 border-b border-[#2c2c2c]/8 pb-5 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-forest)]/10 text-sm font-bold text-[var(--color-forest)]">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-[#1a1a1a]">{fix.title}</p>
                  <p className="mt-0.5 text-sm text-[#2c2c2c]/55">{fix.detail}</p>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--color-forest-mid)]">
                    +{fix.customersPerMonth.toLocaleString("en-GB")} customers / month
                  </p>
                </div>
              </div>
              <FixWithKobButton
                unlocked={unlocked}
                trialHref={trialHref}
                onUnlockClick={onUnlockClick}
                className="shrink-0 rounded-xl border border-[var(--color-forest)]/20 bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-forest)] transition hover:bg-[var(--color-forest)]/5 sm:text-sm"
              />
            </li>
          ))}
        </ol>
      </div>

      {/* Nearby comparison */}
      {nearby.length > 0 ? (
        <div className="mb-8 rounded-3xl border border-[#2c2c2c]/10 bg-white p-6 md:p-8">
          <h2 className="font-heading text-xl tracking-tight text-[#1a1a1a]">Nearby comparison</h2>
          <p className="mt-2 text-sm text-[#2c2c2c]/60">How you stack up against similar restaurants nearby.</p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-[#2c2c2c]/8">
            <div className="grid grid-cols-3 gap-px bg-[#2c2c2c]/8 text-xs font-medium text-[#2c2c2c]/50">
              <div className="bg-[#f9f6f1] px-4 py-2.5">Signal</div>
              <div className="bg-[#f9f6f1] px-4 py-2.5 text-center">You</div>
              <div className="bg-[#f9f6f1] px-4 py-2.5 text-center">Nearby</div>
            </div>
            {nearby.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-3 gap-px border-t border-[#2c2c2c]/8 bg-[#2c2c2c]/8 text-sm"
              >
                <div className="bg-white px-4 py-3 font-medium text-[#1a1a1a]">{row.label}</div>
                <div className="bg-white px-4 py-3 text-center tabular-nums text-[#1a1a1a]">{row.you}</div>
                <div className="bg-white px-4 py-3 text-center tabular-nums text-[#2c2c2c]/65">
                  {row.nearby}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Trajectory */}
      <div className="mb-8 rounded-3xl border border-[#2c2c2c]/10 bg-gradient-to-br from-[#f9f6f1] to-white p-6 md:p-8">
        <h2 className="font-heading text-xl tracking-tight text-[#1a1a1a]">Score trajectory</h2>
        <p className="mt-2 text-sm text-[#2c2c2c]/60">If you fix the three wins above.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <div className="text-center">
            <p className="text-xs font-medium tracking-wide text-[#2c2c2c]/45 uppercase">Today</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-[#1a1a1a]">{growthScore}</p>
          </div>
          <span className="text-2xl text-[#2c2c2c]/25" aria-hidden>
            →
          </span>
          <div className="text-center">
            <p className="text-xs font-medium tracking-wide text-[var(--color-forest-mid)] uppercase">
              Next month
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-[var(--color-forest)]">
              ~{projected}
            </p>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="mb-8 rounded-3xl bg-[var(--color-forest)] p-8 text-center text-white">
        <h2 className="font-heading text-xl tracking-tight md:text-2xl">
          Fix this automatically with KOB
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/75">
          KOB handles the reviews, homepage, and social work so you stop leaving customers on the
          table.
        </p>
        <div className="mt-6">
          <FixWithKobButton
            unlocked={unlocked}
            trialHref={trialHref}
            onUnlockClick={onUnlockClick}
            className="inline-flex w-full max-w-sm items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[var(--color-forest)] transition hover:bg-[#f9f6f1]"
          />
        </div>
        <p className="mt-3 text-xs text-white/50">No credit card required · Takes under a minute</p>
      </div>

      <div className="text-center">
        <p className="mb-3 text-sm text-[#2c2c2c]/55">Want this broken down live?</p>
        <Link href="/demo" className="text-sm font-medium text-[var(--color-forest)] hover:underline">
          Book a 12-minute walkthrough →
        </Link>
        <p className="mt-6 text-xs text-[#2c2c2c]/40">
          {marketingCopy.cta.freeScan} again anytime from the homepage.
        </p>
      </div>
    </div>
  );
}
