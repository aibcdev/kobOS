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

/** Graduated brand + social score from links found in HTML and user-provided profiles. */
export function scoreBrandSocialFromEvidence(pack: AuditEvidencePackV1): number {
  const platforms = new Set<string>();
  for (const link of pack.pageEvidence.socialLinksFound ?? []) {
    if (link.platform?.trim()) platforms.add(link.platform.toLowerCase());
  }
  const us = pack.userSocial ?? {};
  if (us.instagram?.trim()) platforms.add("instagram");
  if (us.facebook?.trim()) platforms.add("facebook");
  if (us.tiktok?.trim()) platforms.add("tiktok");
  if (us.googleBusinessUrl?.trim()) platforms.add("google_business");

  const count = platforms.size;
  const hasGbp = Boolean(us.googleBusinessUrl?.trim());

  if (count >= 4) return hasGbp ? 98 : 93;
  if (count === 3) return hasGbp ? 94 : 88;
  if (count === 2) return hasGbp ? 84 : 76;
  if (count === 1) return hasGbp ? 68 : 58;
  return hasGbp ? 52 : 18;
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

function guestMenuScore(payload: AuditResultPayload): number {
  const pack = payload.evidencePack;
  const hasMenu =
    Boolean(pack?.guestSignals?.hasMenuPath) ||
    Boolean(pack?.engagementSignals?.contentDepth.hasMenuContent) ||
    (pack?.stagehandExtraction?.menu?.categories?.length ?? 0) > 0;
  const hasOrder =
    Boolean(pack?.engagementSignals?.ctaAudit.orderOnline) ||
    Boolean(pack?.urlSignals?.hasOrderOrDeliveryKeyword);
  if (hasMenu) return 90;
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

function guestAppetiteScore(payload: AuditResultPayload): number {
  const pack = payload.evidencePack;
  const food = pack?.foodImageAnalysis?.aggregate?.foodPhotographyScore;
  const visual = payload.visualMetrics?.overallHeuristic ?? pack?.designQualityAnalysis?.designQualityScore;
  const imgCount = pack?.urlSignals?.imgCount ?? 0;
  const foodShots = pack?.stagehandExtraction?.visuals?.food_images?.length ?? 0;

  const parts: { score: number; weight: number }[] = [];
  if (food != null) parts.push({ score: food, weight: 0.45 });
  if (visual != null) parts.push({ score: visual, weight: 0.3 });
  const imgScore = imgCount >= 12 ? 88 : imgCount >= 6 ? 72 : imgCount >= 3 ? 55 : imgCount >= 1 ? 40 : 18;
  parts.push({ score: imgScore, weight: 0.2 });
  if (foodShots > 0) parts.push({ score: Math.min(92, 50 + foodShots * 12), weight: 0.15 });
  return redistributeWeighted(parts);
}

/** Call / order / reserve clarity — used by the journey conversion stage. */
export function scoreConversionFromEvidence(payload: AuditResultPayload): number {
  return redistributeWeighted([
    { score: guestCtaScore(payload), weight: 0.7 },
    { score: guestMenuScore(payload), weight: 0.2 },
    { score: clampScore(payload.scores.mobile), weight: 0.1 },
  ]);
}

/** Photos guests see: Google listing first, then site food/visuals. */
export function scoreDesireFromEvidence(payload: AuditResultPayload): number {
  const gp = payload.evidencePack?.googlePlace;
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
    return redistributeWeighted([
      { score: listing, weight: 0.65 },
      { score: guestAppetiteScore(payload), weight: 0.35 },
    ]);
  }
  return guestAppetiteScore(payload);
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
 * Website experience from guest-facing evidence: CTAs, menu, hours/location, food visuals, mobile.
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

  const conversion = scoreConversionFromEvidence(payload);
  const menu = guestMenuScore(payload);
  const localOps = guestLocalOpsScore(payload);
  const appetite = guestAppetiteScore(payload);
  const mobile = clampScore(payload.scores.mobile);

  if (conversion < 55) gaps.push("Order/reserve/call path is weak on the site");
  if (menu < 50) gaps.push("Menu not clearly visible on site");
  if (localOps < 50) gaps.push("Hours or address not obvious on the site");

  const parts: { score: number; weight: number }[] = [
    { score: conversion, weight: 0.22 },
    { score: menu, weight: 0.18 },
    { score: localOps, weight: 0.16 },
    { score: appetite, weight: 0.22 },
    { score: mobile, weight: 0.12 },
  ];

  if (rubricWeb != null) {
    parts.push({
      score: rubricWeb,
      weight: rubricConf === "high" ? 0.18 : rubricConf === "medium" ? 0.12 : 0.08,
    });
  }

  return redistributeWeighted(parts);
}

export function scoreBrandSocialForPayload(payload: AuditResultPayload): number {
  const pack = payload.evidencePack;
  if (!pack) return payload.rubricV2?.brandSocialPresence ?? 18;

  const measured = scoreBrandSocialFromEvidence(pack);
  const rubricBrand = payload.rubricV2?.brandSocialPresence;
  if (rubricBrand == null) return measured;

  const rubricWeight = payload.rubricV2?.confidence === "high" ? 0.45 : 0.3;
  return redistributeWeighted([
    { score: measured, weight: 1 - rubricWeight },
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
