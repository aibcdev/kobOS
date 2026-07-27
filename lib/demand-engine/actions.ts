import { prisma } from "@/lib/db/prisma";
import type { StructuredOffer } from "@/lib/demand-engine/types";
import { discountLabelFromOffer } from "@/lib/demand-engine/types";
import {
  planLocalGoogleAdsCampaign,
  type LocalAdsGoal,
  type LocalAdsPlan,
} from "@/lib/demand-engine/google-ads-local";
import {
  buildB2bAuditAdsPlan,
  type B2bAuditAdsPlan,
} from "@/lib/marketing/google-ads-b2b-audit";

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Seed a few demo recommendations so Phase 1 UI always has cards to approve. */
export async function ensureDemoDemandRecommendations(restaurantId: string) {
  const pending = await prisma.demandRecommendation.count({
    where: { restaurantId, status: "PENDING" },
  });
  if (pending > 0) return { seeded: 0 };

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true, cuisineType: true, city: true },
  });
  if (!restaurant) return { seeded: 0 };

  const cuisine = restaurant.cuisineType?.trim() || "restaurant";
  const city = restaurant.city?.trim() || "your area";
  const now = new Date();
  const validFrom = now.toISOString();
  const validTo = daysFromNow(3).toISOString();

  const demos: Array<{
    title: string;
    reason: string;
    confidence: number;
    impactScore: number;
    estimatedExtraCustomers: number;
    estimatedExtraRevenue: number;
    templateKey: string;
    offer: StructuredOffer;
  }> = [
    {
      title: "Quiet midweek boost",
      reason: `Tue–Wed evenings are typically quiet for ${cuisine} spots in ${city}. A limited midweek offer can fill empty covers.`,
      confidence: 78,
      impactScore: 72,
      estimatedExtraCustomers: 18,
      estimatedExtraRevenue: 540,
      templateKey: "slow_weekday",
      offer: {
        headline: "Midweek 20% off mains",
        description: `Bring guests back Tue–Wed with 20% off mains at ${restaurant.name}.`,
        discountType: "percent",
        discountValue: 20,
        daypart: "dinner",
        conditions: "Dine-in only · Tue–Wed · Ends Sunday",
        validFrom,
        validTo,
        templateKey: "slow_weekday",
      },
    },
    {
      title: "Lunch special for nearby workers",
      reason: "Lunch dayparts convert well with a clear price-led special and a short window.",
      confidence: 74,
      impactScore: 65,
      estimatedExtraCustomers: 22,
      estimatedExtraRevenue: 440,
      templateKey: "lunch_special",
      offer: {
        headline: "£12 lunch deal",
        description: "Main + soft drink for £12, Mon–Fri 12–3pm.",
        discountType: "fixed_menu",
        discountValue: 12,
        discountLabel: "£12 lunch",
        daypart: "lunch",
        conditions: "Mon–Fri · 12–3pm · While stocks last",
        validFrom,
        validTo: daysFromNow(5).toISOString(),
        templateKey: "lunch_special",
      },
    },
    {
      title: "Rainy-day comfort offer",
      reason: "Wet weather usually lifts takeaway and early dinner interest — reward guests who still come out.",
      confidence: 70,
      impactScore: 60,
      estimatedExtraCustomers: 14,
      estimatedExtraRevenue: 380,
      templateKey: "rainy_day",
      offer: {
        headline: "Rainy day: free side",
        description: "Free side with any main when it rains — show this offer at the till.",
        discountType: "bogo",
        discountLabel: "Free side",
        daypart: "all_day",
        conditions: "Valid on rainy days this week · One per table",
        validFrom,
        validTo: daysFromNow(4).toISOString(),
        templateKey: "rainy_day",
      },
    },
  ];

  await prisma.demandRecommendation.createMany({
    data: demos.map((d) => ({
      restaurantId,
      title: d.title,
      reason: d.reason,
      confidence: d.confidence,
      impactScore: d.impactScore,
      estimatedExtraCustomers: d.estimatedExtraCustomers,
      estimatedExtraRevenue: d.estimatedExtraRevenue,
      templateKey: d.templateKey,
      offer: d.offer,
      expiresAt: daysFromNow(7),
      status: "PENDING",
    })),
  });

  return { seeded: demos.length };
}

export async function approveDemandRecommendation(restaurantId: string, recommendationId: string) {
  const rec = await prisma.demandRecommendation.findFirst({
    where: { id: recommendationId, restaurantId, status: "PENDING" },
  });
  if (!rec) return { ok: false as const, error: "Recommendation not found or not pending" };

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
        status: "ACTIVE",
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
        status: "LIVE",
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
        metadata: { note: "Website banner queued — publish wiring in Phase 3" },
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

    return { campaign, liveOffer, recommendation: updated };
  });

  return { ok: true as const, ...result };
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
