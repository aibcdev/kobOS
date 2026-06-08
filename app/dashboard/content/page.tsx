import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { ContentGeneratePanel } from "@/components/dashboard/content/ContentGeneratePanel";
import { appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Content · KOB",
  description: "AI-generated blogs, pages, and social copy.",
};

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Content" description="Drafts and generated copy list will appear here with Postgres." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const items = await prisma.generatedContent.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Content engine</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Generated assets for {restaurant.name}. Approve tasks on Today to auto-create drafts here.
      </p>

      <ContentGeneratePanel restaurantId={restaurantId} />

      {items.length === 0 ? (
        <p className={`type-body-sm mt-8 text-[var(--color-muted)] ${appCardSurface}`}>No generated content yet.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((c) => (
            <li key={c.id} className={appCardSurface}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="type-caption font-medium text-[var(--color-ink)]">{c.type.replace(/_/g, " ")}</span>
                <span className="type-caption text-[var(--color-muted-medium)]">{c.status}</span>
              </div>
              <p className="type-body-sm mt-2 line-clamp-3 text-[var(--color-muted)]">{c.output || c.prompt}</p>
              <p className="type-caption mt-2 text-[var(--color-muted-medium)]">{c.createdAt.toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
