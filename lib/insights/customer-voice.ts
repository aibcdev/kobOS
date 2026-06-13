import type { ReviewSentiment, ReviewTheme } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type NpsBreakdown = {
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  promoterPct: number;
  passivePct: number;
  detractorPct: number;
  total: number;
};

export type ThemeDriver = {
  theme: ReviewTheme;
  label: string;
  positive: number;
  negative: number;
  net: number;
  alert?: boolean;
};

export type WeeklyNps = { week: string; nps: number };

const THEME_LABELS: Record<ReviewTheme, string> = {
  FOOD: "Food quality",
  SERVICE: "Service",
  PRICE: "Pricing",
  SPEED: "Speed",
  ATMOSPHERE: "Atmosphere",
  CLEANLINESS: "Cleanliness",
};

function ratingToBucket(rating: number): "promoter" | "passive" | "detractor" {
  if (rating >= 5) return "promoter";
  if (rating === 4) return "passive";
  return "detractor";
}

export function computeNps(ratings: number[]): NpsBreakdown {
  if (!ratings.length) {
    return { nps: 0, promoters: 0, passives: 0, detractors: 0, promoterPct: 0, passivePct: 0, detractorPct: 0, total: 0 };
  }
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  for (const r of ratings) {
    const b = ratingToBucket(r);
    if (b === "promoter") promoters++;
    else if (b === "passive") passives++;
    else detractors++;
  }
  const total = ratings.length;
  const promoterPct = Math.round((promoters / total) * 100);
  const passivePct = Math.round((passives / total) * 100);
  const detractorPct = Math.round((detractors / total) * 100);
  const nps = promoterPct - detractorPct;
  return { nps, promoters, passives, detractors, promoterPct, passivePct, detractorPct, total };
}

export async function getCustomerVoiceInsights(restaurantId: string, days = 90) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  const reviews = await prisma.customerReview.findMany({
    where: { restaurantId, reviewedAt: { gte: since } },
    orderBy: { reviewedAt: "desc" },
    include: { themeTags: true },
  });

  const nps = computeNps(reviews.map((r) => r.rating));

  const themeMap = new Map<ReviewTheme, { positive: number; negative: number }>();
  for (const theme of Object.keys(THEME_LABELS) as ReviewTheme[]) {
    themeMap.set(theme, { positive: 0, negative: 0 });
  }
  for (const review of reviews) {
    for (const tag of review.themeTags) {
      const entry = themeMap.get(tag.theme)!;
      if (tag.sentiment === "POSITIVE") entry.positive++;
      else if (tag.sentiment === "NEGATIVE") entry.negative++;
    }
  }

  const drivers: ThemeDriver[] = Array.from(themeMap.entries())
    .map(([theme, counts]) => ({
      theme,
      label: THEME_LABELS[theme],
      positive: counts.positive,
      negative: counts.negative,
      net: counts.positive - counts.negative,
    }))
    .sort((a, b) => a.net - b.net);

  const topRisk = drivers.find((d) => d.negative > 0);
  if (topRisk) topRisk.alert = true;

  const alertMessage = topRisk
    ? `${topRisk.label} is your biggest risk area with ${topRisk.negative} negative mention${topRisk.negative === 1 ? "" : "s"}.`
    : null;

  // Weekly NPS trend (last 8 weeks)
  const weekly: WeeklyNps[] = [];
  for (let w = 7; w >= 0; w--) {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - w * 7);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 7);
    const weekReviews = reviews.filter((r) => r.reviewedAt && r.reviewedAt >= start && r.reviewedAt < end);
    const weekNps = computeNps(weekReviews.map((r) => r.rating));
    weekly.push({
      week: start.toISOString().slice(0, 10),
      nps: weekNps.total > 0 ? weekNps.nps : 0,
    });
  }

  return {
    nps,
    drivers,
    alertMessage,
    weekly,
    reviews: reviews.map((r) => ({
      id: r.id,
      body: r.body,
      rating: r.rating,
      reviewerName: r.reviewerName,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      themes: r.themeTags.map((t) => ({ theme: t.theme, sentiment: t.sentiment as ReviewSentiment })),
    })),
  };
}
