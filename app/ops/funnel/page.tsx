import type { Metadata } from "next";
import Link from "next/link";

import { appCardSurface } from "@/lib/app-ui-classes";
import { loadAcquisitionFunnel } from "@/lib/ops/acquisition-funnel";

export const metadata: Metadata = {
  title: "Ops · Acquisition funnel · KOB",
  description: "Clicks → audits → trials for KOB Google Ads.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OpsFunnelPage() {
  const f = await loadAcquisitionFunnel();

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
