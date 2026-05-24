import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Customers · KOB",
  description: "Loyalty and CRM.",
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Customers" description="Loyalty and CRM tools plug in after Supabase is wired." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <div className="mx-auto max-w-3xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Loyalty &amp; customers</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">CRM, rewards, and guest segments for {restaurant.name}.</p>
      <div className={`mt-8 ${appCardSurface}`}>
        <p className="type-body-sm text-[var(--color-muted)]">
          Guest profiles, visit frequency, and win-back journeys will land here — after core growth surfaces stabilize.
        </p>
      </div>
    </div>
  );
}
