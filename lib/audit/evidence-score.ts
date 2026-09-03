import type { AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import type { AuditResultPayload } from "@/lib/audit/types";

export function clampScore(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Weighted mean; drops invalid parts instead of inventing placeholders. */
export function redistributeWeighted(parts: { score: number; weight: number }[]): number {
  const usable = parts.filter((p) => p.weight > 0 && Number.isFinite(p.score));
  const sumW = usable.reduce((a, p) => a + p.weight, 0) || 1;
  const raw = usable.reduce((a, p) => a + p.score * p.weight, 0) / sumW;
  return clampScore(raw);
}

function socialPlatforms(pack: AuditEvidencePackV1): Set<string> {
  const platforms = new Set<string>();
  for (const link of pack.pageEvidence.socialLinksFound ?? []) {
    if (link.platform?.trim()) platforms.add(link.platform.toLowerCase());
  }
  const us = pack.userSocial ?? {};
  if (us.instagram?.trim()) platforms.add("instagram");
  if (us.facebook?.trim()) platforms.add("facebook");
  if (us.tiktok?.trim()) platforms.add("tiktok");
  if (us.googleBusinessUrl?.trim()) platforms.add("google_business");
  return platforms;
}

/**
 * Brand + social from on-page / user links.
 * Elias: consistent branding that reflects the restaurant — multi-platform + IG/TikTok bonus.
 */
export function scoreBrandSocialFromEvidence(pack: AuditEvidencePackV1): number {
  const platforms = socialPlatforms(pack);
  const count = platforms.size;
  const hasGbp = platforms.has("google_business");
  const hasIg = platforms.has("instagram");
  const hasTiktok = platforms.has("tiktok");
  const visualBoost = hasIg && hasTiktok ? 6 : hasIg || hasTiktok ? 3 : 0;

  let base: number;
  if (count >= 4) base = hasGbp ? 98 : 93;
  else if (count === 3) base = hasGbp ? 94 : 88;
  else if (count === 2) base = hasGbp ? 84 : 76;
  else if (count === 1) base = hasGbp ? 68 : 58;
  else base = hasGbp ? 52 : 18;

  return clampScore(base + visualBoost, 0, 100);
}

function guestCtaScore(payload: AuditResultPayload): number {
  const pack = payload.evidencePack;
  const signals = pack?.urlSignals;
  const cta = pack?.engagementSignals?.ctaAudit;
  const stagehand = pack?.stagehandExtraction ?? payload.stagehandExtraction;
  const heroCtas = stagehand?.hero?.cta_buttons?.length ?? 0;
  const convEls = stagehand?.conversion_elements?.length ?? 0;

  let score = 22;
  if (cta?.orderOnline || signals?.hasOrderOrDeliveryKeyword) score += 28;
  if (cta?.bookReserve || signals?.hasBookOrReserveKeyword || signals?.hasOpenTableOrResy) score += 22;
  if (cta?.phone || signals?.hasTelLink) score += 14;
  if (heroCtas >= 1) score += 10;
  if (convEls >= 2) score += 8;
  return clampScore(score);
}

/** Clear menu — prefer structured categories over a lone keyword hit. */
function guestMenuScore(payload: AuditResultPayload): number {
  const pack = payload.evidencePack;
  const categories = pack?.stagehandExtraction?.menu?.categories?.length ?? 0;
  const hasMenuPath =
    Boolean(pack?.guestSignals?.hasMenuPath) ||
    Boolean(pack?.engagementSignals?.contentDepth.hasMenuContent);
  const hasOrder =
    Boolean(pack?.engagementSignals?.ctaAudit.orderOnline) ||
    Boolean(pack?.urlSignals?.hasOrderOrDeliveryKeyword);

  if (categories >= 4) return 96;
  if (categories >= 2) return 92;
  if (categories >= 1) return 88;
  if (hasMenuPath) return 86;
  if (hasOrder) return 78;
  return 32;
}

function guestLocalOpsScore(payload: AuditResultPayload): number {
  const g = payload.evidencePack?.guestSignals;
  const s = payload.evidencePack?.urlSignals;
  let score = 18;
  if (g?.hasOpeningHours) score += 28;
  if (g?.hasAddressOrDirections) score += 24;
  if (s?.hasTelLink) score += 16;
  if ((g?.mapsPlaceIds.length ?? 0) > 0) score += 14;
  return clampScore(score);
}

/** Immersive visuals — design quality + screenshot heuristic + food imagery. */
function guestAppetiteScore(payload: AuditResultPayload): number {
  const pack = payload.evidencePack;
  const design = pack?.designQualityAnalysis;
  const food = pack?.foodImageAnalysis?.aggregate?.foodPhotographyScore;
  const visualHeuristic = payload.visualMetrics?.overallHeuristic;
  const imgCount = pack?.urlSignals?.imgCount ?? 0;
  const foodShots = pack?.stagehandExtraction?.visuals?.food_images?.length ?? 0;

  const parts: { score: number; weight: number }[] = [];
  if (design?.designQualityScore != null) {
    let d = design.designQualityScore;
    if (design.tier === "premium") d = Math.max(d, 88);
    if (design.tier === "amateur") d = Math.min(d, 48);
    parts.push({ score: d, weight: 0.4 });
  }
  if (visualHeuristic != null) parts.push({ score: visualHeuristic, weight: 0.25 });
  if (food != null) parts.push({ score: food, weight: 0.25 });
  const imgScore = imgCount >= 12 ? 88 : imgCount >= 6 ? 72 : imgCount >= 3 ? 55 : imgCount >= 1 ? 40 : 18;
  parts.push({ score: imgScore, weight: 0.15 });
  if (foodShots > 0) parts.push({ score: Math.min(94, 55 + foodShots * 10), weight: 0.15 });
  return redistributeWeighted(parts);
}

/**
 * Identity clear from the first second — Elias criterion.
 * Uses Gemini design tier, hero headline/CTAs, OG/title presence.
 */
export function scoreIdentityFromEvidence(payload: AuditResultPayload): number {
  const pack = payload.evidencePack;
  const design = pack?.designQualityAnalysis;
  const stagehand = pack?.stagehandExtraction ?? payload.stagehandExtraction;
  const signals = pack?.urlSignals;

  let score = 28;
  if (design?.designQualityScore != null) {
    score = design.designQualityScore * 0.55 + score * 0.45;
    if (design.tier === "premium") score = Math.max(score, 90);
    else if (design.tier === "competent") score = Math.max(score, 72);
    else if (design.tier === "dated") score = Math.min(score, 58);
    else if (design.tier === "amateur") score = Math.min(score, 42);
  }
  if (stagehand?.hero?.headline?.trim()) score += 8;
  if ((stagehand?.hero?.cta_buttons?.length ?? 0) > 0) score += 6;
  if (signals?.hasOgTitle && signals?.hasOgImage) score += 8;
  if (signals?.titleLen >= 12 && signals.titleLen <= 70) score += 6;
  if (signals?.h1Count === 1) score += 4;
  return clampScore(score);
}

/** Call / order / reserve clarity — used by the journey conversion stage. */
export function scoreConversionFromEvidence(payload: AuditResultPayload): number {
  return redistributeWeighted([
    { score: guestCtaScore(payload), weight: 0.7 },
    { score: guestMenuScore(payload), weight: 0.2 },
    { score: clampScore(payload.scores.mobile), weight: 0.1 },
  ]);
}

/** Photos guests see: blend listing photos with site food/visuals (premium site can carry). */
export function scoreDesireFromEvidence(payload: AuditResultPayload): number {
  const gp = payload.evidencePack?.googlePlace;
  const appetite = guestAppetiteScore(payload);
  if (gp?.placeId && gp.photoCount != null && Number.isFinite(gp.photoCount)) {
    const listing =
      gp.photoCount >= 50
        ? 82
        : gp.photoCount >= 30
          ? 68
          : gp.photoCount >= 15
            ? 55
            : gp.photoCount >= 8
              ? 48
              : 38;
    // Premium site visuals can outweigh a thin listing photo set.
    const listingWeight = appetite >= 85 ? 0.4 : 0.65;
    return redistributeWeighted([
      { score: listing, weight: listingWeight },
      { score: appetite, weight: 1 - listingWeight },
    ]);
  }
  return appetite;
}

/** On-page rating widgets / JSON-LD when Places reviews are missing. */
export function scoreReviewsFromOnPage(payload: AuditResultPayload): number | null {
  const g = payload.evidencePack?.guestSignals;
  if (!g) return null;
  const rating = g.aggregateRating;
  const volume = g.aggregateReviewCount ?? 0;
  if (rating == null && !g.reviewWidgetDetected) return null;

  const ratingScore =
    rating == null ? (g.reviewWidgetDetected ? 50 : null) : clampScore(((rating - 3) / 2) * 100, 15, 100);
  if (ratingScore == null) return null;
  const volumeScore =
    volume >= 200 ? 92 : volume >= 80 ? 80 : volume >= 20 ? 65 : volume > 0 ? 48 : g.reviewWidgetDetected ? 42 : 30;
  return redistributeWeighted([
    { score: ratingScore, weight: 0.65 },
    { score: volumeScore, weight: 0.35 },
  ]);
}

/** NAP + hours + maps embed as listing completeness when GBP isn’t linked. */
export function scoreLocalPresenceFromOnPage(payload: AuditResultPayload): number | null {
  const s = payload.evidencePack?.urlSignals;
  if (!s?.fetched) return null;
  const g = payload.evidencePack?.guestSignals;
  let score = 16;
  if (s.hasRestaurantSchema || s.hasJsonLd) score += 18;
  if (s.hasTelLink) score += 12;
  if (g?.hasOpeningHours) score += 18;
  if (g?.hasAddressOrDirections) score += 16;
  if ((g?.mapsPlaceIds.length ?? 0) > 0) score += 20;
  return clampScore(score);
}

/**
 * Website experience (Elias axes): identity, immersive visuals, menu, booking, mobile.
 * Rubric SEO filler is secondary so design-led sites can land mid-90s.
 */
export function scoreWebsiteFromEvidence(payload: AuditResultPayload, gaps: string[]): number {
  const pack = payload.evidencePack;
  const signals = pack?.urlSignals;
  const rubricWeb = payload.rubricV2?.websiteExperience;
  const rubricConf = payload.rubricV2?.confidence;

  if (!signals?.fetched) {
    gaps.push("Website could not be fetched");
    if (rubricWeb != null) return clampScore(rubricWeb);
    return clampScore(payload.scores.design ?? payload.scores.conversion ?? 45, 30, 90);
  }

  const identity = scoreIdentityFromEvidence(payload);
  const conversion = scoreConversionFromEvidence(payload);
  const menu = guestMenuScore(payload);
  const localOps = guestLocalOpsScore(payload);
  const appetite = guestAppetiteScore(payload);
  let mobile = clampScore(payload.scores.mobile);
  // Soften PSI drag when identity + visuals are clearly premium (image-heavy elite sites).
  if (identity >= 88 && appetite >= 85 && mobile < 70) {
    mobile = Math.max(mobile, 78);
  }

  if (conversion < 55) gaps.push("Order/reserve/call path is weak on the site");
  if (menu < 50) gaps.push("Menu not clearly visible on site");
  if (localOps < 50) gaps.push("Hours or address not obvious on the site");
  if (identity < 55) gaps.push("Brand identity is unclear on first screen");

  const parts: { score: number; weight: number }[] = [
    { score: identity, weight: 0.22 },
    { score: appetite, weight: 0.2 },
    { score: conversion, weight: 0.2 },
    { score: menu, weight: 0.16 },
    { score: mobile, weight: 0.12 },
    { score: localOps, weight: 0.1 },
  ];

  if (rubricWeb != null) {
    parts.push({
      score: rubricWeb,
      weight: rubricConf === "high" ? 0.1 : rubricConf === "medium" ? 0.07 : 0.05,
    });
  }

  return redistributeWeighted(parts);
}

export function scoreBrandSocialForPayload(payload: AuditResultPayload): number {
  const pack = payload.evidencePack;
  if (!pack) return payload.rubricV2?.brandSocialPresence ?? 18;

  const measured = scoreBrandSocialFromEvidence(pack);
  const identity = scoreIdentityFromEvidence(payload);
  // Consistent branding: lift social when site identity is strong and IG/TikTok exist.
  const platforms = socialPlatforms(pack);
  const hasVisualSocial = platforms.has("instagram") || platforms.has("tiktok");
  const blended =
    hasVisualSocial && identity >= 85
      ? clampScore(measured * 0.85 + identity * 0.15)
      : measured;

  const rubricBrand = payload.rubricV2?.brandSocialPresence;
  if (rubricBrand == null) return blended;

  const rubricWeight = payload.rubricV2?.confidence === "high" ? 0.35 : 0.25;
  return redistributeWeighted([
    { score: blended, weight: 1 - rubricWeight },
    { score: rubricBrand, weight: rubricWeight },
  ]);
}

export type EvidenceAxis = {
  key: string;
  score: number;
  weight: number;
};

/** Re-normalize axis weights when Places / competitor data is missing. */
export function evidenceOverallFromAxes(axes: EvidenceAxis[]): number {
  return redistributeWeighted(axes.map((a) => ({ score: a.score, weight: a.weight })));
}

/** True when website + brand look Elias-elite (design-led conversion sites). */
export function isEliteWebsiteBrandEvidence(website: number, brandSocial: number): boolean {
  return website >= 88 && brandSocial >= 85;
}
