import type { Metadata } from "next";
import { WebsiteRedesignPanel } from "@/components/dashboard/website/WebsiteRedesignPanel";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { RequestServiceButton } from "@/components/dashboard/RequestServiceButton";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { getServiceRequestSurfaceState } from "@/lib/dashboard/service-request-surface";
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

  const websiteSurface = await getServiceRequestSurfaceState(
    restaurantId,
    restaurant.subscriptionPlan,
    "WEBSITE",
  );

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
          We don&apos;t auto-generate websites. Click request — status becomes Requested and our team
          picks it up.
        </p>
        <div className="mt-4">
          <RequestServiceButton
            restaurantId={restaurantId}
            type="WEBSITE"
            title="New website"
            creditCost={websiteSurface.creditCost}
            isPaid={websiteSurface.isPaid}
            billingHref={`/dashboard/billing?r=${encodeURIComponent(restaurantId)}&tier=starter`}
            openStatus={websiteSurface.openStatus}
            label="Request a website"
          />
        </div>
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
