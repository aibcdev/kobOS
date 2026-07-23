import type { AuditResultPayload, RestaurantGrade, RestaurantScoresV1 } from "@/lib/audit/types";

/** Restaurant-only score weights (sum = 1). */
export const RESTAURANT_SCORE_WEIGHTS = {
  reviews: 0.28,
  gbp: 0.22,
  website: 0.2,
  competitors: 0.18,
  technical: 0.12,
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
  const sumW = parts.reduce((a, p) => a + p.weight, 0) || 1;
  const raw = parts.reduce((a, p) => a + p.score * p.weight, 0) / sumW;
  return clamp(raw);
}

function scoreReviews(payload: AuditResultPayload, gaps: string[]): number {
  const gp = payload.evidencePack?.googlePlace;
  if (!gp) {
    gaps.push("Google reviews unavailable");
    return 42;
  }

  const rating = gp.rating ?? 0;
  const volume = gp.reviewCount ?? 0;
  const sample = gp.reviews?.length ?? 0;

  // Overall rating (25% of axis) — benchmark ≥ 4.5
  const ratingScore = rating <= 0 ? 25 : clamp(((rating - 3) / 2) * 100, 15, 100);

  // Review volume last-12 proxy (20%) — use total count as proxy
  const volumeScore =
    volume >= 200 ? 95 : volume >= 100 ? 85 : volume >= 50 ? 72 : volume >= 20 ? 55 : volume >= 5 ? 40 : 22;

  // Response rate (25%) — no Places API field; mark gap, mild mid score
  gaps.push("Owner review response rate not available from Places API");
  const responseScore = 55;

  // Response time (15%)
  gaps.push("Average review response time not available from Places API");
  const responseTimeScore = 50;

  // Sentiment proxy (15%) from sample review ratings
  let sentimentScore = 55;
  if (sample > 0 && gp.reviews) {
    const avg = gp.reviews.reduce((a, r) => a + (r.rating || 0), 0) / sample;
    sentimentScore = clamp(((avg - 2.5) / 2.5) * 100, 20, 95);
  } else {
    gaps.push("Review text sample thin for sentiment");
  }

  return weighted([
    { score: ratingScore, weight: 0.25 },
    { score: volumeScore, weight: 0.2 },
    { score: responseScore, weight: 0.25 },
    { score: responseTimeScore, weight: 0.15 },
    { score: sentimentScore, weight: 0.15 },
  ]);
}

function scoreGbp(payload: AuditResultPayload, gaps: string[]): number {
  const gp = payload.evidencePack?.googlePlace;
  if (!gp) {
    gaps.push("Google Business Profile not resolved");
    return 38;
  }

  // Profile completeness (20%) — have placeId + rating + reviews
  let completeness = 40;
  if (gp.placeId) completeness += 20;
  if (gp.rating != null) completeness += 20;
  if ((gp.reviewCount ?? 0) > 0) completeness += 20;

  // Photo quantity (20%)
  const photos = gp.photoCount ?? 0;
  const photoScore = photos >= 80 ? 95 : photos >= 40 ? 80 : photos >= 15 ? 65 : photos >= 5 ? 45 : 25;
  if (photos < 15) gaps.push("Few Google listing photos");

  // Categories & attributes (15%) — not in evidence; mild gap
  gaps.push("GBP categories/attributes not fully exposed via Places fields used");
  const categoriesScore = 55;

  // Hours (15%) — not stored; gap
  gaps.push("Opening hours accuracy not verified in this scan");
  const hoursScore = 50;

  // Posts (15%)
  gaps.push("GBP posts frequency not available from Places API");
  const postsScore = 45;

  // Q&A (15%)
  gaps.push("GBP Q&A activity not available from Places API");
  const qaScore = 45;

  return weighted([
    { score: clamp(completeness), weight: 0.2 },
    { score: photoScore, weight: 0.2 },
    { score: categoriesScore, weight: 0.15 },
    { score: hoursScore, weight: 0.15 },
    { score: postsScore, weight: 0.15 },
    { score: qaScore, weight: 0.15 },
  ]);
}

