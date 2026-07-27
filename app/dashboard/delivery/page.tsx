import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DashboardProductSurface } from "@/components/dashboard/DashboardProductSurface";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { getServiceRequestSurfaceState } from "@/lib/dashboard/service-request-surface";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Delivery · KOB",
  description: "Delivery listings and commission strategy.",
};

export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Delivery" description="Delivery listings and commission strategy." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const surface = await getServiceRequestSurfaceState(restaurantId, restaurant.subscriptionPlan, "DELIVERY");

  return (
    <DashboardProductSurface
      eyebrow="Increase revenue"
      title="Delivery"
      restaurantName={restaurant.name}
      restaurantId={restaurantId}
      status="request"
      serviceType="DELIVERY"
      creditCost={surface.creditCost}
      isPaid={surface.isPaid}
      openStatus={surface.openStatus}
      description="Own the guest relationship even when they order through aggregators — clear menu, branding, and listings."
      bullets={[
        "Listing accuracy across delivery surfaces",
        "Brand-consistent presence",
        "Our team works the ticket after you request",
      ]}
      ctaLabel="Request delivery setup"
    />
  );
}
