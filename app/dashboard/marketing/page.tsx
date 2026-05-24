import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Marketing · KOB",
  description: "Campaigns and automation.",
};

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Marketing" description="Campaigns list loads from the database." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const campaigns = await prisma.campaign.findMany({
    where: { restaurantId },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Marketing</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">Campaigns for {restaurant.name}.</p>

      {campaigns.length === 0 ? (
        <p className={`type-body-sm mt-8 text-[var(--color-muted)] ${appCardSurface}`}>
          No campaigns yet. Create drafts from the Growth Agent or your integrations pipeline.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {campaigns.map((c) => (
            <li key={c.id} className={appCardSurface}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="type-caption text-[var(--color-muted-medium)]">{c.channel.replace(/_/g, " ")}</span>
                <span className="type-caption font-medium text-[var(--color-ink)]">{c.status}</span>
              </div>
              <p className="type-title-sm mt-2">{c.title}</p>
              <p className="type-caption mt-1 text-[var(--color-muted-medium)]">
                {c.type.replace(/_/g, " ")}
                {c.scheduledAt ? ` · scheduled ${c.scheduledAt.toLocaleDateString()}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
