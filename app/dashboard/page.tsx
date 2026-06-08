import type { Metadata } from "next";
import Link from "next/link";
import { ChiefOfStaffHome } from "@/components/dashboard/chief-of-staff/ChiefOfStaffHome";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { RestaurantOnboardingForm } from "@/components/dashboard/RestaurantOnboardingForm";
import { appCodeInline, appLinkMuted } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { ensureTodayBrief } from "@/lib/chief-of-staff/ensure-today-brief";
import { marketingCopy } from "@/lib/marketing/copy";
import { getPreviewChiefOfStaffBrief } from "@/lib/preview/chief-of-staff-preview";
import { getPreviewRestaurant, isUiPreviewEnabled, PREVIEW_RESTAURANT_ID } from "@/lib/preview/ui-preview";
import { ensureSalesWorkspaceMembership } from "@/lib/outbound/ensure-sales-membership";

export const metadata: Metadata = {
  title: "Today · KOB",
  description: "What needs your OK today — plain English tasks from your online presence.",
  openGraph: {
    title: "Today · KOB",
    description: "Daily tasks for reviews, holidays, hours, and posts—approve in one tap.",
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
      <ChiefOfStaffHome
        restaurantId={PREVIEW_RESTAURANT_ID}
        restaurantName={preview.name}
        initial={getPreviewChiefOfStaffBrief()}
        previewMode
      />
    );
  }

  const user = await getDashboardPageUser();
  await ensureSalesWorkspaceMembership(user.id);
  const sp = await searchParams;
  const { memberships, restaurantId, restaurant } = await getActiveRestaurantContext(user.id, sp.r);

  if (!memberships.length) {
    return (
      <div className="mx-auto max-w-2xl px-[var(--spacing-md)] py-24">
        <h1 className="type-title-md">Your workspace</h1>
        <p className="type-body-md mt-3 text-pretty leading-snug text-[var(--color-muted)]">
          {marketingCopy.dashboardOnboarding.body}
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

  let brief;
  try {
    brief = await ensureTodayBrief(restaurantId);
  } catch (e) {
    console.error("[dashboard] chief-of-staff brief", e);
    brief = await ensureTodayBrief(restaurantId, true);
  }

  return (
    <ChiefOfStaffHome
      restaurantId={restaurantId}
      restaurantName={restaurant.name}
      initial={brief}
      welcome={sp.welcome === "1"}
    />
  );
}
