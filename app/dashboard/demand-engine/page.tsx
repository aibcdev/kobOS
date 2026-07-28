import type { Metadata } from "next";

import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import {
  DemandInbox,
  type DemandInboxRec,
} from "@/components/dashboard/demand-engine/DemandInbox";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import {
  ensureDemoDemandRecommendations,
  getDemandPerformanceLast30Days,
} from "@/lib/demand-engine/actions";
import { parseStructuredOffer } from "@/lib/demand-engine/types";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Demand · KOB",
  description: "Approve AI offers for quiet periods — one click, we publish.",
};

function channelLabels(channels: { channel: string }[]): string[] {
  const map: Record<string, string> = {
    WEBSITE_BANNER: "Website",
    GOOGLE_POST: "Google post",
    GOOGLE_ADS: "Google Ads",
    EMAIL: "Email",
    SMS: "SMS",
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
  };
  const labels = channels.map((c) => map[c.channel] ?? c.channel);
  return labels.length ? [...new Set(labels)] : ["Website", "Google post"];
}

export default async function DemandPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  if (isUiPreviewEnabled()) {
    return (
      <PreviewPlaceholder
        title="Demand"
        description="Approve AI offers when quiet periods hit — one click."
      />
    );
  }

  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  await ensureDemoDemandRecommendations(restaurantId);

  const [recs, live, performance] = await Promise.all([
    prisma.demandRecommendation.findMany({
      where: { restaurantId, status: "PENDING" },
      orderBy: [{ impactScore: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
    prisma.liveOffer.findMany({
      where: { restaurantId, status: { in: ["LIVE", "PAUSED"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { channelPublishes: true },
    }),
    getDemandPerformanceLast30Days(restaurantId),
  ]);

  return (
    <DemandInbox
      restaurantId={restaurantId}
      restaurantName={restaurant.name}
      city={restaurant.city}
      initialRecs={recs.map((r) => ({
        id: r.id,
        title: r.title,
        reason: r.reason,
        confidence: r.confidence,
        estimatedExtraCustomers: r.estimatedExtraCustomers,
        estimatedExtraRevenue: r.estimatedExtraRevenue,
        offer: (parseStructuredOffer(r.offer) ??
          (r.offer as Record<string, unknown>)) as DemandInboxRec["offer"],
      }))}
      initialLive={live.map((o) => ({
        id: o.id,
        title: o.title,
        discountLabel: o.discountLabel,
        status: o.status,
        validFrom: o.validFrom.toISOString(),
        validTo: o.validTo.toISOString(),
        channels: channelLabels(o.channelPublishes),
      }))}
      performance={performance}
    />
  );
}
