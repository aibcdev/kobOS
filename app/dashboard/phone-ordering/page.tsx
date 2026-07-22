import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DashboardProductSurface } from "@/components/dashboard/DashboardProductSurface";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "AI Phone Ordering · KOB",
  description: "AI that answers the phone and takes orders.",
};

export default async function PhoneOrderingPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="AI Phone Ordering" description="Waitlist for voice ordering." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <DashboardProductSurface
      eyebrow="Grow online sales"
      title="AI Phone Ordering"
      restaurantName={restaurant.name}
      restaurantId={restaurantId}
      status="waitlist"
      description="Never miss a call — AI answers, takes orders, and hands off to your kitchen when you are ready."
      bullets={[
        "Handles peak-hour missed calls",
        "Order capture into your workflow",
        "On the waitlist — request early access via Requests",
      ]}
    />
  );
}
