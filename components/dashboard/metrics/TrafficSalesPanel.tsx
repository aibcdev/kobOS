import Link from "next/link";
import { appCardSurface } from "@/lib/app-ui-classes";
import type { OverviewMetrics } from "@/lib/dashboard/overview-metrics";
import type { SalesMetrics } from "@/lib/dashboard/sales-metrics";

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className={appCardSurface}>
      <p className="type-caption text-[var(--color-muted)]">{label}</p>
      <p className="type-title-md mt-1 text-[var(--color-ink)]">{value}</p>
      <p className="type-caption mt-2 text-[var(--color-muted-medium)]">{hint}</p>
    </div>
  );
}

export function TrafficSalesPanel({
  restaurantId,
  restaurantName,
  metrics,
  sales,
  eventBreakdown,
}: {
  restaurantId: string;
  restaurantName: string;
  metrics: OverviewMetrics;
  sales: SalesMetrics;
  eventBreakdown: { type: string; count: number }[];
}) {
  const trafficLabel =
    metrics.trafficChangePct != null
      ? `${metrics.trafficChangePct > 0 ? "+" : ""}${metrics.trafficChangePct}% vs last week`
      : "No prior week data";

  return (
    <div>
      <p className="type-body-sm text-[var(--color-muted)]">{restaurantName}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Website traffic"
          value={String(metrics.trafficEventsThisWeek)}
          hint={trafficLabel}
        />
        <KpiCard
          label="Conversions"
          value={String(metrics.conversionsThisWeek)}
          hint="CTA clicks this week"
        />
        <KpiCard
          label="Online sales (7d)"
          value={sales.revenueDisplay}
          hint={sales.source === "SAMPLE" ? "Sample data — connect Square for live" : `Source: ${sales.source}`}
        />
        <KpiCard
          label="AOV"
          value={sales.aovDisplay}
          hint={sales.orderCount7d > 0 ? `${sales.orderCount7d} orders this week` : "Connect POS for orders"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className={appCardSurface}>
          <h2 className="type-title-sm">Event breakdown (7d)</h2>
          {eventBreakdown.length === 0 ? (
            <p className="type-body-sm mt-4 text-[var(--color-muted)]">No events yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {eventBreakdown.map((row) => (
                <li key={row.type} className="flex justify-between text-sm">
                  <span className="text-[var(--color-muted)]">{row.type.replace(/_/g, " ")}</span>
                  <span className="font-medium">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={appCardSurface}>
          <h2 className="type-title-sm">Sales trend</h2>
          {sales.daily.length === 0 ? (
            <p className="type-body-sm mt-4 text-[var(--color-muted)]">
              Connect Square or turn on sample data in Workspace.
            </p>
          ) : (
            <ul className="mt-4 space-y-1 text-sm">
              {sales.daily.slice(-7).map((d) => (
                <li key={d.date} className="flex justify-between text-[var(--color-muted)]">
                  <span>{d.date}</span>
                  <span>£{(d.revenueCents / 100).toFixed(0)} · {d.orderCount} orders</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="type-caption mt-6 text-[var(--color-muted-medium)]">
        Visibility {metrics.visibilityScore ?? "—"} · Reviews {metrics.reviewsThisWeek} this week
      </p>
      <Link href={`/dashboard/workspace?r=${encodeURIComponent(restaurantId)}`} className="type-body-sm mt-2 inline-block text-[var(--color-primary)]">
        Connect analytics &amp; POS →
      </Link>
    </div>
  );
}
