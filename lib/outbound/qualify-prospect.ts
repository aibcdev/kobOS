import { analyzeWebsiteFull } from "@/lib/audit/analyze-url";
import type { UrlSignals } from "@/lib/audit/analyze-url";
import type { OutboundProspect } from "@/lib/outbound/prospect-types";
import { mapProspectToIcpInput } from "@/lib/outbound/map-to-icp-input";
import { calculateOpportunityScore } from "@/lib/outbound/score-opportunity";

export type QualifyResult =
  | { ok: true; qualifyScore: number; topIssue: string; icpStatus: "qualified" }
  | { ok: false; reason: string };

function topIssueFromSignals(s: UrlSignals): string {
  const issues: string[] = [];
  if (!s.hasMetaDescription) issues.push("missing meta description");
  if (!s.hasJsonLd) issues.push("no structured data for Google");
  if (!s.hasViewport) issues.push("weak mobile setup");
  if (!s.isHttps) issues.push("not on HTTPS");
  if (s.h1Count === 0) issues.push("unclear page structure (H1)");
  if (s.titleLen < 12) issues.push("thin or missing page title");
  if (!s.hasTelLink) issues.push("no click-to-call on homepage");
  if (issues.length === 0) issues.push("room to improve conversion and local SEO");
  return issues.slice(0, 2).join("; ");
}

/**
 * Qualify for cold email using Opportunity Score Engine (opportunity-v1).
 * Only status === "qualified" passes (fit ≥ 70 and likelihood ≥ 60).
 */
export async function qualifyProspect(prospect: OutboundProspect): Promise<QualifyResult> {
  const url = prospect.websiteUrl?.trim();
  if (!url) {
    return { ok: false, reason: "no_website" };
  }

  const { signals } = await analyzeWebsiteFull(url);
  const dated =
    !signals.hasViewport ||
    !signals.hasMetaDescription ||
    !signals.hasJsonLd ||
    (signals.titleLen > 0 && signals.titleLen < 12);

  const opp = calculateOpportunityScore({
    ...mapProspectToIcpInput({
      placeId: prospect.placeId,
      name: prospect.name,
      city: prospect.formattedAddress?.split(",").slice(-2, -1)[0]?.trim() ?? null,
      websiteUrl: url,
      rating: prospect.rating,
      reviewCount: prospect.userRatingCount,
      locationCount: 1,
      websiteStale: dated,
      weakWebsite: dated,
      hasGoogleBusinessPosts: null,
    }),
    avg_ticket: 32,
    currency: "GBP",
  });

  if (opp.status === "discard") {
    return {
      ok: false,
      reason: opp.disqualifiers[0] ?? `opportunity_discard_fit${opp.fit_proxy ?? 0}`,
    };
  }
  if (opp.status === "park") {
    return { ok: false, reason: `opportunity_park_fit${opp.fit_proxy ?? 0}` };
  }

  const metrics = opp.opportunity_score;
  const topIssue =
    opp.personalization_hooks[0] ??
    (metrics
      ? `Est. ${metrics.est_monthly_lost_customers} lost customers/mo (~£${metrics.est_lost_revenue})`
      : null) ??
    topIssueFromSignals(signals);

  return {
    ok: true,
    qualifyScore: opp.fit_proxy ?? metrics?.likelihood_to_buy ?? 0,
    topIssue,
    icpStatus: "qualified",
  };
}
