import type { Metadata } from "next";
import Link from "next/link";

import { appCardSurface } from "@/lib/app-ui-classes";
import { formatUsdMicros, fleetCosts } from "@/lib/roi/cost";
import { addDays, isWeekStart, lastCompletedWeek, weekStartOf } from "@/lib/roi/ledger";
import { PRICE_VERSION } from "@/lib/billing/usage";

export const metadata: Metadata = {
  title: "Costs · KOB Ops",
  description: "What serving each restaurant cost KOB per week.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-medium)]";
const td = "px-3 py-2 align-top tabular-nums";

export default async function OpsCostsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const fallback = lastCompletedWeek(new Date(), "Europe/London");
  const week = typeof params.week === "string" && isWeekStart(params.week) ? params.week : fallback;
  const view = await fleetCosts(week);
  const current = weekStartOf(new Date(), "Europe/London");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-10">
      <div>
        <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">ROI ledger</p>
        <h1 className="mt-2 font-head text-3xl font-semibold tracking-tight text-[var(--color-ink)]">Costs · week of {week}</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Metered AI, image, SMS and voice spend per restaurant, summed from usage events over each restaurant&apos;s local week. Prices {PRICE_VERSION}. Weeks are saved on
          Monday morning local time.
        </p>
        <div className="mt-3 flex gap-3 text-sm">
          <Link href={`/ops/costs?week=${addDays(week, -7)}`}>← Previous week</Link>
          {addDays(week, 7) <= current ? <Link href={`/ops/costs?week=${addDays(week, 7)}`}>Next week →</Link> : null}
        </div>
      </div>

      <section className={appCardSurface}>
        <p className="text-sm text-[var(--color-muted)]">
          {view.rows.length} restaurant{view.rows.length === 1 ? "" : "s"} · total {formatUsdMicros(view.total)}
        </p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Restaurant</th>
              <th className={th}>Plan</th>
              <th className={`${th} text-right`}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => (
              <tr key={r.restaurantId} className="border-t border-[var(--color-muted-faint)]">
                <td className={td}>{r.restaurant.name}</td>
                <td className={td}>{r.restaurant.subscriptionPlan}</td>
                <td className={`${td} text-right`}>{r.costMicros === null ? "Not closed" : formatUsdMicros(r.costMicros)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {view.rows.length === 0 ? <p className="mt-4 text-sm text-[var(--color-muted)]">No weeks saved for this date yet.</p> : null}
      </section>
    </div>
  );
}
