import type { Metadata } from "next";
import Link from "next/link";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DashboardTodayView } from "@/components/dashboard/DashboardTodayView";
import { RestaurantOnboardingForm } from "@/components/dashboard/RestaurantOnboardingForm";
import { appCodeInline, appLinkMuted } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getOverviewMetrics } from "@/lib/dashboard/overview-metrics";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { buildDigestSnapshot } from "@/lib/digest/build-snapshot";
import { prisma } from "@/lib/db/prisma";
import { getPreviewDigestSnapshot, getPreviewOverviewMetrics } from "@/lib/preview/static-dashboard-data";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Today · KOB",
  description:
    "Executive snapshot: brand health, site signals, visibility, AI briefing, alerts, and one-click growth actions.",
  openGraph: {
    title: "Today · KOB",
    description: "Action-oriented dashboard for restaurant growth.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Today · KOB",
    description: "Action-oriented dashboard for restaurant growth.",
  },
};

type SearchParams = { r?: string };

function dashboardGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getDashboardPageUser();
  const sp = await searchParams;
  const { memberships, restaurantId, restaurant } = await getActiveRestaurantContext(user.id, sp.r);

  const briefingAutoRun = process.env.NEXT_PUBLIC_DASHBOARD_AUTO_BRIEFING === "1";

  if (isUiPreviewEnabled()) {
    if (!restaurantId || !restaurant) {
      return <DashboardEmptyRestaurant />;
    }
    return (
      <DashboardTodayView
        greetingLabel={dashboardGreeting()}
        briefingAutoRun={briefingAutoRun}
        restaurantName={restaurant.name}
        city={restaurant.city}
        state={restaurant.state}
        restaurantId={restaurantId}
        recommendations={[]}
        insights={[]}
        digest={getPreviewDigestSnapshot()}
        overviewMetrics={getPreviewOverviewMetrics()}
        previewMode
      />
    );
  }

  if (!memberships.length) {
    return (
      <div className="mx-auto max-w-2xl px-[var(--spacing-md)] py-24">
        <h1 className="type-title-md">Your workspace</h1>
        <p className="type-body-md mt-3 text-pretty leading-snug text-[var(--color-muted)]">
          Add your first restaurant to unlock insights and recommendations. You can also use{" "}
          <code className={appCodeInline}>POST /api/restaurants</code> from tooling.
        </p>
        <RestaurantOnboardingForm />
        <Link href="/" className={`${appLinkMuted} mt-8 inline-block`}>
          Back home
        </Link>
      </div>
    );
  }

  if (!restaurantId || !restaurant) {
    return <DashboardEmptyRestaurant />;
  }

  const [recommendations, insights, digest, overviewMetrics] = await Promise.all([
    prisma.recommendation.findMany({
      where: { restaurantId },
      orderBy: [{ impactScore: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: { insight: true },
    }),
    prisma.growthInsight.findMany({
      where: { restaurantId, status: "OPEN" },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    buildDigestSnapshot(restaurantId),
    getOverviewMetrics(restaurantId),
  ]);

  return (
    <DashboardTodayView
      greetingLabel={dashboardGreeting()}
      briefingAutoRun={briefingAutoRun}
      restaurantName={restaurant.name}
      city={restaurant.city}
      state={restaurant.state}
      restaurantId={restaurantId}
      recommendations={recommendations}
      insights={insights}
      digest={digest}
      overviewMetrics={overviewMetrics}
    />
  );
}
