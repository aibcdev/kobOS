import type { BrandFootprint } from "@/lib/audit/detect-brand-footprint";
import type { AuditOpportunityFix, AuditOpportunityReportV1, AuditResultPayload } from "@/lib/audit/types";
import {
  calculateAuditOpportunityScore,
  type OpportunityRestaurantInput,
  type OpportunityScoreResult,
} from "@/lib/outbound/score-opportunity";

const COMPETITIVE = new Set(
  ["london", "manchester", "birmingham", "leeds", "bristol", "glasgow", "edinburgh", "dublin"].map((c) =>
    c.toLowerCase(),
  ),
);

export function formatRevenueStars(n: number): string {
  const filled = Math.max(1, Math.min(5, Math.round(n)));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

function baseSignalsFromPayload(
  payload: AuditResultPayload,
  meta: { name: string; city: string; websiteUrl?: string | null },
): Omit<OpportunityRestaurantInput, "locations" | "is_independent" | "is_chain"> {
  const gp = payload.evidencePack?.googlePlace;
  const signals = payload.evidencePack?.urlSignals;
  const datedUx =
    Boolean(signals?.fetched) &&
    (!signals?.hasViewport || !signals?.hasMetaDescription || !signals?.hasJsonLd);

  const city = meta.city.trim().toLowerCase();
  const competitive = [...COMPETITIVE].some((c) => city.includes(c));

  const reviewsAxis = payload.restaurantScores?.reviews;
  const replyRate =
    reviewsAxis != null && reviewsAxis < 55 ? 0.2 : reviewsAxis != null && reviewsAxis < 70 ? 0.35 : null;

  const deliveryNote = payload.competitors.some((c) => /deliveroo|uber/i.test(c.note ?? ""));

  return {
    place_id: gp?.placeId ?? null,
    name: meta.name,
    is_hotel: false,
    rating: gp?.rating ?? null,
    review_count: gp?.reviewCount ?? null,
    days_since_last_instagram: null,
    // Prefer conversion-gap flag over inventing a build year
    website_age_years: null,
    has_dated_ux: datedUx || (payload.restaurantScores?.website ?? 100) < 65,
    has_recent_google_posts: null,
    review_response_rate: replyRate,
    is_ghost_kitchen: false,
    has_website: Boolean(meta.websiteUrl?.trim() || signals?.fetched),
    has_google_profile: Boolean(gp?.placeId),
    active_on_deliveroo_or_uber: deliveryNote,
    is_competitive_city: competitive,
    on_major_platform: false,
    avg_ticket: 36,
    currency: "GBP",
  };
}

export function opportunityInputFromAuditPayload(
  payload: AuditResultPayload,
  meta: { name: string; city: string; websiteUrl?: string | null },
  footprint?: Pick<BrandFootprint, "locations" | "isChain" | "isIndependent">,
): OpportunityRestaurantInput {
  const base = baseSignalsFromPayload(payload, meta);
  const locations = footprint?.locations ?? 1;
  const isChain = footprint?.isChain ?? false;
  const isIndependent = footprint?.isIndependent ?? (!isChain && locations <= 5);

  return {
    ...base,
    locations,
    is_chain: isChain,
    is_independent: isIndependent,
    avg_ticket: locations >= 6 ? 38 : 36,
  };
}

function topFixesFromResult(
  result: OpportunityScoreResult,
  payload: AuditResultPayload,
): AuditOpportunityFix[] {
  const fixes: AuditOpportunityFix[] = [];
  const blob = `${result.personalization_hooks.join(" ")} ${result.reasons.join(" ")}`.toLowerCase();

  if (blob.includes("repl") || (payload.restaurantScores?.reviews ?? 100) < 65) {
    fixes.push({
      title: "Reply to every review in the last 90 days",
      detail: "Biggest single trust signal for new guests",
    });
  }
  if (blob.includes("google post") || !payload.evidencePack?.googlePlace) {
    fixes.push({
      title: "Update Google photos + post weekly",
      detail: "Directly impacts local pack ranking",
    });
  }
  if (blob.includes("website") || blob.includes("conversion") || (payload.restaurantScores?.website ?? 100) < 70) {
    fixes.push({
      title: "Fix the top 3 website conversion killers",
      detail: "Mobile CTA, menu clarity, speed",
    });
  }

  for (const issue of payload.issues) {
    if (fixes.length >= 3) break;
    if (fixes.some((f) => f.title === issue.title)) continue;
    fixes.push({ title: issue.title, detail: issue.fixHint });
  }

  const defaults: AuditOpportunityFix[] = [
    {
      title: "Reply to every review in the last 90 days",
      detail: "Biggest single trust signal for new guests",
    },
    {
      title: "Update Google photos + post weekly",
      detail: "Directly impacts local pack ranking",
    },
    {
      title: "Fix the top 3 website conversion killers",
      detail: "Mobile CTA, menu clarity, speed",
    },
  ];
  while (fixes.length < 3) {
    fixes.push(defaults[fixes.length]!);
  }

  return fixes.slice(0, 3);
}

function locationLabelFromFootprint(fp: BrandFootprint): string {
  const locs = fp.locations;
  const size = `${locs} location${locs === 1 ? "" : "s"}`;
  if (fp.isChain || locs >= 6) return `${size} · Multi-site group`;
  if (fp.isIndependent) return `${size} · Independent`;
  return size;
}

function reconcileTripleScores(
  scores: OpportunityScoreResult[],
  footprint: BrandFootprint,
  payload: AuditResultPayload,
): AuditOpportunityReportV1 {
  const withMetrics = scores.filter((s) => s.opportunity_score);
  const pick = withMetrics[0] ?? scores[0]!;
  const metricsList = withMetrics.map((s) => s.opportunity_score!);

  const maxRevenue = Math.max(...metricsList.map((m) => m.est_lost_revenue), 0);
  const maxCustomers = Math.max(...metricsList.map((m) => m.est_monthly_lost_customers), 0);
  const avgMaturity = Math.round(
    metricsList.reduce((a, m) => a + m.marketing_maturity, 0) / Math.max(1, metricsList.length),
  );
  const avgLikelihood = Math.round(
    metricsList.reduce((a, m) => a + m.likelihood_to_buy, 0) / Math.max(1, metricsList.length),
  );
  const maxStars = Math.max(...metricsList.map((m) => m.revenue_potential), 1);

  // Conservative reasons: only keep reasons that appear in ≥2 passes
  const reasonCounts = new Map<string, number>();
  for (const s of scores) {
    for (const r of s.reasons) {
      reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);
    }
  }
  const reasons = [...reasonCounts.entries()]
    .filter(([, n]) => n >= 2 || scores.length < 2)
    .map(([r]) => r)
    .slice(0, 6);

  const reconciled: OpportunityScoreResult = {
    ...pick,
    reasons: reasons.length ? reasons : pick.reasons.slice(0, 4),
    personalization_hooks: pick.personalization_hooks.slice(0, 3),
    opportunity_score: {
      revenue_potential: maxStars,
      marketing_maturity: avgMaturity,
      likelihood_to_buy: avgLikelihood,
      est_monthly_lost_customers: maxCustomers,
      est_lost_revenue: maxRevenue,
      currency: pick.opportunity_score?.currency ?? "GBP",
    },
  };

  return {
    ...reconciled,
    locationLabel: locationLabelFromFootprint(footprint),
    displayCity: footprint.displayCity,
    topFixes: topFixesFromResult(reconciled, payload),
    footprintConfidence: footprint.confidence,
  };
}

