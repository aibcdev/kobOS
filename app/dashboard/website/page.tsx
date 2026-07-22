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
        Check your live URL and site health for {restaurant.name}. Need a full new site? Request it with plan
        credits — our team builds it manually after you&apos;re on a paid plan.
      </p>

      <div className={`mt-6 ${appCardSurface} border border-emerald-100`}>
        <p className="type-label-md text-[var(--color-ink)]">Want a new website?</p>
        <p className="type-body-sm mt-2 text-[var(--color-muted)]">
          We don&apos;t auto-generate websites. Submit a request and we deliver as part of your paid plan.
        </p>
        <a
          href={`/dashboard/requests?r=${encodeURIComponent(restaurantId)}`}
          className="mt-4 inline-flex rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Request a website
        </a>
      </div>

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
