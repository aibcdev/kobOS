import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DashboardProductSurface } from "@/components/dashboard/DashboardProductSurface";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Smart Upsells · KOB",
  description: "Increase average order value with smart suggestions.",
};

export default async function UpsellsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Smart Upsells" description="Upsells ship with ordering rails." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <DashboardProductSurface
      eyebrow="Grow online sales"
      title="Smart Upsells"
      restaurantName={restaurant.name}
      restaurantId={restaurantId}
      status="waitlist"
      description="Suggest sides, drinks, and combos at the right moment in ordering — without nagging guests."
      bullets={[
        "Pair with Online Ordering when connected",
        "Rules based on menu and ticket size",
        "Join the waitlist while ordering rails land",
      ]}
    />
  );
}
