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

function scoreWebsiteFromUrlSignals(
  payload: AuditResultPayload,
  gaps: string[],
): number {
  const signals = payload.evidencePack!.urlSignals!;
  const hasOrderPath =
    signals.hasBookOrReserveKeyword || signals.hasOpenTableOrResy || signals.hasOrderOrDeliveryKeyword;

  let ctaScore = 28;
  if (hasOrderPath) ctaScore += 42;
  if (signals.hasTelLink) ctaScore += 18;
  if (signals.hasOpenTableOrResy) ctaScore += 12;
  ctaScore = clampScore(ctaScore);

  let contentScore = 38;
  if (signals.h2Count >= 3) contentScore += 18;
  if (signals.imgCount >= 8) contentScore += 22;
  else if (signals.imgCount >= 3) contentScore += 14;
  if (signals.hasOgImage) contentScore += 12;
  if (hasOrderPath) contentScore += 14;
  if (signals.hasRestaurantSchema || signals.hasJsonLd) contentScore += 8;
  contentScore = clampScore(contentScore);

  const mobileScore = clampScore(payload.scores.mobile);
  const visual =
    payload.evidencePack?.designQualityAnalysis?.designQualityScore != null
      ? payload.evidencePack.designQualityAnalysis.designQualityScore
      : clampScore(payload.scores.design);

  if (!hasOrderPath) gaps.push("Order/reserve path not obvious in page HTML");

  return redistributeWeighted([
    { score: contentScore, weight: 0.32 },
    { score: ctaScore, weight: 0.33 },
    { score: mobileScore, weight: 0.2 },
    { score: visual, weight: 0.15 },
  ]);
}

function scoreWebsiteFromEngagement(payload: AuditResultPayload, gaps: string[]): number {
  const pack = payload.evidencePack!;
  const eng = pack.engagementSignals!;
  const cta = eng.ctaAudit;

  let ctaScore = 32;
  if (cta.orderOnline) ctaScore += 38;
  if (cta.bookReserve) ctaScore += 24;
  if (cta.phone) ctaScore += 14;
  if (cta.socialLinkCount >= 2) ctaScore += 8;
  ctaScore = clampScore(ctaScore);

  let contentScore = 42;
  if (eng.contentDepth.hasMenuContent) contentScore += 32;
  else if (cta.orderOnline) contentScore += 24;
  if (eng.contentDepth.hasStoryOrAbout) contentScore += 10;
  if (eng.contentDepth.visibleTextWords >= 300) contentScore += 10;
  contentScore = clampScore(contentScore);

  const designBase =
    pack.designQualityAnalysis?.designQualityScore ?? payload.scores.design;
  let heroScore = clampScore(eng.dwellScore * 0.35 + designBase * 0.65);
  if (pack.designQualityAnalysis?.tier === "amateur") heroScore = Math.min(heroScore, 48);

  if (!eng.contentDepth.hasMenuContent && !cta.orderOnline) {
    gaps.push("Menu not clearly visible on site");
  }

  return redistributeWeighted([
    { score: heroScore, weight: 0.22 },
    { score: contentScore, weight: 0.33 },
    { score: ctaScore, weight: 0.35 },
    { score: clampScore(payload.scores.mobile), weight: 0.1 },
  ]);
}

/**
 * Website experience from layered evidence: rubric checks, engagement CTAs, URL signals, design.
 * Strong corporate / QSR sites score high when HTML shows order paths, media, and mobile readiness.
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

  const parts: { score: number; weight: number }[] = [];

  if (rubricWeb != null) {
    parts.push({
      score: rubricWeb,
      weight: rubricConf === "high" ? 0.42 : rubricConf === "medium" ? 0.3 : 0.22,
    });
  }

  if (pack?.engagementSignals) {
    parts.push({ score: scoreWebsiteFromEngagement(payload, gaps), weight: 0.4 });
  } else {
    parts.push({ score: scoreWebsiteFromUrlSignals(payload, gaps), weight: 0.38 });
  }

  const food = pack?.foodImageAnalysis?.aggregate;
  if (food?.foodPhotographyScore != null) {
    parts.push({ score: food.foodPhotographyScore, weight: 0.12 });
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
