import type { AuditResultPayload, RestaurantGrade, RestaurantScoresV1 } from "@/lib/audit/types";
import {
  clampScore,
  evidenceOverallFromAxes,
  scoreBrandSocialForPayload,
  scoreLocalPresenceFromOnPage,
  scoreReviewsFromOnPage,
  scoreWebsiteFromEvidence,
  scoreConversionFromEvidence,
  type EvidenceAxis,
} from "@/lib/audit/evidence-score";

/** Restaurant-only score weights when Google listing is linked (sum = 1). */
export const RESTAURANT_SCORE_WEIGHTS_WITH_PLACE = {
  reviews: 0.24,
  gbp: 0.18,
  website: 0.22,
  competitors: 0.14,
  technical: 0.12,
  brandSocial: 0.1,
} as const;

/** Weights for URL-only audits (no linked listing) — lean on measurable site + brand evidence. */
export const RESTAURANT_SCORE_WEIGHTS_URL_ONLY = {
  website: 0.32,
  technical: 0.26,
  brandSocial: 0.22,
  seo: 0.2,
} as const;

export const RESTAURANT_GRADE_BOUNDARIES: {
  grade: RestaurantGrade;
  min: number;
  meaning: string;
}[] = [
  { grade: "A", min: 90, meaning: "Top 5–10% of restaurants in similar markets" },
  { grade: "B", min: 80, meaning: "Strong, competitive online presence" },
  { grade: "C", min: 65, meaning: "Average / needs work (most restaurants land here)" },
  { grade: "D", min: 50, meaning: "Weak – losing significant local market share" },
  { grade: "F", min: 0, meaning: "Severely underperforming" },
];

export function gradeFromScore(score: number): RestaurantGrade {
  const s = Math.round(score);
  if (s >= 90) return "A";
  if (s >= 80) return "B";
  if (s >= 65) return "C";
  if (s >= 50) return "D";
  return "F";
}

export function gradeMeaning(grade: RestaurantGrade): string {
  return RESTAURANT_GRADE_BOUNDARIES.find((b) => b.grade === grade)?.meaning ?? "";
}

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function weighted(parts: { score: number; weight: number }[]): number {
  const usable = parts.filter((p) => p.weight > 0 && Number.isFinite(p.score));
  const sumW = usable.reduce((a, p) => a + p.weight, 0) || 1;
  const raw = usable.reduce((a, p) => a + p.score * p.weight, 0) / sumW;
  return clamp(raw);
}

function scoreReviews(payload: AuditResultPayload, gaps: string[]): number | null {
  const gp = payload.evidencePack?.googlePlace;
  if (gp?.placeId) {
    const rating = gp.rating ?? 0;
    const volume = gp.reviewCount ?? 0;
    const sample = gp.reviews?.length ?? 0;

    const ratingScore = rating <= 0 ? 25 : clamp(((rating - 3) / 2) * 100, 15, 100);
    const volumeScore =
      volume >= 200 ? 95 : volume >= 100 ? 85 : volume >= 50 ? 72 : volume >= 20 ? 55 : volume >= 5 ? 40 : 22;

    gaps.push("Owner review response rate not available from Places API");
    gaps.push("Average review response time not available from Places API");

    let sentimentScore: number | null = null;
    if (sample > 0 && gp.reviews) {
      const avg = gp.reviews.reduce((a, r) => a + (r.rating || 0), 0) / sample;
      sentimentScore = clamp(((avg - 2.5) / 2.5) * 100, 20, 95);
    } else {
      gaps.push("Review text sample thin for sentiment");
    }

    return weighted([
      { score: ratingScore, weight: 0.45 },
      { score: volumeScore, weight: 0.35 },
      ...(sentimentScore != null ? [{ score: sentimentScore, weight: 0.2 }] : []),
    ]);
  }

  const onPage = scoreReviewsFromOnPage(payload);
  if (onPage != null) {
    gaps.push("Google listing not linked — reviews scored from on-page schema/widgets");
    return onPage;
  }
  gaps.push("Google reviews unavailable — listing not linked and no on-page ratings found");
  return null;
}

