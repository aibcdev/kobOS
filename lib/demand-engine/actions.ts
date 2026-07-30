import { ServiceRequestStatus, ServiceRequestType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { StructuredOffer } from "@/lib/demand-engine/types";
import { discountLabelFromOffer } from "@/lib/demand-engine/types";
import { generateDailyRecommendationsForRestaurant } from "@/lib/demand-engine/generate-daily-recommendations";
import {
  planLocalGoogleAdsCampaign,
  type LocalAdsGoal,
  type LocalAdsPlan,
} from "@/lib/demand-engine/google-ads-local";
import {
  buildB2bAuditAdsPlan,
  type B2bAuditAdsPlan,
} from "@/lib/marketing/google-ads-b2b-audit";
import { notifyOperatorServiceRequest } from "@/lib/ops/notify-service-request";

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Ensure the Demand inbox has up to 3 recommendations (Phase 2 generator). */
export async function ensureDemoDemandRecommendations(restaurantId: string) {
  const result = await generateDailyRecommendationsForRestaurant(restaurantId);
  return { seeded: result.created };
}

/**
 * Owner Approve → Requested ticket for ops (publish within ~48h).
 * Does not go live automatically — ops fulfills and marks Delivered.
 */
export async function approveDemandRecommendation(
  restaurantId: string,
  recommendationId: string,
  ownerEmail?: string | null,
) {
  const rec = await prisma.demandRecommendation.findFirst({
    where: { id: recommendationId, restaurantId, status: "PENDING" },
  });
  if (!rec) return { ok: false as const, error: "Recommendation not found or not pending" };

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true },
  });
  if (!restaurant) return { ok: false as const, error: "Restaurant not found" };

  const existing = await prisma.serviceRequest.findFirst({
    where: {
      restaurantId,
      status: { in: [ServiceRequestStatus.REQUESTED, ServiceRequestStatus.IN_PROGRESS] },
      notes: { contains: `recommendationId=${rec.id}` },
    },
    select: { id: true, title: true, notes: true, status: true },
  });
  if (existing) {
    return {
      ok: true as const,
      alreadyPending: true as const,
      request: existing,
      campaign: null,
      liveOffer: null,
      recommendation: rec,
    };
  }

  const offer = (rec.offer ?? {}) as StructuredOffer;
  const headline = offer.headline || rec.title;
  const validFrom = offer.validFrom ? new Date(offer.validFrom) : new Date();
  const validTo = offer.validTo ? new Date(offer.validTo) : daysFromNow(3);
  const label = discountLabelFromOffer({
    headline,
    description: offer.description || rec.reason,
    discountType: offer.discountType || "percent",
    discountValue: offer.discountValue,
    discountLabel: offer.discountLabel,
    validFrom: validFrom.toISOString(),
    validTo: validTo.toISOString(),
  });

  const result = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        restaurantId,
        type: "PROMOTIONAL",
        title: headline,
        channel: "WEBSITE_BANNER",
        status: "DRAFT",
        payload: {
          source: "demand_engine",
          recommendationId: rec.id,
          offer,
          estimatedExtraCustomers: rec.estimatedExtraCustomers,
          estimatedExtraRevenue: rec.estimatedExtraRevenue,
        },
      },
    });

    const liveOffer = await tx.liveOffer.create({
      data: {
        restaurantId,
        campaignId: campaign.id,
        status: "DRAFT",
        title: headline,
        discountLabel: label,
        offer: offer as object,
        validFrom,
        validTo,
      },
    });

    await tx.channelPublish.create({
      data: {
        liveOfferId: liveOffer.id,
        channel: "WEBSITE_BANNER",
        status: "QUEUED",
        metadata: { note: "Awaiting ops — publish after Requested ticket is fulfilled" },
      },
    });

    await tx.channelPublish.create({
      data: {
        liveOfferId: liveOffer.id,
        channel: "GOOGLE_POST",
        status: "QUEUED",
        metadata: { note: "Awaiting ops — Google Business post after ticket fulfilled" },
      },
    });

    const updated = await tx.demandRecommendation.update({
      where: { id: rec.id },
      data: {
        status: "APPROVED",
        campaignId: campaign.id,
        liveOfferId: liveOffer.id,
      },
    });

    const request = await tx.serviceRequest.create({
      data: {
        restaurantId,
        type: ServiceRequestType.OTHER,
        status: ServiceRequestStatus.REQUESTED,
        title: `Publish offer: ${label}`,
        notes: [
          `recommendationId=${rec.id}`,
          `liveOfferId=${liveOffer.id}`,
          `campaignId=${campaign.id}`,
          `reason=${rec.reason}`,
          "Owner approved Demand offer — publish Website + Google post, then mark Delivered.",
        ].join("\n"),
        creditCost: 0,
      },
      select: { id: true, title: true, notes: true, status: true },
    });

    return { campaign, liveOffer, recommendation: updated, request };
  });

  const notify = await notifyOperatorServiceRequest({
    restaurantName: restaurant.name,
    restaurantId,
    ownerEmail: ownerEmail ?? null,
    title: result.request.title,
    type: ServiceRequestType.OTHER,
    notes: result.request.notes,
    creditCost: 0,
    requestId: result.request.id,
  });

  return { ok: true as const, alreadyPending: false as const, notified: notify.ok, ...result };
}

