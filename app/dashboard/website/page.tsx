import type { Metadata } from "next";
import { WebsiteRedesignPanel } from "@/components/dashboard/website/WebsiteRedesignPanel";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Website · KOB",
  description: "AI website strategist and redesign recommendations.",
};

export default async function WebsitePage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Website" description="The AI strategist panel needs API + database access." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Website</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        AI strategist for {restaurant.name}. Full visual builder + managed hosting ships next; today you get a
        prioritized redesign plan tied to your live URL and workspace signals.
      </p>

      <div className={`mt-8 ${appCardSurface}`}>
        <p className="type-body-sm text-[var(--color-muted)]">
          Live URL on file:{" "}
          {restaurant.website ? (
            <a href={restaurant.website} className="font-medium text-[var(--color-ink)] underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
              {restaurant.website}
            </a>
          ) : (
            <span className="text-amber-800">Add a website URL under Settings to unlock the strategist.</span>
          )}
        </p>
      </div>

      <div className="mt-10">
        <WebsiteRedesignPanel restaurantId={restaurantId} />
      </div>
    </div>
  );
}
