import type { Metadata } from "next";
import { OutboundWorkspace } from "@/components/dashboard/outbound/OutboundWorkspace";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { UpgradeRequired } from "@/components/dashboard/UpgradeRequired";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { prisma } from "@/lib/db/prisma";
import { OutboundLeadStatus, SubscriptionPlan } from "@prisma/client";
import { planMeetsMinimum } from "@/lib/billing/plan-access";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";

export const metadata: Metadata = {
  title: "Outbound · KOB",
  description: "Draft acquisition outreach for human approval.",
};

export default async function OutboundPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Outbound" description="Lead drafts and approvals need the database and Pro billing." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  if (!planMeetsMinimum(restaurant.subscriptionPlan, SubscriptionPlan.PRO)) {
    return (
      <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
        <h1 className="type-title-md">Outbound</h1>
        <p className="type-body-md mt-2 text-[var(--color-muted)]">Pro-only workspace for acquisition drafts.</p>
        <div className="mt-8">
          <UpgradeRequired
            restaurantId={restaurantId}
            title="Upgrade to Pro"
            description="Outbound lead generation and approval queue are included on the Pro plan so we can keep free and starter workspaces focused on your own restaurants."
            requiredPlan={SubscriptionPlan.PRO}
          />
        </div>
      </div>
    );
  }

  const rows = await prisma.outboundLead.findMany({
    where: {
      workspaceRestaurantId: restaurantId,
      status: { in: [OutboundLeadStatus.DRAFT, OutboundLeadStatus.PENDING_APPROVAL] },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const initialLeads = rows.map((r) => ({
    id: r.id,
    city: r.city,
    restaurantName: r.restaurantName,
    contactEmail: r.contactEmail,
    insightSummary: r.insightSummary,
    messageSubject: r.messageSubject,
    messageBody: r.messageBody,
    suggestedTone: r.suggestedTone,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <OutboundWorkspace leads={initialLeads} restaurantId={restaurantId} />
  );
}
