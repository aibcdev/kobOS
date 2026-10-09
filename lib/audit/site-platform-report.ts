import type { AuditResultPayload } from "@/lib/audit/types";

export type SitePlatformReportLine = {
  platform: string;
  line: string;
  /** Only gaps this scan measured on this site; empty is a valid answer. */
  gaps: string[];
};

/** Owner's public plans (owner.com/pricing, see docs/OWNER-COMPETITOR-INTEL.md). */
const OWNER_PUBLIC_PRICING = "$249–$499/mo";

export function buildSitePlatformReportLine(payload: AuditResultPayload): SitePlatformReportLine | null {
  const sp = payload.sitePlatform;
  if (!sp || sp.confidence !== "high") return null;
  if (sp.platform === "custom" || sp.platform === "unknown") return null;

  const line =
    sp.platform === "owner"
      ? `Your site runs on Owner.com (public pricing ${OWNER_PUBLIC_PRICING}).`
      : `Your site runs on ${sp.label}.`;

  const ep = payload.evidencePack;
  const s = ep?.urlSignals;
  const gaps: string[] = [];
  if (s?.fetched && !s.fetchError) {
    if (!s.hasRestaurantSchema) gaps.push("No Restaurant schema on the homepage");
    if (!s.hasMetaDescription) gaps.push("No meta description on the homepage");
  }
  const psi = ep?.pageSpeed;
  if (psi && !psi.error && psi.performanceScore != null && psi.performanceScore < 50) {
    gaps.push(`Mobile PageSpeed score ${psi.performanceScore}/100`);
  }
  if (ep?.guestSignals && !ep.guestSignals.hasOpeningHours) {
    gaps.push("Opening hours not found on the homepage");
  }

  return { platform: sp.platform, line, gaps: gaps.slice(0, 3) };
}
