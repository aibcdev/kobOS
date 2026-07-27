import type { Metadata } from "next";
import Link from "next/link";

import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DemandEngineSubnav } from "@/components/dashboard/demand-engine/DemandEngineSubnav";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { appBtnPrimary, appCardSurface } from "@/lib/app-ui-classes";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import { ensureDemoDemandRecommendations } from "@/lib/demand-engine/actions";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Demand Engine · KOB",
  description: "AI suggests offers. You approve. Guests see deals near them.",
};

export default async function DemandEngineOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  if (isUiPreviewEnabled()) {
    return (
      <PreviewPlaceholder
        title="Demand Engine"
        description="Approve AI offer recommendations to fill quiet periods."
      />
    );
  }

  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  await ensureDemoDemandRecommendations(restaurantId);

  const [pending, live] = await Promise.all([
    prisma.demandRecommendation.count({ where: { restaurantId, status: "PENDING" } }),
    prisma.liveOffer.count({ where: { restaurantId, status: "LIVE" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <p className="type-caption font-medium tracking-wide text-[var(--color-muted-medium)] uppercase">
        Get more customers
      </p>
      <h1 className="type-title-md mt-2">Demand Engine</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        AI suggests timed offers for quiet periods. One-click approve — nothing goes live without you.
        · {restaurant.name}
      </p>

      <DemandEngineSubnav restaurantId={restaurantId} pathname="/dashboard/demand-engine" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className={appCardSurface}>
          <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">
            Pending
          </p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">{pending}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Recommendations ready to approve</p>
        </div>
        <div className={appCardSurface}>
          <p className="text-xs font-semibold tracking-wide text-[var(--color-muted-medium)] uppercase">
            Live offers
          </p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">{live}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Currently visible to guests</p>
        </div>
      </div>

      <div className={`mt-6 ${appCardSurface}`}>
        <h2 className="text-base font-semibold text-[var(--color-ink)]">This week</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--color-muted)]">
          <li>Review AI recommendations for quiet dayparts</li>
          <li>Approve offers you want live</li>
          <li>Launch a B2B Google Ads campaign to the free audit</li>
          <li>Track footfall and estimated revenue on Performance</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/demand-engine/recommended?r=${encodeURIComponent(restaurantId)}`}
            className={`${appBtnPrimary} inline-flex`}
          >
            Review recommended →
          </Link>
          <Link
            href={`/dashboard/demand-engine/google-ads?r=${encodeURIComponent(restaurantId)}`}
            className={`${appBtnPrimary} inline-flex`}
          >
            Google Ads · B2B Audit →
          </Link>
        </div>
      </div>
    </div>
  );
}
