import type { Metadata } from "next";

import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DemandEngineSubnav } from "@/components/dashboard/demand-engine/DemandEngineSubnav";
import {
  DemandRecommendedPanel,
  type DemandRecCard,
} from "@/components/dashboard/demand-engine/DemandRecommendedPanel";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import { ensureDemoDemandRecommendations } from "@/lib/demand-engine/actions";
import type { StructuredOffer } from "@/lib/demand-engine/types";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Recommended · Demand Engine · KOB",
  description: "Approve or dismiss AI offer recommendations.",
};

export default async function DemandRecommendedPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Recommended" description="Approve demand offers here." />;
  }

  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  await ensureDemoDemandRecommendations(restaurantId);

  const rows = await prisma.demandRecommendation.findMany({
    where: { restaurantId, status: "PENDING" },
    orderBy: [{ impactScore: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  const initial: DemandRecCard[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    reason: r.reason,
    confidence: r.confidence,
    impactScore: r.impactScore,
    estimatedExtraCustomers: r.estimatedExtraCustomers,
    estimatedExtraRevenue: r.estimatedExtraRevenue,
    offer: r.offer as StructuredOffer,
    templateKey: r.templateKey,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <p className="type-caption font-medium tracking-wide text-[var(--color-muted-medium)] uppercase">
        Demand Engine
      </p>
      <h1 className="type-title-md mt-2">Recommended</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Approve to put an offer live. Dismiss if it doesn&apos;t fit · {restaurant.name}
      </p>

      <DemandEngineSubnav restaurantId={restaurantId} pathname="/dashboard/demand-engine/recommended" />

      <div className="mt-8">
        <DemandRecommendedPanel restaurantId={restaurantId} initial={initial} />
      </div>
    </div>
  );
}
