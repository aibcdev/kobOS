import type { Metadata } from "next";
import { CustomerInsightsPanel } from "@/components/dashboard/insights/CustomerInsightsPanel";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";

export const metadata: Metadata = {
  title: "Customer Insights · KOB",
  description: "Review scores, themes, and guest sentiment.",
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <div className="mx-auto max-w-5xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Customer Insights</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">What guests are saying — and what to fix first.</p>
      <div className="mt-8">
        <CustomerInsightsPanel restaurantId={restaurantId} restaurantName={restaurant.name} />
      </div>
    </div>
  );
}
