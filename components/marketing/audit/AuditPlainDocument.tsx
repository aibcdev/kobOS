import Link from "next/link";
import {
  computeAuditOpportunityReport,
  ensureMoneyFirstOpportunityReport,
} from "@/lib/audit/audit-opportunity-from-payload";
import type { AuditResultPayload } from "@/lib/audit/types";

/**
 * Fully server-rendered audit summary — no client JS required.
 * For teammates / link-preview tools that can't hydrate the dashboard.
 */
export function AuditPlainDocument({
  restaurantName,
  city,
  websiteUrl,
  overallScore,
  seoScore,
  designScore,
  mobileScore,
  conversionScore,
  payload,
  interactiveHref,
  signupHref = "/signup",
}: {
  restaurantName: string;
  city: string;
  websiteUrl: string | null;
  overallScore: number;
  seoScore: number;
  designScore: number;
  mobileScore: number;
  conversionScore: number;
  payload: AuditResultPayload;
  interactiveHref: string;
  signupHref?: string;
}) {
  const opportunity = ensureMoneyFirstOpportunityReport(
    payload.opportunityReport ??
      computeAuditOpportunityReport(payload, {
        name: restaurantName,
        city,
        websiteUrl,
      }),
    payload,
  );

  const metrics = opportunity.opportunity_score;
  const growthScore = opportunity.growthScore ?? overallScore;
  const lostCustomers = metrics?.est_monthly_lost_customers ?? 0;
  const peerBottom = opportunity.peerPercentileBottom ?? Math.max(5, 100 - growthScore);
  const projected = opportunity.projectedGrowthScore ?? Math.min(95, growthScore + 12);
  const wins = opportunity.topFixes.slice(0, 5);
  const nearby = opportunity.nearbyComparison ?? [];
  const issues = payload.issues ?? [];
  const rs = payload.restaurantScores;

  return (
    <article className="mx-auto max-w-3xl px-5 py-10 text-[var(--color-ink)] md:px-8 md:py-14">
      <header className="border-b border-[var(--color-hairline)] pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          KOB public audit · simple view
        </p>
        <h1 className="mt-3 font-head text-4xl font-semibold tracking-tight">{restaurantName}</h1>
        <p className="mt-2 text-base text-[var(--color-muted)]">
          {city}
          {websiteUrl ? (
            <>
              {" · "}
              <a href={websiteUrl} className="underline" rel="noreferrer">
                {websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            </>
          ) : null}
        </p>
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          No login required. This page is plain HTML so preview tools and teammates can read it without
          running the interactive report.
        </p>
        <p className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href={interactiveHref} className="font-medium text-[var(--color-primary)] underline">
            Open interactive report →
          </Link>
          <Link href={signupHref} className="font-medium text-[var(--color-primary)] underline">
            Start free trial →
          </Link>
        </p>
      </header>

      <section className="mt-10">
        <h2 className="font-head text-2xl font-semibold">Scores</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Growth score</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{growthScore}/100</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Overall</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{overallScore}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--color-muted)]">vs similar</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">Bottom {peerBottom}%</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--color-muted)]">SEO</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{seoScore}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Mobile</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{mobileScore}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Conversion</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{conversionScore}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Design</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{designScore}</dd>
          </div>
          {rs ? (
            <>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Reviews axis</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{rs.reviews}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Grade</dt>
                <dd className="mt-1 text-2xl font-semibold">{rs.grade}</dd>
              </div>
            </>
          ) : null}
        </dl>
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          Estimated customers at risk / month: ~{lostCustomers.toLocaleString("en-GB")} (range estimate,
          not a guarantee).
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-head text-2xl font-semibold">Biggest wins</h2>
        {wins.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">No wins listed for this scan yet.</p>
        ) : (
          <ol className="mt-4 list-decimal space-y-4 pl-5">
            {wins.map((w) => (
              <li key={w.title}>
                <p className="font-medium">{w.title}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{w.detail}</p>
                <p className="mt-1 text-sm font-medium">
                  +{w.customersPerMonth.toLocaleString("en-GB")} customers / month
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-head text-2xl font-semibold">Score trajectory</h2>
        <p className="mt-3 text-lg">
          Today <strong>{growthScore}</strong> → next month ~<strong>{projected}</strong> if the wins above
          are fixed.
        </p>
      </section>

      {nearby.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-head text-2xl font-semibold">Nearby comparison</h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-hairline)] text-[var(--color-muted)]">
                <th className="py-2 font-medium">Signal</th>
                <th className="py-2 font-medium">You</th>
                <th className="py-2 font-medium">Nearby</th>
              </tr>
            </thead>
            <tbody>
              {nearby.map((row) => (
                <tr key={row.label} className="border-b border-[var(--color-hairline)]">
                  <td className="py-2 pr-3">{row.label}</td>
                  <td className="py-2 pr-3">{row.you}</td>
                  <td className="py-2">{row.nearby}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {issues.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-head text-2xl font-semibold">Issues found</h2>
          <ul className="mt-4 space-y-3">
            {issues.map((issue) => (
              <li key={issue.title} className="border-b border-[var(--color-hairline)] pb-3">
                <p className="font-medium">
                  {issue.title}{" "}
                  <span className="text-sm font-normal text-[var(--color-muted)]">({issue.impact})</span>
                </p>
                {issue.fixHint ? (
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{issue.fixHint}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(payload.opportunities?.length ?? 0) > 0 ? (
        <section className="mt-12">
          <h2 className="font-head text-2xl font-semibold">Opportunities</h2>
          <ul className="mt-4 space-y-3">
            {payload.opportunities.map((o) => (
              <li key={o.title}>
                <p className="font-medium">{o.title}</p>
                <p className="text-sm text-[var(--color-muted)]">{o.impactEstimate}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="font-head text-2xl font-semibold">30 / 60 / 90 roadmap</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          {(
            [
              ["30 days", payload.gated.roadmap.days30],
              ["60 days", payload.gated.roadmap.days60],
              ["90 days", payload.gated.roadmap.days90],
            ] as const
          ).map(([label, items]) => (
            <div key={label}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                {label}
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[var(--color-muted)]">
                {items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-14 border-t border-[var(--color-hairline)] pt-8 text-sm text-[var(--color-muted)]">
        <p>
          Prefer the full UI?{" "}
          <Link href={interactiveHref} className="font-medium text-[var(--color-primary)] underline">
            Interactive report
          </Link>
          . Ready to act?{" "}
          <Link href={signupHref} className="font-medium text-[var(--color-primary)] underline">
            Start free trial
          </Link>
          .
        </p>
      </footer>
    </article>
  );
}
