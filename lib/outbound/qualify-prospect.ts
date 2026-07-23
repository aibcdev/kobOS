import { analyzeWebsiteFull } from "@/lib/audit/analyze-url";
import type { UrlSignals } from "@/lib/audit/analyze-url";
import type { OutboundProspect } from "@/lib/outbound/prospect-types";
import { mapProspectToIcpInput } from "@/lib/outbound/map-to-icp-input";
import { scoreIcp } from "@/lib/outbound/score-icp";

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
 * Qualify for cold email using ICP Fit Score (icp-fit-v1).
 * Only status === "qualified" (score ≥ 70) passes.
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

  const icp = scoreIcp(
    mapProspectToIcpInput({
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
  );

  if (icp.status === "discard") {
    return {
      ok: false,
      reason: icp.disqualifiers[0] ?? `icp_discard_${icp.fit_score}`,
    };
  }
  if (icp.status === "park") {
    return { ok: false, reason: `icp_park_${icp.fit_score}` };
  }

  const topIssue =
    icp.personalization_hooks[0] ??
    icp.matched_factors[0] ??
    topIssueFromSignals(signals);

  return {
    ok: true,
    qualifyScore: icp.fit_score,
    topIssue,
    icpStatus: "qualified",
  };
}
