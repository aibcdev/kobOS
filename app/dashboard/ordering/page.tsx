import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Ordering · KOB",
  description: "Online ordering and menu management.",
};

export default async function OrderingPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Ordering" description="Menu and POS sync use live integrations after setup." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <div className="mx-auto max-w-3xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Online ordering</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">Menu sync, order flow, and POS handoff for {restaurant.name}.</p>
      <div className={`mt-8 ${appCardSurface}`}>
        <p className="type-body-sm text-[var(--color-muted)]">
          Connect Toast, Square, or Shopify when you are ready — order rails ship after core growth workflows.
        </p>
      </div>
    </div>
  );
}
