import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DashboardProductSurface } from "@/components/dashboard/DashboardProductSurface";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { getServiceRequestSurfaceState } from "@/lib/dashboard/service-request-surface";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Online Ordering · KOB",
  description: "Ordering setup for your restaurant.",
};

export default async function OrderingPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Ordering" description="Menu and POS sync use live integrations after setup." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const surface = await getServiceRequestSurfaceState(restaurantId, restaurant.subscriptionPlan, "ORDERING");

  return (
    <DashboardProductSurface
      eyebrow="Increase revenue"
      title="Online Ordering"
      restaurantName={restaurant.name}
      restaurantId={restaurantId}
      status="request"
      serviceType="ORDERING"
      creditCost={surface.creditCost}
      isPaid={surface.isPaid}
      openStatus={surface.openStatus}
      description="Make it easy for guests to order direct — without losing the relationship to aggregators."
      bullets={[
        "Ordering path configured for your brand",
        "Menu and guest flow reviewed by our team",
        "Request once — we pick it up as a ticket",
      ]}
      ctaLabel="Request ordering setup"
    />
  );
}
