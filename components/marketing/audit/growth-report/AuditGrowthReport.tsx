"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { GrowthReportV2, ImpactLevel } from "@/lib/audit/growth-report-v2";

function ImpactPill({ impact }: { impact: ImpactLevel }) {
  const tone =
    impact === "High"
      ? "text-[var(--color-primary)]"
      : impact === "Unknown"
        ? "text-[var(--color-muted)]"
        : "text-[var(--color-ink)]";
  return <span className={`text-sm font-medium ${tone}`}>{impact}</span>;
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-24 border-t border-[var(--color-hairline)] pt-12">
      <h2 className="font-head text-2xl font-semibold tracking-tight text-[var(--color-ink)] md:text-[1.75rem]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function formatBand(band: string) {
  return band.replaceAll("_", " ");
}

export function AuditGrowthReport({
  report,
  scanStillRunning,
  trialHref = "/signup",
}: {
  report: GrowthReportV2;
  scanStillRunning?: boolean;
  /** Free-trial onboarding — all Fix / Start CTAs go here. */
  trialHref?: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-surface-cream,#f9f3ed)] text-[var(--color-ink)]">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
        {scanStillRunning ? (
          <p className="mb-8 text-sm text-[var(--color-muted)]">Still refining a few signals…</p>
        ) : null}

        <header className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
            {report.hero.title}
          </p>
          <h1 className="font-head text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
            {report.hero.restaurantName}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--color-muted)] md:text-lg">
            {report.hero.subtitle}
          </p>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--color-muted)]">
            <div>
              <dt className="sr-only">Cuisine</dt>
              <dd>{report.hero.cuisine}</dd>
            </div>
            <div>
              <dt className="sr-only">Location</dt>
              <dd>{report.hero.location}</dd>
            </div>
            <div>
              <dt className="sr-only">Date</dt>
              <dd>Analysed {report.hero.analysedAtLabel}</dd>
            </div>
          </dl>
        </header>

        <section className="mt-14">
          <h2 className="font-head text-2xl font-semibold tracking-tight">Growth Potential</h2>
          <p className="mt-4 font-head text-5xl font-semibold tracking-tight text-[var(--color-primary)] md:text-6xl">
            {formatBand(report.growthPotential.band)}
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-muted)]">
            {report.growthPotential.explanation}
          </p>
        </section>

        {/* Customers only — no £ / revenue figures (skeptical owners). */}
        <section className="mt-14 border-t border-[var(--color-hairline)] pt-12">
          <h2 className="font-head text-2xl font-semibold tracking-tight">Monthly Growth Opportunity</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Potential additional customers per month</p>
          <p className="mt-4 font-head text-5xl font-semibold tracking-tight">
            {report.monthlyOpportunity.customersLow}–{report.monthlyOpportunity.customersHigh}
          </p>
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            Estimated range from gaps vs similar restaurants — not a precise forecast.
          </p>
        </section>

        <Section title="Opportunity Breakdown">
          <ul className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            {report.channelImpact.map((row) => (
              <li key={row.channel} className="flex items-center justify-between py-4">
                <span className="font-medium">{row.channel}</span>
                <span className="text-sm text-[var(--color-muted)]">
                  Potential impact <ImpactPill impact={row.impact} />
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="How you compare">
          {report.benchmarks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Not enough peer data yet for this scan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[20rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-hairline)] text-[var(--color-muted)]">
                    <th className="py-3 font-medium">Metric</th>
                    <th className="py-3 font-medium">You</th>
                    <th className="py-3 font-medium">Similar restaurants</th>
                  </tr>
                </thead>
                <tbody>
                  {report.benchmarks.map((row) => (
                    <tr key={row.label} className="border-b border-[var(--color-hairline)]">
                      <td className="py-3 pr-4">{row.label}</td>
                      <td className="py-3 pr-4 font-medium">{row.you}</td>
                      <td className="py-3 text-[var(--color-muted)]">{row.similar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Restaurants You're Competing Against">
          {report.competitors.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              We couldn&apos;t resolve nearby independent competitors for this location yet.
            </p>
          ) : (
            <ul className="space-y-6">
              {report.competitors.map((c) => (
                <li key={c.name} className="border-b border-[var(--color-hairline)] pb-6 last:border-0">
                  <p className="font-head text-lg font-semibold">{c.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{c.note}</p>
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-[var(--color-muted)]">Rating</dt>
                      <dd className="mt-1 font-medium">{c.rating != null ? `${c.rating.toFixed(1)}★` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-muted)]">Reviews</dt>
                      <dd className="mt-1 font-medium">
                        {c.reviewCount != null ? c.reviewCount.toLocaleString("en-GB") : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-muted)]">Photos</dt>
                      <dd className="mt-1 font-medium">{c.photoCount != null ? c.photoCount : "—"}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Top five highest-impact improvements">
          <ol className="space-y-8">
            {report.topImprovements.map((item, i) => (
              <li key={item.title} className="border-b border-[var(--color-hairline)] pb-8 last:border-0">
                <div className="flex items-baseline gap-3">
                  <span className="text-sm text-[var(--color-muted)]">{i + 1}</span>
                  <h3 className="font-head text-xl font-semibold">{item.title}</h3>
                </div>
                <p className="mt-3 text-base leading-relaxed text-[var(--color-muted)]">{item.whyItMatters}</p>
                <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <div>
                    <dt className="text-[var(--color-muted)]">Potential impact</dt>
                    <dd className="mt-0.5">
                      <ImpactPill impact={item.impact} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">Difficulty</dt>
                    <dd className="mt-0.5 font-medium">{item.difficulty}</dd>
                  </div>
                </dl>
                <Link
                  href={trialHref}
                  className="mt-5 inline-flex min-h-10 items-center text-sm font-medium text-[var(--color-primary)] no-underline"
                >
                  Fix with KOB →
                </Link>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Website Health">
          <ul className="space-y-4">
            {report.websiteHealth.map((w) => (
              <li key={w.statement} className="flex items-start justify-between gap-4">
                <span className="leading-relaxed">{w.statement}</span>
                <ImpactPill impact={w.impact} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Google Presence">
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-[var(--color-muted)]">Rating</dt>
              <dd className="mt-1 text-2xl font-semibold">
                {report.googlePresence.rating != null ? report.googlePresence.rating.toFixed(1) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">Reviews</dt>
              <dd className="mt-1 text-2xl font-semibold">
                {report.googlePresence.reviewCount != null
                  ? report.googlePresence.reviewCount.toLocaleString("en-GB")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">Photos</dt>
              <dd className="mt-1 text-2xl font-semibold">
                {report.googlePresence.photoCount != null ? report.googlePresence.photoCount : "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Strengths</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted)]">
                {(report.googlePresence.strengths.length
                  ? report.googlePresence.strengths
                  : ["No standout strengths detected yet"]
                ).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium">Weaknesses</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted)]">
                {(report.googlePresence.weaknesses.length
                  ? report.googlePresence.weaknesses
                  : ["No major weaknesses flagged"]
                ).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section title="Social Presence">
          <ul className="divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
            {report.socialPresence.channels.map((ch) => (
              <li key={ch.name} className="flex justify-between py-3 text-sm">
                <span className="font-medium">{ch.name}</span>
                <span className="text-[var(--color-muted)]">{ch.status}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{report.socialPresence.summary}</p>
        </Section>

        <Section title="Customer Trust">
          <p className="font-head text-4xl font-semibold tracking-tight">
            {report.customerTrust.score != null ? report.customerTrust.score : "—"}
            <span className="ml-3 text-lg font-medium text-[var(--color-muted)]">{report.customerTrust.label}</span>
          </p>
          <ul className="mt-4 space-y-1 text-sm text-[var(--color-muted)]">
            {report.customerTrust.factors.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Section>

        <Section title="Quick Wins">
          <p className="mb-6 text-sm text-[var(--color-muted)]">Improvements that typically take under 15 minutes.</p>
          <ul className="space-y-4">
            {report.quickWins.map((q) => (
              <li
                key={q.title}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--color-hairline)] pb-4"
              >
                <span className="font-medium">{q.title}</span>
                <span className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
                  ~{q.effortMinutes} min · <ImpactPill impact={q.impact} />
                  <Link href={trialHref} className="font-medium text-[var(--color-primary)] no-underline">
                    Fix →
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Weekly Growth Tracking">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-[var(--color-muted)]">Today</p>
              <p className="mt-2 font-head text-5xl font-semibold">{report.weeklyTracking.today}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-muted)]">Potential after improvements</p>
              <p className="mt-2 font-head text-5xl font-semibold text-[var(--color-primary)]">
                {report.weeklyTracking.potential}
              </p>
            </div>
          </div>
        </Section>

        <section className="mt-16 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-6 py-10 md:px-10">
          <h2 className="font-head text-2xl font-semibold tracking-tight md:text-3xl">{report.finalCta.headline}</h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--color-muted)]">{report.finalCta.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={trialHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-6 text-sm font-medium text-white no-underline"
            >
              Start Free Trial
            </Link>
            <Link
              href="/demo"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-transparent px-6 text-sm font-medium no-underline"
            >
              Book Demo
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