function scoreGbp(payload: AuditResultPayload, gaps: string[]): number | null {
  const gp = payload.evidencePack?.googlePlace;
  if (gp?.placeId) {
    let completeness = 40;
    if (gp.placeId) completeness += 20;
    if (gp.rating != null) completeness += 20;
    if ((gp.reviewCount ?? 0) > 0) completeness += 20;

    const photos = gp.photoCount ?? 0;
    const photoScore = photos >= 80 ? 95 : photos >= 40 ? 80 : photos >= 15 ? 65 : photos >= 5 ? 45 : 25;
    if (photos < 15) gaps.push("Few Google listing photos");

    gaps.push("GBP categories, hours, posts, and Q&A not fully available from this scan");

    return weighted([
      { score: clamp(completeness), weight: 0.5 },
      { score: photoScore, weight: 0.5 },
    ]);
  }

  const onPage = scoreLocalPresenceFromOnPage(payload);
  if (onPage != null) {
    gaps.push("Google Business Profile not resolved — scored hours/address/maps on the website instead");
    return onPage;
  }
  gaps.push("Google Business Profile not resolved — discovery not scored");
  return null;
}

function scoreCompetitors(payload: AuditResultPayload, gaps: string[]): number | null {
  if (!payload.evidencePack?.googlePlace?.placeId) {
    gaps.push("Nearby competitors not scored without a linked Google listing");
    return null;
  }
  const comps = payload.competitors.filter((c) => c.source === "places" || c.mockScore > 0);
  if (comps.length === 0) {
    gaps.push("Nearby competitors not resolved");
    return null;
  }

  const ours = payload.restaurantScores?.overall ?? payload.scores.overall ?? payload.rubricV2?.overall ?? 50;
  const peerAvg = comps.reduce((a, c) => a + (c.mockScore || 0), 0) / Math.max(1, comps.length);

  const gap = peerAvg - ours;
  const packScore = gap <= -10 ? 90 : gap <= 0 ? 75 : gap <= 10 ? 55 : gap <= 20 ? 40 : 28;

  const ourReviews = payload.evidencePack?.googlePlace?.reviewCount ?? 0;
  const volumeVsPeers =
    ourReviews >= 150 ? 88 : ourReviews >= 60 ? 72 : ourReviews >= 20 ? 55 : ourReviews > 0 ? 40 : 28;

  const photos = payload.evidencePack?.googlePlace?.photoCount ?? 0;
  const gbpVs = photos >= 50 ? 80 : photos >= 20 ? 65 : photos >= 5 ? 48 : 32;

  const eng = payload.evidencePack?.engagementSignals?.ctaAudit;
  const convSignals = (eng?.bookReserve || eng?.orderOnline ? 70 : 40) + (eng?.phone ? 15 : 0);

  return weighted([
    { score: packScore, weight: 0.4 },
    { score: volumeVsPeers, weight: 0.25 },
    { score: gbpVs, weight: 0.2 },
    { score: clamp(convSignals), weight: 0.15 },
  ]);
}

function scoreTechnical(payload: AuditResultPayload, gaps: string[]): number {
  const signals = payload.evidencePack?.urlSignals;
  const psi = payload.evidencePack?.pageSpeed;
  const rubricSeo = payload.rubricV2?.seo;

  let speed = 50;
  if (psi?.performanceScore != null) {
    speed = psi.performanceScore;
  } else {
    gaps.push("PageSpeed / Core Web Vitals not available");
    speed = clamp(payload.scores.mobile);
  }
  if (psi?.lcpMs != null && psi.lcpMs > 4000) speed = Math.min(speed, 45);
  if (psi?.cls != null && psi.cls > 0.25) speed = Math.min(speed, 50);

  let seo = rubricSeo ?? 40;
  if (rubricSeo == null && signals) {
    seo = 40;
    if (signals.titleLen >= 10 && signals.titleLen <= 65) seo += 15;
    if (signals.hasMetaDescription) seo += 15;
    if (signals.h1Count === 1) seo += 10;
    if (signals.imgWithAltCount > 0 && signals.imgCount > 0) {
      seo += Math.min(15, Math.round((signals.imgWithAltCount / Math.max(1, signals.imgCount)) * 15));
    }
    if (signals.hasCanonical) seo += 5;
    if (signals.hasJsonLd) seo += 8;
    if (signals.robotsTxtFound) seo += 4;
    if (signals.sitemapFound) seo += 4;
    seo = clamp(seo);
  } else if (!signals) {
    seo = clamp(payload.scores.seo);
  }

  const security = signals?.isHttps ? 90 : 25;
  if (signals && !signals.isHttps) gaps.push("Site is not on HTTPS");

  let schema = 35;
  if (signals?.hasJsonLd) schema += 30;
  if (signals?.hasRestaurantSchema) schema += 30;
  if (signals && !signals.hasRestaurantSchema && !signals.hasJsonLd) {
    gaps.push("Restaurant/LocalBusiness schema missing or weak");
  }

  return weighted([
    { score: clamp(speed), weight: 0.4 },
    { score: clamp(seo), weight: 0.3 },
    { score: security, weight: 0.15 },
    { score: clamp(schema), weight: 0.15 },
  ]);
}

