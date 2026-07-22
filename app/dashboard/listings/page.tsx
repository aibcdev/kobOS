import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DashboardProductSurface } from "@/components/dashboard/DashboardProductSurface";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Listings Management · KOB",
  description: "Google, maps, and directory listings.",
};

export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Listings" description="Listing accuracy is part of SEO resurfacing." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <DashboardProductSurface
      eyebrow="Grow online discovery"
      title="Listings Management"
      restaurantName={restaurant.name}
      restaurantId={restaurantId}
      status="request"
      description="Hours, address, and photos should match everywhere guests find you — Google first."
      bullets={[
        "Google Business Profile consistency",
        "Hours, phone, and menu links in sync",
        "Pair with Restaurant SEO for local visibility",
      ]}
      ctaHref={`/dashboard/seo?r=${encodeURIComponent(restaurantId)}`}
      ctaLabel="Open Restaurant SEO"
    />
  );
}
