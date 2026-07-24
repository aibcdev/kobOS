import type { Metadata } from "next";
import { OutboundWorkspace } from "@/components/dashboard/outbound/OutboundWorkspace";
import { PreviewPlaceholder } from "@/components/dashboard/PreviewPlaceholder";
import { UpgradeRequired } from "@/components/dashboard/UpgradeRequired";
import { DashboardEmptyRestaurant } from "@/components/dashboard/DashboardEmptyRestaurant";
import { prisma } from "@/lib/db/prisma";
import { LeadProspectStatus, OutboundLeadSource, OutboundLeadStatus, SubscriptionPlan } from "@prisma/client";
import { getActiveRestaurantContext } from "@/lib/dashboard/active-restaurant";
import { getDashboardPageUser } from "@/lib/dashboard/get-dashboard-user";
import { isUiPreviewEnabled } from "@/lib/preview/ui-preview";
import { canUseOutboundWorkspace, isOutboundSalesMode } from "@/lib/outbound/sales-access";
import { isUkColdOutboundMode } from "@/lib/outbound/icp-config";
import { platformFoundWhere, platformQualifiedWhere } from "@/lib/lead-engine/contactable-query";

export const metadata: Metadata = {
  title: "Sales pipeline · KOB",
  description: "UK cold outreach and audit follow-up with batch approval.",
};

function mapLead(r: {
  id: string;
  city: string | null;
  restaurantName: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  insightSummary: string | null;
  messageSubject: string | null;
  messageBody: string | null;
  suggestedTone: string | null;
  status: string;
  source: string;
  qualifyScore: number | null;
  reviewCount: number | null;
  enrichmentSource: string | null;
  emailVariant: string | null;
  auditUrl: string | null;
  visibilityAuditId: string | null;
  createdAt: Date;
}) {
  return {
    id: r.id,
    city: r.city,
    restaurantName: r.restaurantName,
    contactEmail: r.contactEmail,
    websiteUrl: r.websiteUrl,
    insightSummary: r.insightSummary,
    messageSubject: r.messageSubject,
    messageBody: r.messageBody,
    suggestedTone: r.suggestedTone,
    status: r.status,
    source: r.source,
    qualifyScore: r.qualifyScore,
    reviewCount: r.reviewCount,
    enrichmentSource: r.enrichmentSource,
    emailVariant: r.emailVariant,
    auditUrl: r.auditUrl,
    visibilityAuditId: r.visibilityAuditId,
    createdAt: r.createdAt.toISOString(),
  };
}

const queueStatuses = [OutboundLeadStatus.DRAFT, OutboundLeadStatus.PENDING_APPROVAL] as const;

export default async function OutboundPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  if (isUiPreviewEnabled()) {
    return <PreviewPlaceholder title="Sales pipeline" description="Needs database and outbound env." />;
  }
  const userId = (await getDashboardPageUser()).id;
  const sp = await searchParams;
  const { restaurantId, restaurant } = await getActiveRestaurantContext(userId, sp.r);
  if (!restaurantId || !restaurant) return <DashboardEmptyRestaurant />;

  if (!canUseOutboundWorkspace(restaurant.subscriptionPlan)) {
    return (
      <div className="mx-auto max-w-4xl px-[var(--spacing-md)] py-10">
        <h1 className="type-title-md">Sales pipeline</h1>
        <UpgradeRequired
          restaurantId={restaurantId}
          title="Upgrade to Pro"
          description="Or set OUTBOUND_SALES_MODE=1 for internal UK cold outreach."
          requiredPlan={SubscriptionPlan.PRO}
        />
      </div>
    );
  }

  const baseWhere = {
    workspaceRestaurantId: restaurantId,
    status: { in: [...queueStatuses] },
  };

  const [ukColdRows, auditRows, approvedRows, sentRows, leadProspects, leadProspectTotal, leadProspectContactable] =
    await Promise.all([
    prisma.outboundLead.findMany({
      where: {
        ...baseWhere,
        source: { in: [OutboundLeadSource.UK_COLD, OutboundLeadSource.LEAD_ENGINE] },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.outboundLead.findMany({
      where: {
        ...baseWhere,
        source: { in: [OutboundLeadSource.AUDIT, OutboundLeadSource.LEGACY, OutboundLeadSource.MANUAL] },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.outboundLead.findMany({
      where: { workspaceRestaurantId: restaurantId, status: OutboundLeadStatus.APPROVED },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.outboundLead.findMany({
      where: { workspaceRestaurantId: restaurantId, status: OutboundLeadStatus.SENT },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.leadProspect.findMany({
      where: {
        ...platformFoundWhere(restaurantId),
        contactEmail: { not: null },
        status: { in: [LeadProspectStatus.DISCOVERED, LeadProspectStatus.ANALYZED] },
      },
      orderBy: [{ kobOpportunityScore: "desc" }, { platformRank: "asc" }, { reviewCount: "desc" }],
      take: 3000,
    }),
    prisma.leadProspect.count({ where: platformFoundWhere(restaurantId) }),
    prisma.leadProspect.count({ where: platformQualifiedWhere(restaurantId) }),
  ]);

  return (
    <OutboundWorkspace
      ukColdQueue={ukColdRows.map(mapLead)}
      auditQueue={auditRows.map(mapLead)}
      approved={approvedRows.map(mapLead)}
      sent={sentRows.map(mapLead)}
      leadProspects={leadProspects.map((p) => ({
        id: p.id,
        name: p.name,
        city: p.city,
        country: p.country,
        websiteUrl: p.websiteUrl,
        contactEmail: p.contactEmail,
        contactPhone: p.contactPhone,
        hasContactForm: p.hasContactForm,
        weakWebsite: p.weakWebsite,
        reviewCount: p.reviewCount,
        rating: p.rating,
        kobOpportunityScore: p.kobOpportunityScore,
        opportunities: p.opportunities,
        hasTikTok: p.hasTikTok,
        deliveryPlatforms: p.deliveryPlatforms,
        platformRank: p.platformRank,
        platformRankPercentile: p.platformRankPercentile,
        locationCount: p.locationCount,
        websiteStale: p.websiteStale,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      }))}
      leadProspectTotal={leadProspectTotal}
      leadProspectContactable={leadProspectContactable}
      restaurantId={restaurantId}
      salesMode={isOutboundSalesMode()}
      ukColdMode={isUkColdOutboundMode()}
      defaultCity={process.env.OUTBOUND_SCAN_CITY?.trim() ?? ""}
    />
  );
}
