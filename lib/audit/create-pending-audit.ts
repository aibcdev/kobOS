import type { Prisma } from "@prisma/client";
import type { AuditResultPayload } from "@/lib/audit/types";

function minimalGated(restaurantName: string, city: string): AuditResultPayload["gated"] {
  return {
    keywordOpportunities: [],
    roadmap: { days30: [], days60: [], days90: [] },
    competitorDeepDive: [],
    redesignPreviewNotes: `Full report for ${restaurantName} in ${city} will appear when the scan completes.`,
  };
}

/** Placeholder audit row + payload so scanning UI can load immediately (Owner.com-style). */
export function createPendingAuditSeed(input: {
  restaurantName: string;
  city: string;
  websiteUrl: string;
}): {
  row: Omit<Prisma.VisibilityAuditCreateInput, "id">;
  payload: AuditResultPayload;
} {
  const scores = { overall: 0, seo: 0, design: 0, mobile: 0, conversion: 0 };
  const payload: AuditResultPayload = {
    scoresPending: true,
    scores,
    issues: [],
    opportunities: [],
    competitors: [],
    teaser: {
      headline: `Scanning ${input.restaurantName}`,
      subline: "We are analyzing your site and local presence.",
      paletteNote: "",
    },
    gated: minimalGated(input.restaurantName, input.city),
    scanStatus: "pending",
  };

  const row: Omit<Prisma.VisibilityAuditCreateInput, "id"> = {
    restaurantName: input.restaurantName,
    city: input.city,
    websiteUrl: input.websiteUrl,
    overallScore: scores.overall,
    seoScore: scores.seo,
    designScore: scores.design,
    mobileScore: scores.mobile,
    conversionScore: scores.conversion,
    resultPayload: payload as object,
  };

  return { row, payload };
}

const UK_POSTCODE = /\s+[A-Z]{1,2}\d[\dA-Z]?\s*\d[A-Z]{2}$/i;
const UK_COUNTRY = /^(UK|United Kingdom|England|Scotland|Wales|Northern Ireland)$/i;

function stripUkPostcode(segment: string): string {
  return segment.replace(UK_POSTCODE, "").trim();
}

/** Parse city from a UK formatted address (avoids returning bare "UK"). */
export function cityFromFormattedAddress(formattedAddress: string | undefined): string {
  if (!formattedAddress?.trim()) return "Your area";
  const parts = formattedAddress
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  while (parts.length > 1 && UK_COUNTRY.test(parts[parts.length - 1] ?? "")) {
    parts.pop();
  }
  if (!parts.length) return "Your area";
  const last = parts[parts.length - 1]!;
  const cityFromLast = stripUkPostcode(last);
  if (cityFromLast && cityFromLast.length <= 80 && !UK_COUNTRY.test(cityFromLast)) {
    return cityFromLast;
  }
  if (parts.length >= 2) {
    const prev = stripUkPostcode(parts[parts.length - 2]!);
    if (prev && prev.length <= 80) return prev;
  }
  return parts[0]?.slice(0, 80) || "Your area";
}
