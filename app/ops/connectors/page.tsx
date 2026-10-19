import type { Metadata } from "next";

import { appCardSurface } from "@/lib/app-ui-classes";
import { opsConnectorsView } from "@/lib/hub/ops";

export const metadata: Metadata = {
  title: "Connectors · KOB Ops",
  description: "Integration Hub health across restaurants.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUSES = ["CONNECTED", "DEGRADED", "REAUTH", "PENDING_APPROVAL", "DISCONNECTED"] as const;
const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" });

const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]";
const td = "px-3 py-2 align-top tabular-nums";

export default async function OpsConnectorsPage() {
  const view = await opsConnectorsView();

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-5 py-10">
      <div>
        <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">Integration Hub</p>
        <h1 className="mt-2 font-head text-3xl font-semibold tracking-tight text-[var(--color-ink)]">Connectors</h1>
      </div>

      <section className={appCardSurface}>
        <h2 className="font-head text-lg font-semibold text-[var(--color-ink)]">Connections by provider</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Provider</th>
                <th className={th}>Rollout</th>
                {STATUSES.map((s) => (
                  <th key={s} className={th}>
                    {s.replace("_", " ").toLowerCase()}
                  </th>
                ))}
                <th className={th}>Webhooks 24h</th>
              </tr>
            </thead>
            <tbody>
              {view.providers.map((p) => (
                <tr key={p.provider} className="border-t border-[var(--color-hairline)]">
                  <td className={td}>{p.displayName}</td>
                  <td className={td}>
                    {p.globallyOn ? "On for all" : p.restaurantsOn ? `${p.restaurantsOn} restaurants` : "Off"}
                    <span className="block text-xs text-[var(--color-muted)]">{p.flag}</span>
                  </td>
                  {STATUSES.map((s) => (
                    <td key={s} className={td}>
                      {p.counts[s] ?? 0}
                    </td>
                  ))}
                  <td className={td}>
                    {Object.keys(p.webhooks).length
                      ? Object.entries(p.webhooks)
                          .map(([s, n]) => `${n} ${s.toLowerCase()}`)
                          .join(", ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={appCardSurface}>
        <h2 className="font-head text-lg font-semibold text-[var(--color-ink)]">Features across restaurants</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Live / Partial / Off for the {view.sampled} most recently active connected restaurants.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Feature</th>
                <th className={th}>Live</th>
                <th className={th}>Partial</th>
                <th className={th}>Off</th>
              </tr>
            </thead>
            <tbody>
              {view.features.map((f) => (
                <tr key={f.feature} className="border-t border-[var(--color-hairline)]">
                  <td className={td}>{f.label}</td>
                  <td className={td}>{f.LIVE}</td>
                  <td className={td}>{f.PARTIAL}</td>
                  <td className={td}>{f.OFF}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={appCardSurface}>
        <h2 className="font-head text-lg font-semibold text-[var(--color-ink)]">Needs attention</h2>
        {view.attention.length ? (
          <ul className="mt-4 divide-y divide-[var(--color-hairline)] text-sm">
            {view.attention.map((a) => (
              <li key={a.id} className="py-3">
                <p className="font-medium text-[var(--color-ink)]">
                  {a.restaurant} · {a.provider} · {a.status.toLowerCase()}
                </p>
                <p className="text-[var(--color-muted)]">
                  Last success {a.lastSuccessAt ? fmt.format(a.lastSuccessAt) : "never"}
                  {a.lastErrorCode ? ` · ${a.lastErrorCode}` : ""}
                </p>
                {a.failing.map((f) => (
                  <p key={f.stream} className="text-[var(--color-muted)]">
                    {f.stream}: {f.failureCount} failed run{f.failureCount === 1 ? "" : "s"}
                    {f.lastError ? ` — ${f.lastError.slice(0, 160)}` : ""}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-muted)]">Nothing failing.</p>
        )}
      </section>

      <section className={appCardSurface}>
        <h2 className="font-head text-lg font-semibold text-[var(--color-ink)]">Failed imports (7 days)</h2>
        {view.failedImports.length ? (
          <ul className="mt-4 divide-y divide-[var(--color-hairline)] text-sm">
            {view.failedImports.map((j) => (
              <li key={j.id} className="py-3">
                <p className="font-medium text-[var(--color-ink)]">
                  {j.restaurant} · {j.source} · {fmt.format(j.createdAt)}
                </p>
                {j.error ? <p className="text-[var(--color-muted)]">{j.error.slice(0, 200)}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-muted)]">None.</p>
        )}
      </section>
    </div>
  );
}
