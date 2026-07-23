/**
 * KOB Opportunity Score Engine — investment-grade restaurant intelligence
 * for outbound + audit conversion. Versioned alongside ICP Fit Score.
 *
 * Produces: revenue potential, marketing maturity, likelihood to buy,
 * estimated lost customers/revenue, reasons, personalization hooks.
 */

export const OPPORTUNITY_SCORE_VERSION = "opportunity-v1" as const;

export type OpportunityStatus = "qualified" | "park" | "discard";

export type OpportunityEmailAngle =
  | "lost_revenue"
  | "rating_gap"
  | "inactive_social"
  | "general";

export type OpportunityRestaurantInput = {
  place_id?: string | null;
  name: string;
  locations?: number | null;
  is_independent?: boolean | null;
  is_chain?: boolean | null;
  is_hotel?: boolean | null;
  rating?: number | null;
  review_count?: number | null;
  days_since_last_instagram?: number | null;
  website_age_years?: number | null;
  has_dated_ux?: boolean | null;
  has_recent_google_posts?: boolean | null;
  /** 0.0–1.0 */
  review_response_rate?: number | null;
  is_ghost_kitchen?: boolean | null;
  has_website?: boolean | null;
  has_google_profile?: boolean | null;
  active_on_deliveroo_or_uber?: boolean | null;
  is_competitive_city?: boolean | null;
  on_major_platform?: boolean | null;
  /** Optional, default 32 */
  avg_ticket?: number | null;
  /** Optional, default GBP */
  currency?: string | null;
};

export type OpportunityScoreMetrics = {
  revenue_potential: number;
  marketing_maturity: number;
  likelihood_to_buy: number;
  est_monthly_lost_customers: number;
  est_lost_revenue: number;
  currency: string;
};

export type OpportunityScoreResult = {
  version: typeof OPPORTUNITY_SCORE_VERSION;
  place_id: string | null;
  name: string;
  status: OpportunityStatus;
  disqualifiers: string[];
  opportunity_score: OpportunityScoreMetrics | null;
  /** Fit-style proxy used for outbound gate (mirrors Python fit_proxy). */
  fit_proxy: number | null;
  reasons: string[];
  personalization_hooks: string[];
  recommended_email_angle: OpportunityEmailAngle | null;
};

function hardDisqualifiers(r: OpportunityRestaurantInput): string[] {
  const disqualifiers: string[] = [];
  const locations = r.locations ?? 0;
  const rating = r.rating;

  if (locations > 6 || (r.is_chain === true && locations > 5)) {
    disqualifiers.push("too_many_locations");
  }
  if (r.is_ghost_kitchen === true) {
    disqualifiers.push("ghost_kitchen");
  }
  if (rating != null && rating < 3.2) {
    disqualifiers.push("rating_too_low");
  }
  if (r.has_website === false && r.has_google_profile === false) {
    disqualifiers.push("no_web_presence");
  }
  if (r.on_major_platform === true) {
    disqualifiers.push("heavy_competitor_platform");
  }
  if (r.is_hotel === true) {
    disqualifiers.push("hotel_restaurant");
  }

  return disqualifiers;
}

