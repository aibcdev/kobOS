/** UK cold outreach ICP — tuned via env. */

export type OutboundIcpConfig = {
  reviewMin: number;
  reviewMax: number;
  maxQualifyScore: number;
  requireWebsite: boolean;
  ukCities: string[];
  dailyProspectCap: number;
};

export function getOutboundMode(): "uk_cold" | "legacy" {
  const mode = process.env.OUTBOUND_MODE?.trim().toLowerCase();
  return mode === "uk_cold" ? "uk_cold" : "legacy";
}

export function isUkColdOutboundMode(): boolean {
  return getOutboundMode() === "uk_cold";
}

export function getOutboundIcpConfig(): OutboundIcpConfig {
  const citiesRaw = process.env.OUTBOUND_UK_CITIES?.trim() || "London,Manchester,Birmingham,Leeds,Bristol,Glasgow,Edinburgh";
  const ukCities = citiesRaw
    .split(/[,;]+/)
    .map((c) => c.trim())
    .filter(Boolean);

  return {
    reviewMin: Math.max(0, Number(process.env.OUTBOUND_REVIEW_MIN?.trim() || "20") || 20),
    reviewMax: Math.max(1, Number(process.env.OUTBOUND_REVIEW_MAX?.trim() || "500") || 500),
    maxQualifyScore: Math.min(100, Math.max(1, Number(process.env.OUTBOUND_MAX_QUALIFY_SCORE?.trim() || "65") || 65)),
    requireWebsite: process.env.OUTBOUND_REQUIRE_WEBSITE !== "0",
    ukCities: ukCities.length ? ukCities : ["London"],
    dailyProspectCap: Math.min(30, Math.max(5, Number(process.env.OUTBOUND_UK_DAILY_CAP?.trim() || "20") || 20)),
  };
}
