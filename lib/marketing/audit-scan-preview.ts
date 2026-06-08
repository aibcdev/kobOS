import type { AuditGooglePlaceEvidence } from "@/lib/audit/evidence-pack";
import type { ImageCandidateUrl } from "@/lib/audit/analyze-url";
import type { AuditResultPayload, PerceptionAuditV1 } from "@/lib/audit/types";
import { buildOwnerHeroFallback } from "@/lib/audit/build-owner-hero";

export type ScanPreviewReview = {
  text: string;
  rating: number;
  authorInitial: string;
};

export type ScanPreviewGooglePlace = {
  rating: number | null;
  reviewCount: number | null;
  reviews: ScanPreviewReview[];
};

export type ScanPreviewSignals = {
  hasGeo: boolean;
  hasScreenshot: boolean;
  hasHeroImage: boolean;
  hasReviews: boolean;
};

export type AuditScanPreview = {
  screenshotUrl: string | null;
  heroImageUrl: string | null;
  previewImageUrl: string | null;
  googlePlace: ScanPreviewGooglePlace | null;
  scanSignals: ScanPreviewSignals;
};

export type AuditPerceptionTeaser = {
  perceptionAuditV1Status: AuditResultPayload["perceptionAuditV1Status"];
  digitalPositioningScore: number | null;
  coverHeadline: string | null;
  ownerHero: {
    revenueHeadline: string;
    bookingLeakPercentLow: number;
    bookingLeakPercentHigh: number;
  } | null;
  revenueLeakCount: number;
  screenshotUrl: string | null;
};

function authorInitial(text: string, index: number): string {
  const m = text.match(/[A-Za-z]/);
  return m ? m[0].toUpperCase() : String.fromCharCode(65 + (index % 26));
}

function normalizeGooglePlace(gp: AuditGooglePlaceEvidence): ScanPreviewGooglePlace {
  return {
    rating: gp.rating,
    reviewCount: gp.reviewCount,
    reviews: gp.reviews.slice(0, 6).map((r, i) => ({
      text: r.text.slice(0, 280),
      rating: r.rating,
      authorInitial: authorInitial(r.text, i),
    })),
  };
}

export function pickScanPreviewImageUrl(
  screenshotUrl: string | null | undefined,
  heroImageUrl: string | null | undefined,
  fallbackUrl?: string | null,
): string | null {
  const shot = screenshotUrl?.trim();
  if (shot) return shot;
  const hero = heroImageUrl?.trim();
  if (hero) return hero;
  const fb = fallbackUrl?.trim();
  return fb || null;
}

export function pickHeroImageUrl(payload: AuditResultPayload): string | null {
  const cands = payload.evidencePack?.imageCandidates ?? [];
  const og = cands.find((c: ImageCandidateUrl) => c.ref === "og_image");
  if (og?.url) return og.url;
  return cands[0]?.url ?? null;
}

export function buildScanPreviewFromPayload(payload: AuditResultPayload): AuditScanPreview {
  const screenshotUrl = payload.browserbaseScan?.screenshotPublicUrl?.trim() || null;
  const heroImageUrl = pickHeroImageUrl(payload);
  const previewImageUrl = pickScanPreviewImageUrl(screenshotUrl, heroImageUrl);
  const gp = payload.evidencePack?.googlePlace;
  const googlePlace = gp ? normalizeGooglePlace(gp) : null;

  const scanSignals: ScanPreviewSignals = {
    hasGeo: Boolean(payload.geoLocation?.lat != null && payload.geoLocation?.lng != null),
    hasScreenshot: Boolean(screenshotUrl),
    hasHeroImage: Boolean(heroImageUrl),
    hasReviews: Boolean(googlePlace && googlePlace.reviews.length > 0),
  };

  return {
    screenshotUrl,
    heroImageUrl,
    previewImageUrl,
    googlePlace,
    scanSignals,
  };
}

/** Minimal perception object for locked preview when full report is gated. */
export function buildTeaserPerception(
  teaser: AuditPerceptionTeaser,
  payload: AuditResultPayload,
): PerceptionAuditV1 | null {
  const existing = payload.perceptionAuditV1;
  if (existing) return existing;
  if (teaser.perceptionAuditV1Status !== "ready" && teaser.digitalPositioningScore == null) {
    return null;
  }

  const dps = teaser.digitalPositioningScore ?? payload.scores.overall;
  const ownerHero = teaser.ownerHero
    ? {
        revenueHeadline: teaser.ownerHero.revenueHeadline,
        bookingLeakPercentLow: teaser.ownerHero.bookingLeakPercentLow,
        bookingLeakPercentHigh: teaser.ownerHero.bookingLeakPercentHigh,
        revenueDetail: "",
        customerLossBullets: [] as string[],
        timelineHeadline: "",
        timelinePhases: [] as { window: string; outcome: string }[],
        comparedToLabel: "",
      }
    : undefined;

  return {
    version: 1,
    model: "teaser",
    scoredAt: new Date().toISOString(),
    digitalPositioningScore: dps,
    confidence: "medium",
    coverHeadline: teaser.coverHeadline ?? undefined,
    ownerHero,
    positioningTable: [],
    perceptionGap: [],
    customerExperience: "",
    modernStandard: "",
    reviewIntelligence: { praiseThemes: [], complaintThemes: [], disconnect: "" },
    socialAnalysis: "",
    commercialSeo: "",
    revenueLeaks: Array.from({ length: teaser.revenueLeakCount }, (_, i) => ({
      title: `leak-${i + 1}`,
      impact: "medium" as const,
      narrative: "",
    })),
    benchmarkAnchors: [],
    overallSummary: "",
  };
}

export function buildPerceptionTeaserFromPayload(
  payload: AuditResultPayload,
  overallScore: number,
): AuditPerceptionTeaser {
  const perception = payload.perceptionAuditV1;
  const status = payload.perceptionAuditV1Status ?? "pending";
  const ownerHero =
    perception?.ownerHero ?? (perception ? buildOwnerHeroFallback(payload, perception) : null);

  return {
    perceptionAuditV1Status: status,
    digitalPositioningScore: perception?.digitalPositioningScore ?? (status === "ready" ? overallScore : null),
    coverHeadline: perception?.coverHeadline ?? null,
    ownerHero: ownerHero
      ? {
          revenueHeadline: ownerHero.revenueHeadline,
          bookingLeakPercentLow: ownerHero.bookingLeakPercentLow,
          bookingLeakPercentHigh: ownerHero.bookingLeakPercentHigh,
        }
      : null,
    revenueLeakCount: perception?.revenueLeaks?.length ?? 0,
    screenshotUrl: payload.browserbaseScan?.screenshotPublicUrl?.trim() || null,
  };
}
