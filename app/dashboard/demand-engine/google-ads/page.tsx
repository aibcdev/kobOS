import type { Metadata } from "next";

import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { DemandEngineSubnav } from "@/components/dashboard/demand-engine/DemandEngineSubnav";
import { GoogleAdsB2bAuditPanel } from "@/components/dashboard/demand-engine/GoogleAdsB2bAuditPanel";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { listLocalGoogleAdsCampaigns } from "@/lib/demand-engine/actions";
import type { B2bAuditAdsPlan } from "@/lib/marketing/google-ads-b2b-audit";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Google Ads · B2B Audit · KOB",
  description: "B2B Search campaigns that send restaurant owners to the free audit.",
};

export default async function DemandEngineGoogleAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  if (isUiPreviewEnabled()) {
    return (
      <PreviewPlaceholder
        title="Google Ads · B2B Audit"
        description="Search ads for restaurant owners → free audit."
      />
    );
  }

  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const campaigns = await listLocalGoogleAdsCampaigns(restaurantId);

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <p className="type-caption font-medium tracking-wide text-[var(--color-muted-medium)] uppercase">
        Owner acquisition
      </p>
      <h1 className="type-title-md mt-2">Google Ads · B2B Audit</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Keywords for restaurant marketing, tips, and software — all point to the free audit. ·{" "}
        {restaurant.name}
      </p>

      <DemandEngineSubnav restaurantId={restaurantId} pathname="/dashboard/demand-engine/google-ads" />

      <div className="mt-8">
        <GoogleAdsB2bAuditPanel
          restaurantId={restaurantId}
          initialCampaigns={campaigns.map((c) => ({
            id: c.id,
            title: c.title,
            status: c.status,
            createdAt: c.createdAt.toISOString(),
            payload: c.payload as B2bAuditAdsPlan,
          }))}
        />
      </div>
    </div>
  );
}
