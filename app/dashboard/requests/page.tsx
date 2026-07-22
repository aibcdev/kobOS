import type { Metadata } from "next";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { ServiceRequestsPanel } from "@/components/dashboard/requests/ServiceRequestsPanel";
import { planMeetsMinimum } from "@/lib/billing/plan-access";
import { ensureMonthlyCredits } from "@/lib/credits/balance";
import { SERVICE_CATALOG } from "@/lib/credits/catalog";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { prisma } from "@/lib/db/prisma";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";
import { SubscriptionPlan } from "@prisma/client";

export const metadata: Metadata = {
  title: "Requests · KOB",
  description: "Spend plan credits to request website, logo, SEO, and creative work from our team.",
};

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return (
      <PreviewPlaceholder
        title="Service requests"
        description="Credit balance and human-fulfilled requests appear here with Postgres."
      />
    );
  }

  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  const { creditBalance } = await ensureMonthlyCredits(restaurantId);
  const requests = await prisma.serviceRequest.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const isPaid = planMeetsMinimum(restaurant.subscriptionPlan, SubscriptionPlan.STARTER);
  const billingHref = `/dashboard/billing?r=${encodeURIComponent(restaurantId)}`;

  return (
    <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
      <h1 className="type-title-md">Requests</h1>
      <p className="type-body-md mt-2 text-[var(--color-muted)]">
        Ask for a new website, logo, SEO work, or creatives. We deliver manually — credits come from your
        plan.
      </p>

      <div className="mt-8">
        <ServiceRequestsPanel
          restaurantId={restaurantId}
          creditBalance={creditBalance}
          catalog={SERVICE_CATALOG}
          isPaid={isPaid}
          billingHref={billingHref}
          initialRequests={requests.map((r) => ({
            id: r.id,
            type: r.type,
            status: r.status,
            title: r.title,
            notes: r.notes,
            creditCost: r.creditCost,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