export async function dismissDemandRecommendation(restaurantId: string, recommendationId: string) {
  const rec = await prisma.demandRecommendation.findFirst({
    where: { id: recommendationId, restaurantId, status: "PENDING" },
  });
  if (!rec) return { ok: false as const, error: "Recommendation not found or not pending" };

  const updated = await prisma.demandRecommendation.update({
    where: { id: rec.id },
    data: { status: "DISMISSED" },
  });
  return { ok: true as const, recommendation: updated };
}

export async function pauseLiveOffer(restaurantId: string, liveOfferId: string) {
  const offer = await prisma.liveOffer.findFirst({
    where: { id: liveOfferId, restaurantId, status: "LIVE" },
  });
  if (!offer) return { ok: false as const, error: "Live offer not found" };

  const updated = await prisma.$transaction(async (tx) => {
    const live = await tx.liveOffer.update({
      where: { id: offer.id },
      data: { status: "PAUSED" },
    });
    if (offer.campaignId) {
      await tx.campaign.update({
        where: { id: offer.campaignId },
        data: { status: "PAUSED" },
      });
    }
    return live;
  });

  return { ok: true as const, liveOffer: updated };
}

export type DemandPerformanceSummary = {
  extraCustomers: number;
  estimatedRevenue: number;
  offersRun: number;
  bestOfferTitle: string | null;
};

/** Lightweight last-30-days proof — extra customers, not clicks. */
export async function getDemandPerformanceLast30Days(
  restaurantId: string,
): Promise<DemandPerformanceSummary> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const rows = await prisma.campaignPerformance.findMany({
    where: {
      periodEnd: { gte: since },
      OR: [
        { liveOffer: { restaurantId } },
        { campaign: { restaurantId } },
      ],
    },
    include: {
      liveOffer: { select: { title: true } },
      campaign: { select: { title: true } },
    },
  });

  if (rows.length === 0) {
    const offersRun = await prisma.liveOffer.count({
      where: {
        restaurantId,
        status: { in: ["LIVE", "PAUSED", "COMPLETED"] },
        createdAt: { gte: since },
      },
    });
    return {
      extraCustomers: 0,
      estimatedRevenue: 0,
      offersRun,
      bestOfferTitle: null,
    };
  }

  let extraCustomers = 0;
  let estimatedRevenue = 0;
  let best: { title: string; customers: number } | null = null;
  for (const row of rows) {
    extraCustomers += row.extraCustomers;
    estimatedRevenue += row.estimatedRevenue;
    const title = row.liveOffer?.title ?? row.campaign?.title ?? null;
    if (title && (!best || row.extraCustomers > best.customers)) {
      best = { title, customers: row.extraCustomers };
    }
  }

  const offersRun = await prisma.liveOffer.count({
    where: {
      restaurantId,
      status: { in: ["LIVE", "PAUSED", "COMPLETED"] },
      createdAt: { gte: since },
    },
  });

  return {
    extraCustomers,
    estimatedRevenue,
    offersRun,
    bestOfferTitle: best?.title ?? null,
  };
}

