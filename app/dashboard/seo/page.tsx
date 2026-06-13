import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { AiEraContentBriefPanel } from "@/components/dashboard/seo/AiEraContentBriefPanel";
import { SeoKeywordTools } from "@/components/dashboard/seo/SeoKeywordTools";
import { prisma } from "@/lib/db/prisma";
import { SubscriptionPlan } from "@prisma/client";
import { planMeetsMinimum } from "@/lib/billing/plan-access";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "SEO · KOB",
  description: "Keywords, rankings, and local visibility.",
};

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="SEO" description="Keyword tools call APIs backed by your workspace data." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const keywords = await prisma.keyword.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const canRefresh = planMeetsMinimum(restaurant.subscriptionPlan, SubscriptionPlan.STARTER);

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">SEO &amp; visibility</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">Tracked keywords for {restaurant.name}.</p>

      {keywords.length === 0 ? (
        <p className={`type-body-sm mt-8 text-[var(--color-muted)] ${appCardSurface}`}>
          No keywords yet. Add your first keyword below (free tier: up to 3).
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--color-hairline)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
          {keywords.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="font-medium text-[var(--color-ink)]">{k.keyword}</span>
              <span className="type-caption text-[var(--color-muted-medium)]">
                {k.ranking != null ? `Rank ~${k.ranking}` : "Rank —"}
                {k.searchVolume != null ? ` · vol ${k.searchVolume}` : ""}
                {k.opportunityScore != null ? ` · opp ${Math.round(k.opportunityScore)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      <SeoKeywordTools restaurantId={restaurantId} canRefresh={canRefresh} />
      <AiEraContentBriefPanel restaurantId={restaurantId} />
    </div>
  );
}