/** Deterministic opportunity score — matches the Python Opportunity Score Engine. */
export function calculateOpportunityScore(r: OpportunityRestaurantInput): OpportunityScoreResult {
  const disqualifiers = hardDisqualifiers(r);
  if (disqualifiers.length > 0) {
    return {
      version: OPPORTUNITY_SCORE_VERSION,
      place_id: r.place_id ?? null,
      name: r.name,
      status: "discard",
      disqualifiers,
      opportunity_score: null,
      fit_proxy: null,
      reasons: [],
      personalization_hooks: [],
      recommended_email_angle: null,
    };
  }

  const locations = r.locations ?? 0;
  const rating = r.rating;
  const reviewCount = r.review_count ?? 0;

  // Revenue Potential (1–5 stars)
  let revenuePoints = 0;
  if (locations >= 1 && locations <= 2) revenuePoints += 2;
  else if (locations >= 3 && locations <= 5) revenuePoints += 1.5;

  if (reviewCount >= 800) revenuePoints += 1.5;
  else if (reviewCount >= 300) revenuePoints += 1;

  if (r.active_on_deliveroo_or_uber === true) revenuePoints += 1;
  if (r.is_competitive_city === true) revenuePoints += 0.5;
  if (r.is_independent === true) revenuePoints += 0.5;

  const revenuePotential = Math.min(5, Math.max(1, Math.round(revenuePoints)));

  // Marketing Maturity (0–100) — higher = more mature (less need)
  let maturity = 100;
  const reasons: string[] = [];
  const hooks: string[] = [];

  if (locations) {
    reasons.push(`${locations} location${locations > 1 ? "s" : ""}`);
  }

  if (rating != null && rating < 4.5) {
    maturity -= 18;
    reasons.push(`${rating}★`);
    hooks.push(`Google rating is ${rating}`);
  }

  const igDays = r.days_since_last_instagram ?? 0;
  if (igDays > 14) {
    maturity -= 15;
    reasons.push(`Last Instagram post ${igDays} days ago`);
    hooks.push(`Last Instagram post was ${igDays} days ago`);
  }

  const siteAge = r.website_age_years ?? 0;
  if (siteAge >= 5 || r.has_dated_ux === true) {
    maturity -= 14;
    const year = 2026 - Math.floor(siteAge || 6);
    reasons.push(`Website built in ${year}`);
    hooks.push(`Website still looks like ${year}`);
  }

  if (r.has_recent_google_posts === false) {
    maturity -= 12;
    reasons.push("No recent Google Posts");
    hooks.push("No Google Posts in the last 30 days");
  }

  const replyRate = r.review_response_rate ?? 1;
  if (replyRate < 0.3) {
    const rate = Math.round((r.review_response_rate ?? 0) * 100);
    maturity -= 12;
    reasons.push(`Owner reply rate ${rate}%`);
    hooks.push(`Only replying to ${rate}% of reviews`);
  }

  if (reviewCount) {
    reasons.push(`${reviewCount.toLocaleString("en-GB")} reviews`);
  }

  const marketingMaturity = Math.max(0, Math.min(100, maturity));

  // Likelihood to Buy (%)
  let likelihood = 40;
  if (r.is_independent === true) likelihood += 18;
  if (locations >= 1 && locations <= 5) likelihood += 12;
  if (rating != null && rating < 4.5) likelihood += 10;
  if (marketingMaturity < 60) likelihood += 12;
  if (r.active_on_deliveroo_or_uber === true) likelihood += 5;
  if (r.is_competitive_city === true) likelihood += 5;
  const likelihoodToBuy = Math.max(5, Math.min(95, likelihood));

  // Estimated lost customers & revenue
  const avgTicket = r.avg_ticket ?? 32;
  const currency = r.currency ?? "GBP";

  const lostFromRating = Math.max(0, (4.6 - (rating ?? 4.0)) * 18);
  const lostFromSocial = igDays > 14 ? 12 : 0;
  const lostFromWebsite = siteAge >= 5 || r.has_dated_ux === true ? 15 : 0;
  const lostFromReplies = replyRate < 0.3 ? 10 : 0;
  const lostFromPosts = r.has_recent_google_posts === false ? 8 : 0;

  const estMonthlyLostCustomers = Math.floor(
    lostFromRating + lostFromSocial + lostFromWebsite + lostFromReplies + lostFromPosts,
  );
  const estLostRevenue = Math.floor(estMonthlyLostCustomers * avgTicket);

  // Fit-style gate for outbound
  let fitProxy = 0;
  if (locations >= 1 && locations <= 5) fitProxy += 30;
  if (r.is_independent === true) fitProxy += 20;
  if (rating != null && rating < 4.5) fitProxy += 20;
  if (igDays > 14) fitProxy += 20;
  if (siteAge >= 5 || r.has_dated_ux === true) fitProxy += 15;

  let status: OpportunityStatus;
  if (fitProxy >= 70 && likelihoodToBuy >= 60) status = "qualified";
  else if (fitProxy >= 50) status = "park";
  else status = "discard";

  let angle: OpportunityEmailAngle;
  if (estLostRevenue >= 3000) angle = "lost_revenue";
  else if (rating != null && rating < 4.4) angle = "rating_gap";
  else if (igDays > 20) angle = "inactive_social";
  else angle = "general";

  return {
    version: OPPORTUNITY_SCORE_VERSION,
    place_id: r.place_id ?? null,
    name: r.name,
    status,
    disqualifiers: [],
    opportunity_score: {
      revenue_potential: revenuePotential,
      marketing_maturity: marketingMaturity,
      likelihood_to_buy: likelihoodToBuy,
      est_monthly_lost_customers: estMonthlyLostCustomers,
      est_lost_revenue: estLostRevenue,
      currency,
    },
    fit_proxy: fitProxy,
    reasons,
    personalization_hooks: hooks,
    recommended_email_angle: angle,
  };
}

export function calculateOpportunityScoreBatch(
  inputs: OpportunityRestaurantInput[],
): OpportunityScoreResult[] {
  return inputs.map(calculateOpportunityScore);
}

export function filterOpportunityQualified(
  results: OpportunityScoreResult[],
): OpportunityScoreResult[] {
  return results.filter((r) => r.status === "qualified");
}
