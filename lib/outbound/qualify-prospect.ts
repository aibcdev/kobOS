import { analyzeWebsiteFull } from "@/lib/audit/analyze-url";
import type { UrlSignals } from "@/lib/audit/analyze-url";
import type { OutboundProspect } from "@/lib/outbound/prospect-types";
import { getOutboundIcpConfig } from "@/lib/outbound/icp-config";

export type QualifyResult =
  | { ok: true; qualifyScore: number; topIssue: string }
  | { ok: false; reason: string };

function scoreFromSignals(s: UrlSignals): number {
  let score = 28;
  if (s.fetched) score += 8;
  if (s.status && s.status >= 200 && s.status < 400) score += 6;
  if (s.isHttps) score += 6;
  if (s.hasMetaDescription) score += 10;
  if (s.hasJsonLd) score += 12;
  if (s.hasViewport) score += 10;
  if (s.hasCanonical) score += 5;
  if (s.hasOgTitle) score += 5;
  if (s.h1Count === 1) score += 6;
  if (s.titleLen >= 12 && s.titleLen <= 70) score += 6;
  if (s.hasTelLink) score += 4;
  if (s.hasBookOrReserveKeyword) score += 4;
  if (s.imgCount >= 3) score += 5;
  return Math.min(100, score);
}

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

/** Lightweight homepage check — pass only if score is below ICP threshold (weaker sites). */
export async function qualifyProspect(prospect: OutboundProspect): Promise<QualifyResult> {
  const url = prospect.websiteUrl?.trim();
  if (!url) {
    return { ok: false, reason: "no_website" };
  }

  const { signals } = await analyzeWebsiteFull(url);
  const qualifyScore = scoreFromSignals(signals);
  const { maxQualifyScore } = getOutboundIcpConfig();

  if (qualifyScore >= maxQualifyScore) {
    return { ok: false, reason: `score_too_high_${qualifyScore}` };
  }

  return {
    ok: true,
    qualifyScore,
    topIssue: topIssueFromSignals(signals),
  };
}
