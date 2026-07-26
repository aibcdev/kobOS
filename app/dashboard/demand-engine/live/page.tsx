import type { Metadata } from "next";

import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DemandEngineSubnav } from "@/components/dashboard/demand-engine/DemandEngineSubnav";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Live offers · Demand Engine · KOB",
  description: "Offers currently live for guests.",
};

export default async function DemandLivePage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Live offers" description="Active demand offers." />;
  }

  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const offers = await prisma.liveOffer.findMany({
    where: { restaurantId, status: { in: ["LIVE", "PAUSED"] } },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { channelPublishes: true },
  });

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <p className="type-caption font-medium tracking-wide text-[var(--color-muted-medium)] uppercase">
        Demand Engine
      </p>
      <h1 className="type-title-md mt-2">Live</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Offers you approved · {restaurant.name}
      </p>

      <DemandEngineSubnav restaurantId={restaurantId} pathname="/dashboard/demand-engine/live" />

      <div className="mt-8 space-y-3">
        {offers.length === 0 ? (
          <div className={`${appCardSurface} text-sm text-[var(--color-muted)]`}>
            No live offers yet. Approve a recommendation to put one live.
          </div>
        ) : (
          offers.map((o) => (
            <article key={o.id} className={`${appCardSurface} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-[var(--color-ink)]">{o.title}</h2>
                <span className="rounded-full bg-[var(--color-muted-faint)] px-2.5 py-0.5 text-xs font-medium uppercase">
                  {o.status}
                </span>
              </div>
              {o.discountLabel ? (
                <p className="mt-1 text-sm text-[var(--color-primary)]">{o.discountLabel}</p>
              ) : null}
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                {o.validFrom.toLocaleDateString()} → {o.validTo.toLocaleDateString()} ·{" "}
                {o.channelPublishes.length} channel
                {o.channelPublishes.length === 1 ? "" : "s"}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
