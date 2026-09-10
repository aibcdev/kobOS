import { analyzeWebsiteFull } from "@/lib/audit/analyze-url";
import { buildEvidencePackV1, type AuditEvidencePackV1 } from "@/lib/audit/evidence-pack";
import { extractOnPageGuestSignals } from "@/lib/audit/on-page-guest-signals";
import { computeRestaurantScores } from "@/lib/audit/restaurant-scoring";
import { applyRubricV2ToPayload, computeRubricV2 } from "@/lib/audit/rubric-v2";
import type { AuditResultPayload, RestaurantGrade } from "@/lib/audit/types";

export type LightweightScanInput = {
  name: string;
  city: string;
  websiteUrl?: string | null;
  /** Google listing facts we already hold from a nearby search. */
  placeId?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  photoCount?: number | null;
};

export type LightweightScanResult = {
  kobScore: number;
  grade: RestaurantGrade;
  /** True when the website could not be read, so the score leans on the listing. */
  websiteUnread: boolean;
};

/**
 * Cheap KOB score: website crawl + Google listing facts only.
 *
 * Deliberately skips Gemini and PageSpeed so we can score hundreds of restaurants per
 * city for the peer comparison. It reuses the same scorers as a real audit, so a
 * pre-scanned peer and a paying prospect are measured on one scale — with the caveat
 * that a full audit has more evidence and so tends to land slightly higher.
 */
export async function scoreRestaurantLightweight(
  input: LightweightScanInput,
): Promise<LightweightScanResult> {
  const website = input.websiteUrl?.trim() || null;
  const analysis = await analyzeWebsiteFull(website ?? undefined);

  const pack: AuditEvidencePackV1 = buildEvidencePackV1({
    restaurantName: input.name,
    city: input.city,
    websiteUrl: website,
    signals: analysis.signals,
    pageEvidence: analysis.pageEvidence,
    guestSignals: analysis.guestSignals ?? null,
  });

  if (input.placeId?.trim()) {
    pack.googlePlace = {
      placeId: input.placeId.trim(),
      rating: input.rating ?? null,
      reviewCount: input.reviewCount ?? null,
      photoCount: input.photoCount ?? 0,
      reviews: [],
    };
  }

  const payload = applyRubricV2ToPayload(
    {
      id: `lightweight:${input.placeId ?? input.name}`,
      restaurantName: input.name,
      city: input.city,
      websiteUrl: website,
      competitors: [],
      opportunities: [],
      scores: { overall: 0, seo: 0, design: 0, mobile: 0, conversion: 0 },
      evidencePack: pack,
      scanStatus: "ready",
    } as unknown as AuditResultPayload,
    computeRubricV2({ evidencePack: pack }),
  );

  const scores = computeRestaurantScores(payload);
  return {
    kobScore: scores.overall,
    grade: scores.grade,
    websiteUnread: !website || analysis.signals.fetchError === true,
  };
}

/** Re-export so the prescan script does not need to know the guest-signal helper. */
export { extractOnPageGuestSignals };
