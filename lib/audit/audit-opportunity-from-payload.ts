import type { AuditOpportunityFix, AuditOpportunityReportV1, AuditResultPayload } from "@/lib/audit/types";
import {
  calculateOpportunityScore,
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

/** Map free-audit payload → Opportunity Score input. */
export function opportunityInputFromAuditPayload(
  payload: AuditResultPayload,
  meta: { name: string; city: string; websiteUrl?: string | null },
): OpportunityRestaurantInput {
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
    locations: 1,
    is_independent: true,
    is_chain: false,
    is_hotel: false,
    rating: gp?.rating ?? null,
    review_count: gp?.reviewCount ?? null,
    days_since_last_instagram: null,
    website_age_years: datedUx ? 7 : null,
    has_dated_ux: datedUx,
    has_recent_google_posts: null,
    review_response_rate: replyRate,
    is_ghost_kitchen: false,
    has_website: Boolean(meta.websiteUrl?.trim() || signals?.fetched),
    has_google_profile: Boolean(gp?.placeId),
    active_on_deliveroo_or_uber: deliveryNote,
    is_competitive_city: competitive,
    on_major_platform: false,
    avg_ticket: 32,
    currency: "GBP",
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
  if (blob.includes("website") || (payload.restaurantScores?.website ?? 100) < 70) {
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

export function computeAuditOpportunityReport(
  payload: AuditResultPayload,
  meta: { name: string; city: string; websiteUrl?: string | null },
): AuditOpportunityReportV1 {
  const input = opportunityInputFromAuditPayload(payload, meta);
  const scored = calculateOpportunityScore(input);
  const locs = input.locations ?? 1;

  return {
    ...scored,
    locationLabel: `${locs} location${locs === 1 ? "" : "s"} · Independent`,
    topFixes: topFixesFromResult(scored, payload),
  };
}

export function applyOpportunityReportToPayload(
  payload: AuditResultPayload,
  meta: { name: string; city: string; websiteUrl?: string | null },
): AuditResultPayload {
  return {
    ...payload,
    opportunityReport: computeAuditOpportunityReport(payload, meta),
  };
}
