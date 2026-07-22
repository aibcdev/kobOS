import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DashboardProductSurface } from "@/components/dashboard/DashboardProductSurface";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Delivery · KOB",
  description: "Delivery channels without losing your brand.",
};

export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Delivery" description="Delivery listings and commission strategy." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <DashboardProductSurface
      eyebrow="Grow online sales"
      title="Delivery"
      restaurantName={restaurant.name}
      restaurantId={restaurantId}
      status="request"
      description="Own the guest relationship even when they order through aggregators — clear menu, branding, and direct alternatives."
      bullets={[
        "Audit Deliveroo / Uber Eats / Just Eat presence",
        "Direct ordering path on your website",
        "Request support to tighten listings and site CTAs",
      ]}
    />
  );
}
