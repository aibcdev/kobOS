/**
 * KOB ICP Fit Score — cold email outbound qualification.
 * Versioned ruleset: keep in sync with `.agents/skills/kob-audit-engine/`.
 *
 * Only status === "qualified" (score ≥ 70) should enter the outbound email list.
 */

export const ICP_SCORE_VERSION = "icp-fit-v1" as const;

export type IcpEmailAngle =
  | "rating_gap"
  | "inactive_social"
  | "dated_website"
  | "local_pack"
  | "review_response";

export type IcpStatus = "qualified" | "park" | "discard";

export type IcpRestaurantInput = {
  place_id?: string | null;
  name: string;
  /** Physical locations. Unknown → omit (no +30 / no location DQ). */
  locations?: number | null;
  is_independent?: boolean | null;
  is_chain?: boolean | null;
  is_hotel?: boolean | null;
  rating?: number | null;
  review_count?: number | null;
  /** Days since last organic Instagram feed post. */
  days_since_last_instagram?: number | null;
  website_age_years?: number | null;
  has_dated_ux?: boolean | null;
  has_recent_google_posts?: boolean | null;
  /** 0–1. Under ~0.30 counts as low reply rate. */
  review_response_rate?: number | null;
  is_ghost_kitchen?: boolean | null;
  has_website?: boolean | null;
  has_google_profile?: boolean | null;
  active_on_deliveroo_or_uber?: boolean | null;
  is_competitive_city?: boolean | null;
  /** Owner.com / Toast suite / etc. clearly visible. */
  on_major_platform?: boolean | null;
  /** Optional — for hooks only. */
  competitor_ratings_nearby?: number[] | null;
  website_notes?: string | null;
};

export type IcpScoreResult = {
  version: typeof ICP_SCORE_VERSION;
  place_id: string | null;
  name: string;
  fit_score: number;
  status: IcpStatus;
  matched_factors: string[];
  disqualifiers: string[];
  personalization_hooks: string[];
  recommended_email_angle: IcpEmailAngle | null;
};

const LOCATION_MAX = 5;
const RATING_FLOOR = 3.2;
const REVIEW_REPLY_LOW = 0.3;

function hardDisqualifiers(r: IcpRestaurantInput): string[] {
  const dq: string[] = [];
  const locs = r.locations;
  if (locs != null && locs > LOCATION_MAX) {
    dq.push(`too_many_locations (${locs})`);
  }
  if (r.is_chain === true && locs != null && locs > LOCATION_MAX) {
    dq.push("large_chain");
  }
  if (r.is_ghost_kitchen === true) {
    dq.push("ghost_kitchen");
  }
  if (r.rating != null && r.rating < RATING_FLOOR) {
    dq.push(`rating_below_${RATING_FLOOR}`);
  }
  const hasSite = r.has_website === true;
  const hasGbp = r.has_google_profile === true;
  if (r.has_website === false && r.has_google_profile === false) {
    dq.push("no_website_and_no_google_profile");
  }
  // Only DQ on missing presence when both flags are explicitly false (not unknown).
  void hasSite;
  void hasGbp;
  if (r.on_major_platform === true) {
    dq.push("major_platform_customer");
  }
  return dq;
}

function scorePoints(r: IcpRestaurantInput): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  const locs = r.locations;
  if (locs != null && locs >= 1 && locs <= 5) {
    score += 30;
    factors.push("1-5 locations");
  }

  if (r.is_independent === true) {
    score += 20;
    factors.push("independent");
  }

  if (r.rating != null && r.rating < 4.5) {
    score += 20;
    factors.push("rating under 4.5");
  }

  if (r.days_since_last_instagram != null && r.days_since_last_instagram > 14) {
    score += 20;
    factors.push("inactive Instagram");
  }

  const datedSite =
    (r.website_age_years != null && r.website_age_years > 5) || r.has_dated_ux === true;
  if (datedSite) {
    score += 15;
    factors.push("dated website");
  }

  if (r.has_recent_google_posts === false) {
    score += 10;
    factors.push("no recent Google Posts");
  }

  if (
    r.review_response_rate != null &&
    r.review_response_rate < REVIEW_REPLY_LOW
  ) {
    score += 10;
    factors.push("low review response rate");
  }

  if (r.is_chain === true) {
    score -= 40;
    factors.push("chain (−40)");
  }

  if (r.is_hotel === true) {
    score -= 50;
    factors.push("hotel restaurant (−50)");
  }

  const reviews = r.review_count;
  if (reviews != null && reviews >= 300 && reviews <= 3000) {
    score += 10;
    factors.push("300–3000 reviews");
  }

  if (r.active_on_deliveroo_or_uber === true) {
    score += 10;
    factors.push("active on delivery platforms");
  }

  if (r.is_competitive_city === true) {
    score += 10;
    factors.push("competitive dining city");
  }

  return { score, factors };
}

