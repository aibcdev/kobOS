import type { Metadata } from "next";
import { WebsiteRedesignPanel } from "@/components/dashboard/website/WebsiteRedesignPanel";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appBtnPrimary, appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Redesign Studio · KOB",
  description: "AI website redesign strategist — hero, conversion, and section plans.",
};

function withR(restaurantId: string, path: string) {
  return `${path}?r=${encodeURIComponent(restaurantId)}`;
}

export default async function RedesignPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Redesign Studio" description="Strategist panel needs API + database access." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  return (
    <div className="mx-auto max-w-5xl px-[var(--spacing-md)] py-10">
      <p className="type-caption text-[var(--color-muted-medium)]">AI Website Redesign Studio</p>
      <h1 className="type-title-md mt-2 font-head">Premium layout, built for reservations</h1>
      <p className="type-body-md mt-3 max-w-2xl text-pretty text-[var(--color-muted)]">
        We analyze your live site and workspace signals, then return a conversion-focused plan: hero, menu schema hints,
        mobile priorities, and copy you can ship with your dev team.
      </p>

      <div className={`mt-8 ${appCardSurface} bg-gradient-to-br from-[var(--color-surface-warm)] to-[var(--color-surface-soft)] px-[var(--spacing-lg)] py-12 text-center`}>
        <h2 className="type-title-sm">Generate full redesign plan</h2>
        <p className="type-body-md mx-auto mt-3 max-w-md text-[var(--color-muted)]">
          One run produces prioritized sections, headlines, subheads, and CTAs — tuned for food photography and booking
          paths.
        </p>
        <p className="type-body-sm mt-6 text-[var(--color-muted-medium)]">
          Live URL:{" "}
          {restaurant.website ? (
            <a
              href={restaurant.website}
              className="font-medium text-[var(--color-ink)] underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {restaurant.website}
            </a>
          ) : (
            <span className="text-amber-800">Add a website URL in Settings first.</span>
          )}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={withR(restaurantId, "/dashboard/settings")} className={`${appBtnPrimary} no-underline`}>
            Edit restaurant URL
          </a>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className={appCardSurface}>
          <h3 className="type-title-sm">Hero preview (concept)</h3>
          <div className="mt-4 flex aspect-[16/10] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-ink)]/5 type-caption text-[var(--color-muted-medium)]">
            Wireframe — run the strategist below for real copy blocks
          </div>
        </div>
        <div className={appCardSurface}>
          <h3 className="type-title-sm">What you get</h3>
          <ul className="type-body-md mt-4 list-inside list-disc space-y-2 text-[var(--color-muted)]">
            <li>Stronger food-forward hero + reservation CTA</li>
            <li>Menu layout + structured data opportunities</li>
            <li>Mobile-first UX notes</li>
            <li>Local SEO landing page ideas</li>
          </ul>
          <p className="type-caption mt-6 text-[var(--color-muted-medium)]">
            Full visual builder + managed hosting — see{" "}
            <Link href={withR(restaurantId, "/dashboard/website")} className="text-[var(--color-ink)] underline-offset-2 hover:underline">
              Website workspace
            </Link>{" "}
            for the same panel in context.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <WebsiteRedesignPanel restaurantId={restaurantId} />
      </div>
    </div>
  );
}
