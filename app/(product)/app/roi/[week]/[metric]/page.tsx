import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppPageShell } from "@/components/actions/app-page-shell";
import { loadOwnerContext } from "@/lib/agent/owner-context";
import { sourceLabel } from "@/lib/hub/source-ref";
import { formatValue, weekLabel } from "@/lib/roi/format";
import { isWeekStart, metricRows, reconcile, weekView } from "@/lib/roi/ledger";
import { isMetricKey, METRICS } from "@/lib/roi/metrics";
import { STANDARD_MINUTES_VERSION } from "@/lib/roi/standard-minutes";

export const dynamic = "force-dynamic";

export default async function RoiMetricPage({
  params,
  searchParams,
}: {
  params: Promise<{ week: string; metric: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { week, metric } = await params;
  const query = await searchParams;
  if (!isWeekStart(week) || !isMetricKey(metric)) notFound();
  const ctx = await loadOwnerContext(query.r);
  if (ctx.kind === "signed-out") redirect(`/login?next=${encodeURIComponent(`/app/roi/${week}/${metric}`)}`);
  if (ctx.kind === "no-restaurant") redirect("/app");
  const r = typeof query.r === "string" ? query.r : null;
  const restaurantQuery = r ? `?r=${encodeURIComponent(r)}` : "";
  const { id, timezone, locale } = ctx.restaurant;
  const spec = METRICS[metric];

  const [{ snapshot }, { rows, currency }] = await Promise.all([weekView(id, week), metricRows(id, week, metric)]);
  const check = reconcile(snapshot.metrics[metric], rows);
  const fmt = (v: number) => formatValue(v, spec.unit, currency, locale);
  const at = new Intl.DateTimeFormat(locale, { timeZone: timezone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <AppPageShell title={spec.label} subtitle={`${ctx.restaurant.name} · ${weekLabel(week, locale)}`} restaurantQuery={restaurantQuery} active="/app/roi">
      <Link href={`/app/roi?week=${week}${r ? `&r=${encodeURIComponent(r)}` : ""}`} className="text-sm text-muted underline">
        ← Back to the week
      </Link>

      <section className="rounded-3xl border border-line bg-paper p-5">
        <p className="font-display text-3xl tabular-nums">{fmt(check.total)}</p>
        <p className="mt-1 text-sm text-muted">
          {spec.explain} {check.count} record{check.count === 1 ? "" : "s"}.
        </p>
        {check.changed && check.reported !== null ? (
          <p className="mt-2 text-sm text-amber-900">
            Your report said {fmt(check.reported)}. It has changed since, usually a late refund or an import that was undone; the list below is up to date.
          </p>
        ) : null}
        {spec.unit === "minutes" ? (
          <p className="mt-2 text-xs text-muted">
            An estimate: each job counts the time it typically takes by hand (KOB standard minutes, version {STANDARD_MINUTES_VERSION}).
          </p>
        ) : null}
      </section>

      {rows.length ? (
        <ul className="divide-y divide-line rounded-3xl border border-line bg-paper">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate">{row.label}</p>
                <p className="text-xs text-muted">{sourceLabel(row.ref, timezone, locale)}</p>
                {row.note ? <p className="text-xs text-muted">{row.note}</p> : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular-nums">{fmt(row.value)}</p>
                <p className="text-xs text-muted">{at.format(row.at)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nothing this week.</p>
      )}
    </AppPageShell>
  );
}
