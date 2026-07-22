import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DashboardProductSurface } from "@/components/dashboard/DashboardProductSurface";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Online Menu · KOB",
  description: "Publish and update your online menu.",
};

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Online Menu" description="Menu publishing maps to your website request flow." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <DashboardProductSurface
      eyebrow="Grow online discovery"
      title="Online Menu"
      restaurantName={restaurant.name}
      restaurantId={restaurantId}
      status="request"
      description="Guests search for dishes before they search for you. Keep a clear, searchable menu on your site."
      bullets={[
        "Dish names, prices, and dietary tags guests expect",
        "Tied to your website request so fulfillment stays in one place",
        "SEO-friendly structure for Google dish queries",
      ]}
      ctaLabel="Request menu updates"
    />
  );
}
