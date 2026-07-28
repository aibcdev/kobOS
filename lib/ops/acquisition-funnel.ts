import { MarketingFunnelKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { KOB_B2B_CAMPAIGN, isPaidGoogleAttribution } from "@/lib/marketing/attribution";

export type AcquisitionFunnelSnapshot = {
  since: string;
  asOf: string;
  clicks: number;
  impressions: number;
  spendGbp: number;
  auditsTotal: number;
  auditsFromAds: number;
  trialsTotal: number;
  trialsFromAds: number;
  rates: {
    clickToAuditPct: number | null;
    auditToTrialPct: number | null;
    clickToTrialPct: number | null;
  };
  recentAudits: Array<{
    id: string;
    restaurantName: string;
    createdAt: string;
    fromAds: boolean;
    utmCampaign: string | null;
  }>;
  recentTrials: Array<{
    restaurantId: string;
    name: string;
    trialStartedAt: string;
    fromAds: boolean;
  }>;
  adsNote: string;
};

function pct(num: number, den: number): number | null {
  if (den <= 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

/** Campaign launch day for KOB B2B on account 2075308048. */
export const KOB_ADS_FUNNEL_SINCE = new Date("2026-07-28T12:00:00.000Z");

export async function loadAcquisitionFunnel(
  since: Date = KOB_ADS_FUNNEL_SINCE,
): Promise<AcquisitionFunnelSnapshot> {
  const paidAuditWhere: Prisma.VisibilityAuditWhereInput = {
    createdAt: { gte: since },
    OR: [
      { gclid: { not: null } },
      { utmSource: { equals: "google", mode: "insensitive" } },
      { utmCampaign: { contains: "kob_b2b", mode: "insensitive" } },
    ],
  };

  const latestAds = await prisma.marketingFunnelEvent.findFirst({
    where: { kind: MarketingFunnelKind.AD_METRICS_SNAPSHOT, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });

  const adsMetrics = (latestAds?.metrics ?? {}) as {
    clicks?: number;
    impressions?: number;
    costMicros?: number;
  };

  const [auditsTotal, auditsFromAds, trialsCount, trials, recentAudits, funnelTrials] =
    await Promise.all([
      prisma.visibilityAudit.count({ where: { createdAt: { gte: since } } }),
      prisma.visibilityAudit.count({ where: paidAuditWhere }),
      prisma.restaurant.count({ where: { trialStartedAt: { gte: since } } }),
      prisma.restaurant.findMany({
        where: { trialStartedAt: { gte: since } },
        select: { id: true, name: true, trialStartedAt: true },
        orderBy: { trialStartedAt: "desc" },
        take: 20,
      }),
      prisma.visibilityAudit.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          restaurantName: true,
          createdAt: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          gclid: true,
        },
      }),
      prisma.marketingFunnelEvent.findMany({
        where: { kind: MarketingFunnelKind.TRIAL_STARTED, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  const trialsFromAds = funnelTrials.filter(
    (e) =>
      Boolean(e.gclid) ||
      e.source.toLowerCase() === "google" ||
      e.campaign.toLowerCase().includes("kob_b2b"),
  ).length;

  const clicks = Number(adsMetrics.clicks ?? 0);
  const impressions = Number(adsMetrics.impressions ?? 0);
  const spendGbp = Math.round((Number(adsMetrics.costMicros ?? 0) / 1_000_000) * 100) / 100;

  return {
    since: since.toISOString(),
    asOf: new Date().toISOString(),
    clicks,
    impressions,
    spendGbp,
    auditsTotal,
    auditsFromAds,
    trialsTotal: trialsCount,
    trialsFromAds,
    rates: {
      clickToAuditPct: pct(auditsFromAds, clicks),
      auditToTrialPct: pct(trialsFromAds, auditsFromAds),
      clickToTrialPct: pct(trialsFromAds, clicks),
    },
    recentAudits: recentAudits.map((a) => ({
      id: a.id,
      restaurantName: a.restaurantName,
      createdAt: a.createdAt.toISOString(),
      fromAds: isPaidGoogleAttribution({
        utmSource: a.utmSource ?? undefined,
        utmMedium: a.utmMedium ?? undefined,
        utmCampaign: a.utmCampaign ?? undefined,
        gclid: a.gclid ?? undefined,
      }),
      utmCampaign: a.utmCampaign,
    })),
    recentTrials: trials.map((t) => ({
      restaurantId: t.id,
      name: t.name,
      trialStartedAt: t.trialStartedAt!.toISOString(),
      fromAds: funnelTrials.some(
        (e) =>
          e.restaurantId === t.id &&
          (Boolean(e.gclid) ||
            e.source.toLowerCase() === "google" ||
            e.campaign.toLowerCase().includes("kob_b2b")),
      ),
    })),
    adsNote: latestAds
      ? `Last Ads snapshot ${latestAds.createdAt.toISOString()} · campaign ${latestAds.campaign || KOB_B2B_CAMPAIGN}`
      : "No Ads snapshot yet — run: python ads/funnel_snapshot.py",
  };
}
