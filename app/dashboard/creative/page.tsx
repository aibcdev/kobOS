import type { Metadata } from "next";
import { CreativeAgentPanel } from "@/components/dashboard/creative/CreativeAgentPanel";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Creative Agent · KOB",
  description: "Generate a month of UGC ads and dish photography from your brand.",
};

export default async function CreativePage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return (
      <PreviewPlaceholder
        title="Creative Agent"
        description="Brand brief and generated creatives appear here with Postgres."
      />
    );
  }

  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const packs = await prisma.creativePack.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const latest = packs[0];
  const activePack = latest
    ? await prisma.creativePack.findUnique({
        where: { id: latest.id },
        include: {
          contents: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              type: true,
              output: true,
              imageUrl: true,
              prompt: true,
              status: true,
              createdAt: true,
            },
          },
        },
      })
    : null;

  return (
    <div className="mx-auto max-w-5xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Creative Agent</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        One click for {restaurant.name}: identity brief + a month of scroll-ready creatives.
      </p>

      <div className="mt-8">
        <CreativeAgentPanel
          restaurantId={restaurantId}
          restaurantName={restaurant.name}
          initialPacks={packs.map((p) => ({
            id: p.id,
            status: p.status,
            targetCount: p.targetCount,
            doneCount: p.doneCount,
            brief: (p.brief as Record<string, unknown>) ?? {},
            errorMessage: p.errorMessage,
            createdAt: p.createdAt.toISOString(),
          }))}
          initialActivePack={
            activePack
              ? {
                  id: activePack.id,
                  status: activePack.status,
                  targetCount: activePack.targetCount,
                  doneCount: activePack.doneCount,
                  brief: (activePack.brief as Record<string, unknown>) ?? {},
                  errorMessage: activePack.errorMessage,
                  createdAt: activePack.createdAt.toISOString(),
                  contents: activePack.contents.map((c) => ({
                    id: c.id,
                    type: c.type,
                    output: c.output,
                    imageUrl: c.imageUrl,
                    prompt: c.prompt,
                    status: c.status,
                    createdAt: c.createdAt.toISOString(),
                  })),
                }
              : null
          }
        />
      </div>
    </div>
  );
}
