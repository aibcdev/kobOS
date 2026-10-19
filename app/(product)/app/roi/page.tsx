import Link from "next/link";
import { redirect } from "next/navigation";
import { AppPageShell } from "@/components/actions/app-page-shell";
import { loadOwnerContext } from "@/lib/agent/owner-context";
import { providerName } from "@/lib/hub/capabilities";
import { formatMetric, weekLabel } from "@/lib/roi/format";
import { isWeekStart, lastCompletedWeek, recentWeeks, sourceNames, weekView } from "@/lib/roi/ledger";
import { KOB_VALUE_EMPTY, METRIC_GROUPS, METRICS, showsAsEmpty } from "@/lib/roi/metrics";

export const dynamic = "force-dynamic";

export default async function RoiPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ctx = await loadOwnerContext(params.r);
  if (ctx.kind === "signed-out") redirect("/login?next=%2Fapp%2Froi");
  if (ctx.kind === "no-restaurant") redirect("/app");
  const r = typeof params.r === "string" ? params.r : null;
  const restaurantQuery = r ? `?r=${encodeURIComponent(r)}` : "";
  const withR = (path: string) => (r ? `${path}${path.includes("?") ? "&" : "?"}r=${encodeURIComponent(r)}` : path);
  const { id, timezone, locale } = ctx.restaurant;

  const week = typeof params.week === "string" && isWeekStart(params.week) ? params.week : lastCompletedWeek(new Date(), timezone);
  const [{ snapshot, saved }, weeks] = await Promise.all([weekView(id, week), recentWeeks(id, timezone)]);
  const sentFmt = new Intl.DateTimeFormat(locale, { timeZone: timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <AppPageShell title={`Your week at ${ctx.restaurant.name}`} subtitle={`${weekLabel(week, locale)}`} restaurantQuery={restaurantQuery} active="/app/roi">
      <nav aria-label="Weeks" className="flex flex-wrap gap-2 text-sm">
        {weeks.map((w) => (
          <Link
            key={w}
            href={withR(`/app/roi?week=${w}`)}
            aria-current={w === week ? "page" : undefined}
            className={w === week ? "rounded-full bg-espresso px-3 py-1.5 text-paper" : "rounded-full border border-line px-3 py-1.5 text-muted hover:text-espresso"}
          >
            {weekLabel(w, locale)}
          </Link>
        ))}
      </nav>

      <p className="text-sm text-muted">
        {saved?.sentAt
          ? `Sent to you ${sentFmt.format(saved.sentAt)}. Every number links to the records behind it.`
          : saved
            ? "Every number links to the records behind it."
            : "This week hasn't been sent yet; these numbers are as of now. Every number links to the records behind it."}
      </p>

      {METRIC_GROUPS.map((group) => (
        <section key={group.key} aria-labelledby={`roi-${group.key}`} className="space-y-3">
          <div>
            <h2 id={`roi-${group.key}`} className="font-display text-xl">
              {group.title}
            </h2>
            <p className="text-sm text-muted">{group.blurb}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {group.metrics.map((key) => {
              const spec = METRICS[key];
              const m = snapshot.metrics[key];
              if (showsAsEmpty(key, m)) {
                return (
                  <li key={key} className="rounded-3xl border border-dashed border-line p-5 sm:col-span-2">
                    <p className="text-sm">{KOB_VALUE_EMPTY}</p>
                  </li>
                );
              }
              if (!m) return null;
              const value = formatMetric(m, snapshot.currency, locale);
              if (m.state === "OFF") {
                return (
                  <li key={key} className="rounded-3xl border border-dashed border-line p-5">
                    <p className="text-sm text-muted">{spec.label}</p>
                    <p className="mt-2 text-sm">
                      Off: connect {m.connect.slice(0, 2).map(providerName).join(" or ")} to see this.
                    </p>
                    <Link href={withR("/app/settings/connections")} className="mt-3 inline-block text-sm underline">
                      Connections
                    </Link>
                  </li>
                );
              }
              return (
                <li key={key}>
                  <Link href={withR(`/app/roi/${week}/${key}`)} className="block rounded-3xl border border-line bg-paper p-5 hover:border-espresso">
                    <p className="text-sm text-muted">{spec.label}</p>
                    <p className="mt-1 font-display text-3xl tabular-nums">{value}</p>
                    <p className="mt-2 text-sm text-muted">{spec.explain}</p>
                    <p className="mt-1 text-xs text-muted">
                      {m.count} record{m.count === 1 ? "" : "s"}
                      {m.sources.length ? ` · from ${sourceNames(m).join(", ")}` : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Link href={withR(`/app/roi/${week}/print`)} className="text-sm text-muted underline">
        Printable version
      </Link>
    </AppPageShell>
  );
}
