/** UK cold outreach ICP — tuned via env. */

export type OutboundIcpConfig = {
  reviewMin: number;
  reviewMax: number;
  ratingMin: number;
  ratingMax: number;
  maxQualifyScore: number;
  instagramMax: number;
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
  const citiesRaw =
    process.env.OUTBOUND_UK_CITIES?.trim() ||
    "London,Manchester,Birmingham,Leeds,Bristol,Glasgow,Edinburgh,Dublin,Cork,Galway";
  const ukCities = citiesRaw
    .split(/[,;]+/)
    .map((c) => c.trim())
    .filter(Boolean);

  return {
    reviewMin: Math.max(0, Number(process.env.OUTBOUND_REVIEW_MIN?.trim() || "50") || 50),
    reviewMax: Math.max(1, Number(process.env.OUTBOUND_REVIEW_MAX?.trim() || "2500") || 2500),
    ratingMin: Number(process.env.OUTBOUND_RATING_MIN?.trim() || "4.0") || 4.0,
    ratingMax: Number(process.env.OUTBOUND_RATING_MAX?.trim() || "4.6") || 4.6,
    instagramMax: Number(process.env.LEAD_ENGINE_INSTAGRAM_MAX?.trim() || "10000") || 10000,
    maxQualifyScore: Math.min(100, Math.max(1, Number(process.env.OUTBOUND_MAX_QUALIFY_SCORE?.trim() || "65") || 65)),
    requireWebsite: process.env.OUTBOUND_REQUIRE_WEBSITE !== "0",
    ukCities: ukCities.length ? ukCities : ["London"],
    dailyProspectCap: Math.min(30, Math.max(5, Number(process.env.OUTBOUND_UK_DAILY_CAP?.trim() || "20") || 20)),
  };
}
