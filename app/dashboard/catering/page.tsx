import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DashboardProductSurface } from "@/components/dashboard/DashboardProductSurface";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Catering · KOB",
  description: "Catering inquiries and packages.",
};

export default async function CateringPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Catering" description="Catering inquiry capture on your site." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <DashboardProductSurface
      eyebrow="Grow online sales"
      title="Catering"
      restaurantName={restaurant.name}
      restaurantId={restaurantId}
      status="request"
      description="Make catering obvious on your site — packages, lead form, and follow-up — so office orders do not go to competitors."
      bullets={[
        "Catering page and package copy",
        "Inquiry form wired to your inbox",
        "Request website updates with credits",
      ]}
    />
  );
}
