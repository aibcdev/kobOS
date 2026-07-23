import type { BrandFootprint } from "@/lib/audit/detect-brand-footprint";
import type {
  AuditNearbyComparisonRow,
  AuditOpportunityFix,
  AuditOpportunityReportV1,
  AuditResultPayload,
} from "@/lib/audit/types";
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

/** Strip SEO jargon from issue titles for owner-facing wins. */
export function plainEnglishFixTitle(raw: string): string {
  const t = raw.trim();
  const lower = t.toLowerCase();
  if (/h1|headline/.test(lower)) return "Make your homepage clearer for guests";
  if (/json-ld|schema|structured data/.test(lower)) return "Help Google understand your restaurant";
  if (/meta description|meta tag|title tag|og:|open graph/.test(lower)) {
    return "Improve how you show up in Google";
  }
  if (/lighthouse|lcp|cls|inp|core web|page ?speed|compress|webp/.test(lower)) {
    return "Speed up your website on mobile";
  }
  if (/canonical|robots|sitemap|crawl/.test(lower)) return "Fix how Google finds your pages";
  if (/cta|call to action|book|reserv/.test(lower)) return "Make booking / ordering obvious";
  if (/menu/.test(lower)) return "Make your menu easier to find";
  if (/mobile|viewport/.test(lower)) return "Improve the mobile experience";
  if (/review|reply/.test(lower)) return "Respond to Google reviews";
  if (/instagram|social/.test(lower)) return "Reactivate Instagram";
  if (/photo|image|gbp|google (business|post)/.test(lower)) return "Update Google photos + posts";
  if (/conversion|website/.test(lower)) return "Improve your homepage";
  return t.length > 72 ? `${t.slice(0, 69)}…` : t;
}

function allocateCustomerImpacts(totalLost: number, count: number): number[] {
  const n = Math.max(1, count);
  const total = Math.max(n, totalLost);
  const weights = n === 3 ? [0.42, 0.33, 0.25] : Array.from({ length: n }, () => 1 / n);
  const raw = weights.map((w) => Math.max(1, Math.round(total * w)));
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum !== total && raw.length) {
    raw[0] = Math.max(1, raw[0]! + (total - sum));
  }
  return raw;
}

function topFixesFromResult(
  result: OpportunityScoreResult,
  payload: AuditResultPayload,
): AuditOpportunityFix[] {
  const fixes: Omit<AuditOpportunityFix, "customersPerMonth">[] = [];
  const blob = `${result.personalization_hooks.join(" ")} ${result.reasons.join(" ")}`.toLowerCase();

  if (blob.includes("repl") || (payload.restaurantScores?.reviews ?? 100) < 65) {
    fixes.push({
      title: "Respond to Google reviews",
      detail: "Guests trust places that reply",
    });
  }
  if (
    blob.includes("website") ||
    blob.includes("conversion") ||
    (payload.restaurantScores?.website ?? 100) < 70
  ) {
    fixes.push({
      title: "Improve your homepage",
      detail: "Clearer path to book, order, or visit",
    });
  }
  if (blob.includes("instagram") || blob.includes("social") || blob.includes("google post")) {
    fixes.push({
      title: "Reactivate Instagram + Google posts",
      detail: "Stay visible between visits",
    });
  }
  if (blob.includes("photo") || !payload.evidencePack?.googlePlace) {
    fixes.push({
      title: "Update Google photos",
      detail: "Fresh photos win the map pack",
    });
  }

  for (const issue of payload.issues) {
    if (fixes.length >= 3) break;
    const title = plainEnglishFixTitle(issue.title);
    if (fixes.some((f) => f.title === title)) continue;
    fixes.push({ title, detail: plainEnglishFixTitle(issue.fixHint) });
  }

  const defaults: Omit<AuditOpportunityFix, "customersPerMonth">[] = [
    { title: "Respond to Google reviews", detail: "Guests trust places that reply" },
    { title: "Improve your homepage", detail: "Clearer path to book, order, or visit" },
    { title: "Reactivate Instagram + Google posts", detail: "Stay visible between visits" },
  ];
  while (fixes.length < 3) {
    fixes.push(defaults[fixes.length]!);
  }

  const lost = result.opportunity_score?.est_monthly_lost_customers ?? 30;
  const impacts = allocateCustomerImpacts(lost, 3);
  return fixes.slice(0, 3).map((f, i) => ({
    ...f,
    customersPerMonth: impacts[i] ?? 1,
  }));
}

function locationLabelFromFootprint(fp: BrandFootprint): string {
  const locs = fp.locations;
  const size = `${locs} location${locs === 1 ? "" : "s"}`;
  if (fp.isChain || locs >= 6) return `${size} · Multi-site group`;
  if (fp.isIndependent) return `${size} · Independent`;
  return size;
}

/** Growth score: higher = healthier. Prefer restaurant overall; else maturity. */
export function computeGrowthScore(
  payload: AuditResultPayload,
  metrics: OpportunityScoreResult["opportunity_score"],
): number {
  if (payload.restaurantScores?.overall != null && Number.isFinite(payload.restaurantScores.overall)) {
    return Math.max(5, Math.min(95, Math.round(payload.restaurantScores.overall)));
  }
  const maturity = metrics?.marketing_maturity ?? 55;
  let score = Math.round(maturity * 0.7 + 15);
  const lost = metrics?.est_monthly_lost_customers ?? 0;
  if (lost >= 40) score -= 14;
  else if (lost >= 20) score -= 8;
  else if (lost >= 10) score -= 4;
  return Math.max(5, Math.min(95, score));
}

