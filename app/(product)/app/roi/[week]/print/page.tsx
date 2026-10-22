import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/roi/print-button";
import { loadOwnerContext } from "@/lib/agent/owner-context";
import { providerName } from "@/lib/hub/capabilities";
import { formatMetric, weekLabel } from "@/lib/roi/format";
import { isWeekStart, sourceNames, weekView } from "@/lib/roi/ledger";
import { KOB_VALUE_EMPTY, METRIC_GROUPS, METRICS, showsAsEmpty } from "@/lib/roi/metrics";

export const dynamic = "force-dynamic";

/** One-page weekly review for the office wall or the accountant: same snapshot as the email and /app/roi. */
export default async function RoiPrintPage({ params, searchParams }: { params: Promise<{ week: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ week }, query] = await Promise.all([params, searchParams]);
  if (!isWeekStart(week)) notFound();
  const ctx = await loadOwnerContext(query.r);
  if (ctx.kind === "signed-out") redirect(`/login?next=${encodeURIComponent(`/app/roi/${week}/print`)}`);
  if (ctx.kind === "no-restaurant") redirect("/app");
  const r = typeof query.r === "string" ? query.r : null;
  const { id, locale, timezone, name } = ctx.restaurant;
  const { snapshot, saved } = await weekView(id, week);
  const stamp = new Intl.DateTimeFormat(locale, { timeZone: timezone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <main className="mx-auto max-w-2xl bg-paper px-8 py-10 print:max-w-none print:bg-white print:p-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{weekLabel(week, locale)}</p>
          <h1 className="mt-1 font-display text-3xl">Your week at {name}</h1>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <Link href={`/app/roi?week=${week}${r ? `&r=${encodeURIComponent(r)}` : ""}`} className="text-sm underline">
            Back
          </Link>
          <PrintButton />
        </div>
      </div>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="py-2 font-normal">Metric</th>
            <th className="py-2 text-right font-normal">This week</th>
            <th className="py-2 pl-4 font-normal">Records and sources</th>
          </tr>
        </thead>
        {METRIC_GROUPS.map((group) => (
          <tbody key={group.key}>
            <tr>
              <th colSpan={3} className="pt-6 pb-1 text-left">
                <p className="font-display text-lg font-normal">{group.title}</p>
                <p className="text-xs font-normal text-muted">{group.blurb}</p>
              </th>
            </tr>
            {group.metrics.map((key) => {
              const m = snapshot.metrics[key];
              if (showsAsEmpty(key, m)) {
                return (
                  <tr key={key} className="border-b border-line">
                    <td colSpan={3} className="py-3 text-sm">
                      {KOB_VALUE_EMPTY}
                    </td>
                  </tr>
                );
              }
              if (!m) return null;
              return (
                <tr key={key} className="border-b border-line align-top">
                  <td className="py-3">
                    <p className="font-medium">{METRICS[key].label}</p>
                    <p className="text-xs text-muted">{METRICS[key].explain}</p>
                  </td>
                  <td className="py-3 text-right font-display text-lg tabular-nums">{m.state === "OFF" ? "Off" : formatMetric(m, snapshot.currency, locale)}</td>
                  <td className="py-3 pl-4 text-xs text-muted">
                    {m.state === "OFF"
                      ? `Connect ${m.connect.slice(0, 2).map(providerName).join(" or ")} to see this.`
                      : `${m.count} record${m.count === 1 ? "" : "s"}${m.sources.length ? ` from ${sourceNames(m).join(", ")}` : ""}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>

      <p className="mt-6 text-xs text-muted">
        Week runs Monday to Sunday in {timezone}. Every number comes from your own records; open /app/roi in KOB to see each one. Time saved is an estimate using KOB&apos;s standard
        minutes ({snapshot.standardMinutesVersion}).{" "}
        {saved ? `Figures as reported ${stamp.format(saved.computedAt)}.` : `Not reported yet; figures as of ${stamp.format(new Date())}.`}
      </p>
    </main>
  );
}