function scoreWebsite(payload: AuditResultPayload, gaps: string[]): number {
  const pack = payload.evidencePack;
  const signals = pack?.urlSignals;
  const eng = pack?.engagementSignals;
  const design = pack?.designQualityAnalysis;
  const food = pack?.foodImageAnalysis?.aggregate;

  if (!signals?.fetched) {
    gaps.push("Website could not be fetched");
    return clamp(payload.scores.design * 0.5 + payload.scores.conversion * 0.5, 25, 55);
  }

  // Hero / first impression (25%)
  let hero = 40;
  if (signals.hasOgImage || (pack?.imageCandidates?.length ?? 0) > 0) hero += 25;
  if (food?.foodPhotographyScore != null) {
    hero = clamp(hero * 0.4 + food.foodPhotographyScore * 0.6);
  } else if (design?.designQualityScore != null) {
    hero = clamp(hero * 0.5 + design.designQualityScore * 0.5);
  }
  if (design?.tier === "amateur") hero = Math.min(hero, 45);

  // Menu accessibility (25%)
  const menuScore = eng?.contentDepth.hasMenuContent
    ? 82
    : signals.h2Count > 2
      ? 55
      : 35;
  if (!eng?.contentDepth.hasMenuContent) gaps.push("Menu not clearly visible on site");

  // Primary CTA (20%)
  const cta = eng?.ctaAudit;
  let ctaScore = 30;
  if (cta?.bookReserve || signals.hasBookOrReserveKeyword || signals.hasOpenTableOrResy) ctaScore += 35;
  if (cta?.orderOnline) ctaScore += 25;
  if (cta?.phone || signals.hasTelLink) ctaScore += 15;
  ctaScore = clamp(ctaScore);
  if (ctaScore < 50) gaps.push("Weak order/reserve CTAs above the fold");

  // Mobile (20%)
  const mobileScore = clamp(payload.scores.mobile);

  // Visual modernity (10%)
  const visual =
    design?.designQualityScore != null
      ? design.designQualityScore
      : clamp(payload.scores.design);

  return weighted([
    { score: clamp(hero), weight: 0.25 },
    { score: menuScore, weight: 0.25 },
    { score: ctaScore, weight: 0.2 },
    { score: mobileScore, weight: 0.2 },
    { score: visual, weight: 0.1 },
  ]);
}

