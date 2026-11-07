import type { Metadata } from "next";
import Link from "next/link";

import { appCardSurface } from "@/lib/app-ui-classes";
import { loadAcquisitionFunnel } from "@/lib/ops/acquisition-funnel";
import { loadRecentActivity } from "@/lib/ops/recent-activity";

export const metadata: Metadata = {
  title: "Ops · Acquisition funnel · KOB",
  description: "Clicks → audits → trials for KOB Google Ads.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OpsFunnelPage() {
  const [f, recent] = await Promise.all([loadAcquisitionFunnel(), loadRecentActivity(48)]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">
        Acquisition
      </p>
      <h1 className="mt-2 font-head text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
        Clicks → audits → trials
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
        KOB B2B Search since {new Date(f.since).toLocaleString()}. {f.adsNote}
      </p>

      <section className={`mt-8 ${appCardSurface}`}>
        <h2 className="text-base font-semibold text-[var(--color-ink)]">Last 48 hours</h2>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Visits are counted per UTC day from {recent.visitsSinceDay}, with no cookies. Outbound audits are KOB
          prospecting, not visitors.
        </p>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          {[
            ["Visits started", recent.visits.entries, `${recent.visits.views} page views`],
            [
              "Audits by visitors",
              recent.audits.visitor,
              `${recent.audits.outbound} outbound · ${recent.audits.internal} internal`,
            ],
            ["New accounts", recent.newAccounts, `${recent.auditEmails} audit emails · ${recent.trialsStarted} trials`],
          ].map(([label, value, note]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">{label}</dt>
              <dd className="mt-1 font-head text-3xl font-semibold tabular-nums text-[var(--color-ink)]">{value}</dd>
              <dd className="text-xs text-[var(--color-muted)]">{note}</dd>
            </div>
          ))}
        </dl>
        {recent.visits.topSources.length || recent.visits.topPages.length ? (
          <div className="mt-4 grid gap-4 text-sm text-[var(--color-muted)] sm:grid-cols-2">
            <ul>
              {recent.visits.topSources.map((s) => (
                <li key={s.source} className="flex justify-between gap-2">
                  <span>{s.source}</span>
                  <span className="tabular-nums">{s.entries}</span>
                </li>
              ))}
            </ul>
            <ul>
              {recent.visits.topPages.map((p) => (
                <li key={p.path} className="flex justify-between gap-2">
                  <span className="truncate">{p.path}</span>
                  <span className="tabular-nums">{p.views}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className={appCardSurface}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
            Clicks
          </p>
          <p className="mt-2 font-head text-4xl font-semibold tabular-nums text-[var(--color-ink)]">
            {f.clicks}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {f.impressions} impr · £{f.spendGbp.toFixed(2)} spend
          </p>
        </div>
        <div className={appCardSurface}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
            Audits from ads
          </p>
          <p className="mt-2 font-head text-4xl font-semibold tabular-nums text-[var(--color-ink)]">
            {f.auditsFromAds}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {f.auditsTotal} audits total · CTR→audit{" "}
            {f.rates.clickToAuditPct == null ? "—" : `${f.rates.clickToAuditPct}%`}
          </p>
        </div>
        <div className={appCardSurface}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]">
            Trials from ads
          </p>
          <p className="mt-2 font-head text-4xl font-semibold tabular-nums text-[var(--color-ink)]">
            {f.trialsFromAds}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {f.trialsTotal} trials total · audit→trial{" "}
            {f.rates.auditToTrialPct == null ? "—" : `${f.rates.auditToTrialPct}%`}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className={appCardSurface}>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Recent audits</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {f.recentAudits.length === 0 ? (
              <li className="text-[var(--color-muted)]">None since launch window.</li>
            ) : (
              f.recentAudits.map((a) => (
                <li key={a.id} className="flex justify-between gap-2 text-[var(--color-muted)]">
                  <span>
                    <Link href={`/audit/${a.id}`} className="text-[var(--color-primary)] no-underline">
                      {a.restaurantName}
                    </Link>
                    {a.fromAds ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase text-amber-800">
                        Ads
                      </span>
                    ) : null}
                    {a.origin === "outbound" || a.origin === "internal" ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase text-[var(--color-muted-medium)]">
                        {a.origin}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
        <section className={appCardSurface}>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Recent trials</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {f.recentTrials.length === 0 ? (
              <li className="text-[var(--color-muted)]">None since launch window.</li>
            ) : (
              f.recentTrials.map((t) => (
                <li key={t.restaurantId} className="flex justify-between gap-2 text-[var(--color-muted)]">
                  <span>
                    {t.name}
                    {t.fromAds ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase text-amber-800">
                        Ads
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {new Date(t.trialStartedAt).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <p className="mt-8 text-sm text-[var(--color-muted)]">
        <Link href="/ops" className="text-[var(--color-primary)] no-underline">
          ← Ops overview
        </Link>
        {" · "}
        Refresh Ads metrics:{" "}
        <code className="text-xs">python ads/funnel_snapshot.py</code>
      </p>
    </div>
  );
}
