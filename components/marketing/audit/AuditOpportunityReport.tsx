"use client";

import Link from "next/link";

import {
  formatRevenueStars,
  computeAuditOpportunityReport,
} from "@/lib/audit/audit-opportunity-from-payload";
import type { AuditOpportunityReportV1, AuditResultPayload } from "@/lib/audit/types";
import { marketingCopy } from "@/lib/marketing/copy";

function currencySymbol(code: string) {
  if (code === "GBP") return "£";
  if (code === "USD") return "$";
  if (code === "EUR") return "€";
  return `${code} `;
}

export function AuditOpportunityReport({
  auditId,
  restaurantName,
  city,
  websiteUrl,
  payload,
  unlocked,
  report: reportProp,
  onUnlockClick,
}: {
  auditId: string;
  restaurantName: string;
  city: string;
  websiteUrl?: string | null;
  payload: AuditResultPayload;
  unlocked: boolean;
  report?: AuditOpportunityReportV1 | null;
  onUnlockClick?: () => void;
}) {
  const report =
    reportProp ??
    computeAuditOpportunityReport(payload, {
      name: restaurantName,
      city,
      websiteUrl,
    });

  const metrics = report.opportunity_score;
  const reasons =
    report.reasons.length > 0
      ? report.reasons
      : report.personalization_hooks.length > 0
        ? report.personalization_hooks
        : ["Scan complete — open the full plan for prioritised fixes."];

  const lostCustomers = metrics?.est_monthly_lost_customers ?? 0;
  const lostRevenue = metrics?.est_lost_revenue ?? 0;
  const cur = currencySymbol(metrics?.currency ?? "GBP");

  const unlockHref = `#unlock`;
  const trialHref = `/audit/${auditId}/upgrade/checkout`;
  const ctaHref = unlocked ? trialHref : unlockHref;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 text-[11px] leading-snug text-[#2c2c2c]/45">
        Estimates from a public web scan — location count, city, and revenue figures can differ from
        your internal data.
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

      <div className="mb-8 overflow-hidden rounded-3xl border border-[#2c2c2c]/10 bg-white shadow-sm">
        <div className="grid grid-cols-2 gap-px bg-[#2c2c2c]/8 md:grid-cols-4">
          <div className="bg-white p-5">
            <p className="mb-1 text-xs font-medium text-[#2c2c2c]/50">Revenue Potential</p>
            <p className="text-2xl font-semibold tracking-tight text-[#1a1a1a]">
              {metrics ? formatRevenueStars(metrics.revenue_potential) : "★★★☆☆"}
            </p>
          </div>
          <div className="bg-white p-5">
            <p className="mb-1 text-xs font-medium text-[#2c2c2c]/50">Marketing Maturity</p>
            <p className="text-2xl font-semibold tracking-tight text-[#1a1a1a]">
              {metrics?.marketing_maturity ?? "—"}
              <span className="text-base font-normal text-[#2c2c2c]/40">/100</span>
            </p>
          </div>
          <div className="bg-white p-5">
            <p className="mb-1 text-xs font-medium text-[#2c2c2c]/50">Likelihood to Buy</p>
            <p className="text-2xl font-semibold tracking-tight text-[var(--color-forest-mid)]">
              {metrics?.likelihood_to_buy ?? "—"}%
            </p>
          </div>
          <div className="bg-white p-5">
            <p className="mb-1 text-xs font-medium text-[#2c2c2c]/50">Est. Lost Revenue</p>
            <p className="text-2xl font-semibold tracking-tight text-[#dc2626]">
              {cur}
              {lostRevenue.toLocaleString("en-GB")}
              <span className="text-sm font-normal text-[#2c2c2c]/40">/mo</span>
            </p>
          </div>
        </div>

        {lostCustomers > 0 ? (
          <div className="border-t border-red-100 bg-red-50 px-6 py-5">
            <p className="text-sm text-red-900">
              <span className="font-semibold">~{lostCustomers} customers per month</span> are choosing
              competitors because of visible gaps in reviews, social and website.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mb-8 rounded-3xl border border-[#2c2c2c]/10 bg-white p-6">
        <h2 className="font-semibold text-[#1a1a1a]">Why this score?</h2>
        <ul className="mt-4 space-y-2.5 text-sm text-[#2c2c2c]/80">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2.5">
              <span className="text-[var(--color-forest-mid)]" aria-hidden>
                ✓
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-8 rounded-3xl bg-[var(--color-forest)] p-8 text-white">
        <h2 className="font-heading text-xl tracking-tight md:text-2xl">The three highest-ROI fixes</h2>
        <p className="mt-3 text-sm text-white/75">
          These three actions alone typically recover the majority of the lost revenue within 45–60 days.
        </p>

        <div className="mt-6 space-y-4">
          {report.topFixes.map((fix, i) => (
            <div key={fix.title} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
                {i + 1}
              </div>
              <div>
                <p className="font-medium">{fix.title}</p>
                <p className="mt-0.5 text-sm text-white/65">{fix.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {unlocked ? (
          <Link
            href={ctaHref}
            className="mt-8 flex w-full items-center justify-center rounded-xl bg-white py-3.5 text-sm font-semibold text-[var(--color-forest)] transition hover:bg-[#f9f6f1]"
          >
            Get the full action plan + Daily Co-Pilot
          </Link>
        ) : (
          <button
            type="button"
            onClick={onUnlockClick}
            className="mt-8 w-full rounded-xl bg-white py-3.5 text-sm font-semibold text-[var(--color-forest)] transition hover:bg-[#f9f6f1]"
          >
            Get the full action plan + Daily Co-Pilot
          </button>
        )}
        <p className="mt-3 text-center text-xs text-white/50">
          No credit card required · Takes under a minute to set up
        </p>
      </div>

      <div className="text-center">
        <p className="mb-3 text-sm text-[#2c2c2c]/55">Want this broken down live?</p>
        <Link
          href="/demo"
          className="text-sm font-medium text-[var(--color-forest)] hover:underline"
        >
          Book a 12-minute walkthrough →
        </Link>
        <p className="mt-6 text-xs text-[#2c2c2c]/40">{marketingCopy.cta.freeScan} again anytime from the homepage.</p>
      </div>
    </div>
  );
}
