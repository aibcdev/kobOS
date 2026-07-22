import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DashboardProductSurface } from "@/components/dashboard/DashboardProductSurface";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Online Ordering · KOB",
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
    <DashboardProductSurface
      eyebrow="Grow online sales"
      title="Online Ordering"
      restaurantName={restaurant.name}
      restaurantId={restaurantId}
      status="request"
      description="Take orders on your site — not only on delivery apps — so you keep the guest and the margin."
      bullets={[
        "Clear order path above the fold",
        "Toast, Square, or Shopify when you are ready",
        "Request website ordering setup with credits",
      ]}
      ctaLabel="Request ordering setup"
    />
  );
}