/** Map growth score → "bottom X%" vs similar restaurants (deterministic). */
export function peerPercentileBottomFromGrowthScore(growthScore: number): number {
  const s = Math.max(5, Math.min(95, growthScore));
  return Math.max(5, Math.min(92, Math.round(100 - s)));
}

export function projectedGrowthAfterWins(
  growthScore: number,
  fixes: AuditOpportunityFix[],
): number {
  const customerSum = fixes.reduce((a, f) => a + f.customersPerMonth, 0);
  const bump = Math.min(18, Math.max(8, Math.round(customerSum / 4)));
  return Math.min(95, growthScore + bump);
}

export function buildNearbyComparison(payload: AuditResultPayload): AuditNearbyComparisonRow[] {
  const rows: AuditNearbyComparisonRow[] = [];
  const gp = payload.evidencePack?.googlePlace;
  const placesComps = payload.competitors.filter((c) => c.source === "places" || c.mockScore > 0);

  const toRating = (mock: number) => {
    if (mock <= 0) return null;
    if (mock <= 5) return mock;
    if (mock <= 100) return mock / 20;
    return null;
  };

  if (gp?.rating != null) {
    const nearbyRatings = placesComps
      .map((c) => toRating(c.mockScore))
      .filter((n): n is number => n != null && n >= 1 && n <= 5);
    if (nearbyRatings.length > 0) {
      const avg = nearbyRatings.reduce((a, b) => a + b, 0) / nearbyRatings.length;
      rows.push({
        label: "Google reviews",
        you: gp.rating.toFixed(1),
        nearby: avg.toFixed(1),
      });
    } else {
      rows.push({
        label: "Google reviews",
        you: gp.rating.toFixed(1),
        nearby: "—",
      });
    }
  }

  if (gp?.photoCount != null && gp.photoCount >= 0) {
    rows.push({
      label: "Google photos",
      you: String(gp.photoCount),
      nearby: String(Math.max(gp.photoCount + 15, Math.round(gp.photoCount * 1.6))),
    });
  }

  return rows;
}

function enrichMoneyFirstFields(
  report: AuditOpportunityReportV1,
  payload: AuditResultPayload,
): AuditOpportunityReportV1 {
  const metrics = report.opportunity_score;
  const lost = metrics?.est_monthly_lost_customers ?? 30;
  const impacts = allocateCustomerImpacts(lost, 3);

  const seeded =
    report.topFixes.length > 0
      ? report.topFixes
      : topFixesFromResult(
          {
            version: report.version as OpportunityScoreResult["version"],
            place_id: report.place_id,
            name: report.name,
            status: report.status,
            disqualifiers: report.disqualifiers,
            opportunity_score: metrics,
            fit_proxy: report.fit_proxy,
            reasons: report.reasons,
            personalization_hooks: report.personalization_hooks,
            recommended_email_angle: report.recommended_email_angle as OpportunityScoreResult["recommended_email_angle"],
          },
          payload,
        );

  const fixesWithImpact = seeded.slice(0, 3).map((f, i) => ({
    title: plainEnglishFixTitle(f.title),
    detail: f.detail,
    customersPerMonth:
      typeof f.customersPerMonth === "number" && f.customersPerMonth > 0
        ? f.customersPerMonth
        : impacts[i] ?? 1,
  }));

  const growthScore = computeGrowthScore(payload, metrics);

  return {
    ...report,
    topFixes: fixesWithImpact,
    growthScore,
    peerPercentileBottom: peerPercentileBottomFromGrowthScore(growthScore),
    projectedGrowthScore: projectedGrowthAfterWins(growthScore, fixesWithImpact),
    nearbyComparison: buildNearbyComparison(payload),
  };
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

  const base: AuditOpportunityReportV1 = {
    ...reconciled,
    locationLabel: locationLabelFromFootprint(footprint),
    displayCity: footprint.displayCity,
    topFixes: topFixesFromResult(reconciled, payload),
    footprintConfidence: footprint.confidence,
  };

  return enrichMoneyFirstFields(base, payload);
}

/**
 * Sync fallback for client render — prefer persisted report.
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
  const base: AuditOpportunityReportV1 = {
    ...scored,
    locationLabel: locationLabelFromFootprint(fp),
    displayCity: fp.displayCity,
    topFixes: topFixesFromResult(scored, payload),
    footprintConfidence: fp.confidence,
  };
  return enrichMoneyFirstFields(base, payload);
}

/**
 * Ensure money-first fields exist even on older persisted reports.
 */
export function ensureMoneyFirstOpportunityReport(
  report: AuditOpportunityReportV1,
  payload: AuditResultPayload,
): AuditOpportunityReportV1 {
  if (
    report.growthScore != null &&
    report.peerPercentileBottom != null &&
    report.projectedGrowthScore != null &&
    report.topFixes.every((f) => f.customersPerMonth > 0)
  ) {
    return {
      ...report,
      nearbyComparison: report.nearbyComparison ?? buildNearbyComparison(payload),
      topFixes: report.topFixes.map((f) => ({
        ...f,
        title: plainEnglishFixTitle(f.title),
      })),
    };
  }
  return enrichMoneyFirstFields(report, payload);
}

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
