import type { Metadata } from "next";
import Link from "next/link";
import { GrowthAgentBriefingPanel } from "@/components/dashboard/GrowthAgentBriefingPanel";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { appCardSurface, appCodeInline } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { buildDigestSnapshot } from "@/lib/digest/build-snapshot";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Growth Agent · KOB",
  description: "Prompt-backed daily briefings, conversation, and orchestration hub.",
};

export default async function GrowthAgentPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Growth Agent" description="Briefings use workspace data from the database." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const digest = await buildDigestSnapshot(restaurantId);

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Growth Agent</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Central AI for {restaurant.name}: branding, site experience, visuals, and reputation. Prompts live in{" "}
        <code className={appCodeInline}>lib/prompts/growth-agent</code>.
      </p>
      <div className={`mt-8 ${appCardSurface}`}>
        <p className="type-caption text-[var(--color-muted-medium)]">Digest snapshot</p>
        <dl className="type-body-sm mt-4 grid gap-2 sm:grid-cols-2">
          {Object.entries(digest.insightsByStatus).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-beige)] px-3 py-2">
              <dt>Insights ({k})</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
          {Object.entries(digest.recommendationsByType).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 rounded-[var(--radius-sm)] bg-[var(--color-surface-beige)] px-3 py-2">
              <dt>{k.replace(/_/g, " ")}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <GrowthAgentBriefingPanel restaurantId={restaurantId} />
      <Link
        href={`/dashboard?r=${encodeURIComponent(restaurantId)}`}
        className="type-button mt-8 inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 text-[var(--color-on-primary)] no-underline hover:bg-[var(--color-primary-hover)]"
      >
        Open Overview workspace
      </Link>
    </div>
  );
}
