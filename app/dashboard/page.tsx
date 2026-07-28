import type { Metadata } from "next";
import { TodayOwnerHome } from "@/components/dashboard/today/TodayOwnerHome";
import { RestaurantPlacesOnboarding } from "@/components/dashboard/RestaurantPlacesOnboarding";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { loadTodayJourneySnapshot } from "@/lib/dashboard/load-today-journey";
import {
  getCachedTodayBrief,
  shellTodayBrief,
} from "@/lib/chief-of-staff/ensure-today-brief";
import { getPreviewChiefOfStaffBrief } from "@/lib/preview/chief-of-staff-preview";
import { getPreviewRestaurant, isUiPreviewEnabled, PREVIEW_RESTAURANT_ID } from "@/lib/preview/ui-preview";
import { ensureSalesWorkspaceMembership } from "@/lib/outbound/ensure-sales-membership";
import { prisma } from "@/lib/db/prisma";
import { ensureDemoDemandRecommendations } from "@/lib/demand-engine/actions";
import { discountLabelFromOffer, parseStructuredOffer } from "@/lib/demand-engine/types";

export const metadata: Metadata = {
  title: "Today · KOB",
  description: "Where guests drop off — and the three fixes to do this week.",
  openGraph: {
    title: "Today · KOB",
    description: "Where guests drop off — and the three fixes to do this week.",
  },
};

type SearchParams = { r?: string; welcome?: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (isUiPreviewEnabled()) {
    const preview = getPreviewRestaurant();
    return (
      <TodayOwnerHome
        restaurantId={PREVIEW_RESTAURANT_ID}
        restaurantName={preview.name}
        city={preview.city}
        cuisineType={preview.cuisineType}
        brief={getPreviewChiefOfStaffBrief()}
        journey={null}
        website={preview.website ?? null}
        welcome={false}
        previewMode
      />
    );
  }

  const user = await getDashboardPageUser();
  await ensureSalesWorkspaceMembership(user.id, user.email);
  const sp = await searchParams;
  const { memberships, restaurantId, restaurant } = await getActiveRestaurantContext(user.id, sp.r);

  if (!memberships.length || !restaurantId || !restaurant) {
    return <RestaurantPlacesOnboarding variant="empty" />;
  }

  // Never await Gemini on the login path — cached/shell only, refresh in the client.
  const cached = await getCachedTodayBrief(restaurantId);
  const brief = cached ?? shellTodayBrief(restaurant.name, restaurant.aiPersonality);
  const briefNeedsRefresh = !cached || cached.tasks.length === 0;

  const journey = await loadTodayJourneySnapshot(
    restaurantId,
    restaurant.name,
    restaurant.city,
    restaurant.website,
  );

  await ensureDemoDemandRecommendations(restaurantId);
  const topDemand = await prisma.demandRecommendation.findFirst({
    where: { restaurantId, status: "PENDING" },
    orderBy: [{ impactScore: "desc" }, { createdAt: "desc" }],
  });
  const demandHints = topDemand
    ? [
        {
          id: topDemand.id,
          title: (() => {
            const offer = parseStructuredOffer(topDemand.offer);
            if (offer) return discountLabelFromOffer(offer);
            return topDemand.title;
          })(),
          impactLabel: "Quiet window · highest ROI",
        },
      ]
    : [];

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const serviceRequests = await prisma.serviceRequest.findMany({
    where: {
      restaurantId,
      OR: [
        { status: { in: ["REQUESTED", "IN_PROGRESS"] } },
        { status: "DELIVERED", deliveredAt: { gte: weekAgo } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, title: true, notes: true, status: true },
  });

  return (
    <TodayOwnerHome
      restaurantId={restaurantId}
      restaurantName={restaurant.name}
      city={restaurant.city}
      cuisineType={restaurant.cuisineType}
      brief={brief}
      briefNeedsRefresh={briefNeedsRefresh}
      journey={journey}
      website={restaurant.website}
      demandHints={demandHints}
      openRequests={serviceRequests}
      auditId={journey?.auditId ?? null}
      welcome={sp.welcome === "1"}
    />
  );
}