function buildHooks(r: IcpRestaurantInput, factors: string[]): string[] {
  const hooks: string[] = [];

  if (r.rating != null && factors.includes("rating under 4.5")) {
    const comps = r.competitor_ratings_nearby?.filter((n) => Number.isFinite(n));
    if (comps?.length) {
      const hi = Math.max(...comps);
      const lo = Math.min(...comps);
      hooks.push(
        `Google rating ${r.rating.toFixed(1)} while nearby competitors sit at ${lo.toFixed(1)}–${hi.toFixed(1)}`,
      );
    } else {
      hooks.push(`Google rating ${r.rating.toFixed(1)} (under 4.5 — reputation upside)`);
    }
  }

  if (r.days_since_last_instagram != null && r.days_since_last_instagram > 14) {
    hooks.push(`Last Instagram post ${r.days_since_last_instagram} days ago`);
  }

  if (factors.includes("dated website")) {
    if (r.website_notes?.trim()) {
      hooks.push(r.website_notes.trim());
    } else if (r.website_age_years != null && r.website_age_years > 5) {
      hooks.push(`Website signals ~${Math.round(r.website_age_years)} years old / dated UX`);
    } else {
      hooks.push("Website still uses dated design patterns");
    }
  }

  if (r.has_recent_google_posts === false) {
    hooks.push("No Google Business posts in the last 30 days");
  }

  if (r.review_response_rate != null && r.review_response_rate < REVIEW_REPLY_LOW) {
    const pct = Math.round(r.review_response_rate * 100);
    hooks.push(`Owner review response rate ~${pct}% (under 30%)`);
  }

  return hooks.slice(0, 4);
}

function recommendAngle(
  factors: string[],
  hooks: string[],
): IcpEmailAngle | null {
  if (factors.includes("rating under 4.5") || hooks.some((h) => /rating/i.test(h))) {
    return "rating_gap";
  }
  if (factors.includes("inactive Instagram")) return "inactive_social";
  if (factors.includes("dated website")) return "dated_website";
  if (factors.includes("low review response rate")) return "review_response";
  if (factors.includes("no recent Google Posts")) return "local_pack";
  return null;
}

function decideStatus(score: number, disqualifiers: string[]): IcpStatus {
  if (disqualifiers.length > 0) return "discard";
  if (score >= 70) return "qualified";
  if (score >= 50) return "park";
  return "discard";
}

/** Deterministic ICP fit score — same rules as the kob-audit-engine skill. */
export function scoreIcp(input: IcpRestaurantInput): IcpScoreResult {
  const disqualifiers = hardDisqualifiers(input);
  if (disqualifiers.length > 0) {
    return {
      version: ICP_SCORE_VERSION,
      place_id: input.place_id ?? null,
      name: input.name,
      fit_score: 0,
      status: "discard",
      matched_factors: [],
      disqualifiers,
      personalization_hooks: [],
      recommended_email_angle: null,
    };
  }

  const { score, factors } = scorePoints(input);
  const status = decideStatus(score, disqualifiers);
  const hooks = status === "qualified" ? buildHooks(input, factors) : buildHooks(input, factors).slice(0, 2);
  const angle = status === "qualified" ? recommendAngle(factors, hooks) : null;

  return {
    version: ICP_SCORE_VERSION,
    place_id: input.place_id ?? null,
    name: input.name,
    fit_score: score,
    status,
    matched_factors: factors,
    disqualifiers: [],
    personalization_hooks: status === "discard" && score < 50 ? [] : hooks,
    recommended_email_angle: angle,
  };
}

export function scoreIcpBatch(inputs: IcpRestaurantInput[]): IcpScoreResult[] {
  return inputs.map(scoreIcp);
}

export function filterQualified(results: IcpScoreResult[]): IcpScoreResult[] {
  return results.filter((r) => r.status === "qualified");
}
