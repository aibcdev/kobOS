import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DashboardProductSurface } from "@/components/dashboard/DashboardProductSurface";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { getServiceRequestSurfaceState } from "@/lib/dashboard/service-request-surface";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Catering · KOB",
  description: "Catering inquiry capture on your site.",
};

export default async function CateringPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Catering" description="Catering inquiry capture on your site." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const surface = await getServiceRequestSurfaceState(restaurantId, restaurant.subscriptionPlan, "CATERING");

  return (
    <DashboardProductSurface
      eyebrow="Increase revenue"
      title="Catering"
      restaurantName={restaurant.name}
      restaurantId={restaurantId}
      status="request"
      serviceType="CATERING"
      creditCost={surface.creditCost}
      isPaid={surface.isPaid}
      openStatus={surface.openStatus}
      description="Group orders and catering inquiries shouldn’t die in an inbox — capture them on your site."
      bullets={[
        "Inquiry form / flow on your website",
        "Clear catering offer presentation",
        "Manual fulfillment after you request",
      ]}
      ctaLabel="Request catering capture"
    />
  );
}
