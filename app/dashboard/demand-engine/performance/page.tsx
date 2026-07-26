import type { Metadata } from "next";

import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DemandEngineSubnav } from "@/components/dashboard/demand-engine/DemandEngineSubnav";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Performance · Demand Engine · KOB",
  description: "Extra customers and estimated revenue from live offers.",
};

export default async function DemandPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Performance" description="Demand Engine results." />;
  }

  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <p className="type-caption font-medium tracking-wide text-[var(--color-muted-medium)] uppercase">
        Demand Engine
      </p>
      <h1 className="type-title-md mt-2">Performance</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Extra customers and estimated revenue · {restaurant.name}
      </p>

      <DemandEngineSubnav restaurantId={restaurantId} pathname="/dashboard/demand-engine/performance" />

      <div className={`mt-8 ${appCardSurface}`}>
        <p className="text-sm text-[var(--color-muted)]">
          Measurement lands in Phase 5 — once offers are live, we&apos;ll show extra customers,
          estimated revenue, and best channels here.
        </p>
      </div>
    </div>
  );
}