function confidenceFromGaps(gaps: string[], hasPlace: boolean, fetched: boolean): "low" | "medium" | "high" {
  if (!fetched && !hasPlace) return "low";
  if (gaps.length >= 6) return "low";
  if (gaps.length >= 3 || !hasPlace) return "medium";
  return "high";
}

/** Compute restaurant-calibrated multi-axis scores from available audit signals. */
export function computeRestaurantScores(payload: AuditResultPayload): RestaurantScoresV1 {
  const gaps: string[] = [];
  const hasPlace = Boolean(payload.evidencePack?.googlePlace?.placeId);
  const fetched = Boolean(payload.evidencePack?.urlSignals?.fetched);

  const reviewsMeasured = scoreReviews(payload, gaps);
  const gbpMeasured = scoreGbp(payload, gaps);
  const website = scoreWebsiteFromEvidence(payload, gaps);
  const technical = scoreTechnical(payload, gaps);
  const brandSocial = scoreBrandSocialForPayload(payload);

  const provisional: AuditResultPayload = {
    ...payload,
    restaurantScores: undefined,
  };
  const competitorsMeasured = scoreCompetitors(provisional, gaps);

  const axes: EvidenceAxis[] = [];
  const wPlace = RESTAURANT_SCORE_WEIGHTS_WITH_PLACE;
  const wUrl = RESTAURANT_SCORE_WEIGHTS_URL_ONLY;

  if (reviewsMeasured != null) {
    axes.push({ key: "reviews", score: reviewsMeasured, weight: hasPlace ? wPlace.reviews : 0.16 });
  }
  if (gbpMeasured != null) {
    axes.push({ key: "gbp", score: gbpMeasured, weight: hasPlace ? wPlace.gbp : 0.14 });
  }
  axes.push({ key: "website", score: website, weight: hasPlace ? wPlace.website : wUrl.website });
  axes.push({ key: "technical", score: technical, weight: hasPlace ? wPlace.technical : wUrl.technical });
  axes.push({ key: "brandSocial", score: brandSocial, weight: hasPlace ? wPlace.brandSocial : wUrl.brandSocial });
  if (competitorsMeasured != null) {
    axes.push({ key: "competitors", score: competitorsMeasured, weight: wPlace.competitors });
  } else if (!hasPlace) {
    const seo = payload.rubricV2?.seo ?? payload.scores.seo;
    if (Number.isFinite(seo)) {
      axes.push({ key: "seo", score: clampScore(seo), weight: wUrl.seo });
    }
  }

  const overallFinal = evidenceOverallFromAxes(axes);

  const uniqueGaps = [...new Set(gaps)].slice(0, 12);

  return {
    overall: overallFinal,
    grade: gradeFromScore(overallFinal),
    reviews: reviewsMeasured,
    gbp: gbpMeasured,
    website,
    competitors: competitorsMeasured,
    technical,
    confidence: confidenceFromGaps(uniqueGaps, hasPlace, fetched),
    dataGaps: uniqueGaps.length ? uniqueGaps : undefined,
  };
}

export function applyRestaurantScoresToPayload(payload: AuditResultPayload): AuditResultPayload {
  const restaurantScores = computeRestaurantScores(payload);
  return {
    ...payload,
    restaurantScores,
    scores: {
      ...payload.scores,
      overall: restaurantScores.overall,
      conversion: scoreConversionFromEvidence(payload),
    },
  };
}