/**
 * Sync fallback for client render — prefer persisted report.
 * Does not call Places; uses footprint hints only when provided.
 */
export function computeAuditOpportunityReport(
  payload: AuditResultPayload,
  meta: { name: string; city: string; websiteUrl?: string | null },
  footprint?: BrandFootprint,
): AuditOpportunityReportV1 {
  const fp: BrandFootprint = footprint ?? {
    locations: 1,
    isChain: false,
    isIndependent: true,
    displayCity: meta.city.trim() || null,
    confidence: "low",
    sources: ["sync-fallback"],
  };
  const input = opportunityInputFromAuditPayload(payload, meta, fp);
  const scored = calculateAuditOpportunityScore(input);
  return {
    ...scored,
    locationLabel: locationLabelFromFootprint(fp),
    displayCity: fp.displayCity,
    topFixes: topFixesFromResult(scored, payload),
    footprintConfidence: fp.confidence,
  };
}

/**
 * Production path: three footprint passes + three score passes, then reconcile (upper revenue).
 * Adds Places/website round-trips — acceptable for accuracy (~extra minutes on large brands).
 */
export async function computeAuditOpportunityReportTriple(
  payload: AuditResultPayload,
  meta: { name: string; city: string; websiteUrl?: string | null },
): Promise<AuditOpportunityReportV1> {
  const { detectBrandFootprintPass, reconcileBrandFootprintPasses } = await import(
    "@/lib/audit/detect-brand-footprint"
  );

  const passes = await Promise.all([
    detectBrandFootprintPass(meta, 1),
    detectBrandFootprintPass(meta, 2),
    detectBrandFootprintPass(meta, 3),
  ]);
  const footprint = reconcileBrandFootprintPasses(passes, meta.city);

  const scores = passes.map((fp) => {
    const input = opportunityInputFromAuditPayload(payload, meta, {
      locations: Math.max(fp.locations, footprint.isChain ? footprint.locations : fp.locations),
      isChain: fp.isChain || footprint.isChain,
      isIndependent: footprint.isIndependent && fp.isIndependent,
    });
    return calculateAuditOpportunityScore(input);
  });

  return reconcileTripleScores(scores, footprint, payload);
}

export async function applyOpportunityReportToPayload(
  payload: AuditResultPayload,
  meta: { name: string; city: string; websiteUrl?: string | null },
): Promise<AuditResultPayload> {
  const opportunityReport = await computeAuditOpportunityReportTriple(payload, meta);
  return {
    ...payload,
    opportunityReport,
  };
}
