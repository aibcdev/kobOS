import type { Metadata } from "next";
import Link from "next/link";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Analytics · KOB",
  description: "Traffic and conversion signals.",
};

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Analytics" description="Traffic charts load from your site events after the database is connected." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);
  const byType = await prisma.websiteEvent.groupBy({
    by: ["type"],
    where: { restaurantId, createdAt: { gte: since } },
    _count: { id: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Analytics &amp; reports</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">Seven-day website events for {restaurant.name}.</p>
      <div className={`mt-8 ${appCardSurface}`}>
        {byType.length === 0 ? (
          <p className="type-body-sm text-[var(--color-muted)]">No events in the last 7 days. Wire your snippet or seed demo events.</p>
        ) : (
          <ul className="type-body-sm space-y-2 text-[var(--color-muted)]">
            {byType.map((row) => (
              <li key={row.type} className="flex justify-between gap-4">
                <span>{row.type.replace(/_/g, " ")}</span>
                <span className="font-medium text-[var(--color-ink)]">{row._count.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="type-caption mt-6 text-[var(--color-muted-medium)]">
        PostHog / GA4 connectors are backlog — counts come from <code className="font-mono text-[13px]">WebsiteEvent</code> today.
      </p>
      <Link href="/dashboard" className="type-body-sm mt-4 inline-block text-[var(--color-muted)] underline underline-offset-2">
        Back to Today
      </Link>
    </div>
  );
}