function scoreCompetitors(payload: AuditResultPayload, gaps: string[]): number {
  const comps = payload.competitors.filter((c) => c.source === "places" || c.mockScore > 0);
  if (comps.length === 0) {
    gaps.push("Nearby competitors not resolved");
    return 48;
  }

  const ours = (payload.restaurantScores?.overall ?? payload.scores.overall) || 50;
  const peerAvg =
    comps.reduce((a, c) => a + (c.mockScore || 0), 0) / Math.max(1, comps.length);

  // Local pack ranking proxy (40%) — relative to peer mock scores
  const gap = peerAvg - ours;
  const packScore =
    gap <= -10 ? 90 : gap <= 0 ? 75 : gap <= 10 ? 55 : gap <= 20 ? 40 : 28;

  // Review volume vs peers (25%) — use our review count vs assume peers mid
  const ourReviews = payload.evidencePack?.googlePlace?.reviewCount ?? 0;
  const volumeVsPeers =
    ourReviews >= 150 ? 88 : ourReviews >= 60 ? 72 : ourReviews >= 20 ? 55 : ourReviews > 0 ? 40 : 28;

  // GBP strength vs comps (20%) — photo count proxy
  const photos = payload.evidencePack?.googlePlace?.photoCount ?? 0;
  const gbpVs = photos >= 50 ? 80 : photos >= 20 ? 65 : photos >= 5 ? 48 : 32;

  // Website conversion signals (15%)
  const eng = payload.evidencePack?.engagementSignals?.ctaAudit;
  const convSignals =
    (eng?.bookReserve || eng?.orderOnline ? 70 : 40) + (eng?.phone ? 15 : 0);

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

  // Mobile CWV / speed (40%)
  let speed = 50;
  if (psi?.performanceScore != null) {
    speed = psi.performanceScore;
  } else {
    gaps.push("PageSpeed / Core Web Vitals not available");
    speed = clamp(payload.scores.mobile);
  }
  if (psi?.lcpMs != null && psi.lcpMs > 4000) speed = Math.min(speed, 45);
  if (psi?.cls != null && psi.cls > 0.25) speed = Math.min(speed, 50);

  // SEO hygiene (30%)
  let seo = 40;
  if (signals) {
    if (signals.titleLen >= 10 && signals.titleLen <= 65) seo += 15;
    if (signals.hasMetaDescription) seo += 15;
    if (signals.h1Count === 1) seo += 10;
    if (signals.imgWithAltCount > 0 && signals.imgCount > 0) {
      seo += Math.min(15, Math.round((signals.imgWithAltCount / Math.max(1, signals.imgCount)) * 15));
    }
    if (signals.hasCanonical) seo += 5;
  } else {
    seo = clamp(payload.scores.seo);
  }

  // Security (15%)
  const security = signals?.isHttps ? 90 : 25;
  if (signals && !signals.isHttps) gaps.push("Site is not on HTTPS");

  // Structured data (15%)
  let schema = 35;
  if (signals?.hasJsonLd) schema += 30;
  if (signals?.hasRestaurantSchema) schema += 30;
  if (!signals?.hasRestaurantSchema) gaps.push("Restaurant/LocalBusiness schema missing or weak");

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
  const reviews = scoreReviews(payload, gaps);
  const gbp = scoreGbp(payload, gaps);
  const website = scoreWebsite(payload, gaps);
  // Competitors axis needs a provisional overall — use legacy overall as stand-in
  const provisional: AuditResultPayload = {
    ...payload,
    restaurantScores: undefined,
  };
  const competitors = scoreCompetitors(provisional, gaps);
  const technical = scoreTechnical(payload, gaps);

  const overall = clamp(
    reviews * RESTAURANT_SCORE_WEIGHTS.reviews +
      gbp * RESTAURANT_SCORE_WEIGHTS.gbp +
      website * RESTAURANT_SCORE_WEIGHTS.website +
      competitors * RESTAURANT_SCORE_WEIGHTS.competitors +
      technical * RESTAURANT_SCORE_WEIGHTS.technical,
  );

  // Recompute competitive with restaurant overall for slightly better packing signal
  const withOverall: AuditResultPayload = {
    ...payload,
    restaurantScores: {
      overall,
      grade: gradeFromScore(overall),
      reviews,
      gbp,
      website,
      competitors,
      technical,
      confidence: "medium",
    },
  };
  const competitorsFinal = scoreCompetitors(withOverall, gaps);
  const overallFinal = clamp(
    reviews * RESTAURANT_SCORE_WEIGHTS.reviews +
      gbp * RESTAURANT_SCORE_WEIGHTS.gbp +
      website * RESTAURANT_SCORE_WEIGHTS.website +
      competitorsFinal * RESTAURANT_SCORE_WEIGHTS.competitors +
      technical * RESTAURANT_SCORE_WEIGHTS.technical,
  );

  const uniqueGaps = [...new Set(gaps)].slice(0, 12);
  const hasPlace = Boolean(payload.evidencePack?.googlePlace?.placeId);
  const fetched = Boolean(payload.evidencePack?.urlSignals?.fetched);

  return {
    overall: overallFinal,
    grade: gradeFromScore(overallFinal),
    reviews,
    gbp,
    website,
    competitors: competitorsFinal,
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
    // Keep legacy columns in sync for DB headline when restaurant scores exist
    scores: {
      ...payload.scores,
      overall: restaurantScores.overall,
    },
  };
}