export async function createLocalGoogleAdsCampaign(
  restaurantId: string,
  input: {
    area: string;
    radiusKm?: number;
    dailyBudgetGbp?: number;
    goal?: LocalAdsGoal;
    promoHeadline?: string;
  },
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, cuisineType: true, city: true, website: true },
  });
  if (!restaurant) return { ok: false as const, error: "Restaurant not found" };

  let plan: LocalAdsPlan;
  try {
    plan = await planLocalGoogleAdsCampaign({
      restaurantName: restaurant.name,
      cuisine: restaurant.cuisineType,
      area: input.area.trim() || restaurant.city || "",
      radiusKm: input.radiusKm,
      dailyBudgetGbp: input.dailyBudgetGbp,
      goal: input.goal,
      website: restaurant.website,
      promoHeadline: input.promoHeadline,
    });
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Could not build campaign" };
  }

  const campaign = await prisma.campaign.create({
    data: {
      restaurantId,
      type: "PROMOTIONAL",
      title: plan.campaignName,
      channel: "GOOGLE_ADS",
      status: "DRAFT",
      payload: plan as object,
    },
  });

  const liveOffer = await prisma.liveOffer.create({
    data: {
      restaurantId,
      campaignId: campaign.id,
      status: "DRAFT",
      title: plan.campaignName,
      discountLabel: input.promoHeadline?.trim() || "Local Google Ads",
      offer: {
        headline: input.promoHeadline?.trim() || `${restaurant.name} · ${plan.areaLabel}`,
        description: `Local Search campaign · ${plan.radiusKm} km · £${plan.dailyBudgetGbp}/day`,
        discountType: "percent",
        discountValue: 0,
        discountLabel: "Local Ads",
        validFrom: new Date().toISOString(),
        validTo: daysFromNow(30).toISOString(),
        templateKey: "google_ads_local",
      },
      validFrom: new Date(),
      validTo: daysFromNow(30),
      lat: plan.geo.lat,
      lng: plan.geo.lng,
    },
  });

  await prisma.channelPublish.create({
    data: {
      liveOfferId: liveOffer.id,
      channel: "GOOGLE_ADS",
      status: "QUEUED",
      metadata: {
        note: "Import Ads Editor CSV into Google Ads. API publish needs a linked Ads account.",
        campaignId: campaign.id,
        areaLabel: plan.areaLabel,
        radiusKm: plan.radiusKm,
        dailyBudgetGbp: plan.dailyBudgetGbp,
      },
    },
  });

  return { ok: true as const, campaign, liveOffer, plan };
}

export async function createB2bAuditGoogleAdsCampaign(
  restaurantId: string,
  input: {
    dailyBudgetGbp?: number;
    locations?: string[];
  },
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true },
  });
  if (!restaurant) return { ok: false as const, error: "Restaurant not found" };

  const plan: B2bAuditAdsPlan = buildB2bAuditAdsPlan({
    dailyBudgetGbp: input.dailyBudgetGbp,
    locations: input.locations,
  });

  const campaign = await prisma.campaign.create({
    data: {
      restaurantId,
      type: "PROMOTIONAL",
      title: plan.campaignName,
      channel: "GOOGLE_ADS",
      status: "DRAFT",
      payload: plan as object,
    },
  });

  const liveOffer = await prisma.liveOffer.create({
    data: {
      restaurantId,
      campaignId: campaign.id,
      status: "DRAFT",
      title: plan.campaignName,
      discountLabel: "B2B Audit Ads",
      offer: {
        headline: "Free restaurant audit",
        description: `B2B Search · ${plan.keywords.length} keywords · £${plan.dailyBudgetGbp}/day → trykob.com/audit`,
        discountType: "percent",
        discountValue: 0,
        discountLabel: "Free audit",
        validFrom: new Date().toISOString(),
        validTo: daysFromNow(30).toISOString(),
        templateKey: "google_ads_b2b_audit",
      },
      validFrom: new Date(),
      validTo: daysFromNow(30),
    },
  });

  await prisma.channelPublish.create({
    data: {
      liveOfferId: liveOffer.id,
      channel: "GOOGLE_ADS",
      status: "QUEUED",
      metadata: {
        note: "B2B audit Search — import Ads Editor CSV. Landing: trykob.com/audit",
        campaignId: campaign.id,
        mode: "b2b_audit",
        dailyBudgetGbp: plan.dailyBudgetGbp,
        keywordCount: plan.keywords.length,
      },
    },
  });

  return { ok: true as const, campaign, liveOffer, plan };
}

export async function listLocalGoogleAdsCampaigns(restaurantId: string) {
  return prisma.campaign.findMany({
    where: { restaurantId, channel: "GOOGLE_ADS" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
