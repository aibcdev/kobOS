/** Lead engine ICP + pipeline caps — tuned via env. */

import {
  ALL_LEAD_ENGINE_CITIES,
  isIrelandCity,
  leadEngineCityNames,
} from "@/lib/lead-engine/scrapers/uk-ie-cities";

export type LeadEngineConfig = {
  /** Minimum platform (Just Eat / Deliveroo / Uber) reviews. */
  reviewMin: number;
  /** Minimum Google reviews when platform count is lower. */
  googleReviewMin: number;
  reviewMax: number;
  ratingMin: number;
  ratingMax: number;
  requireWebsite: boolean;
  requireRecentReviewDays: number;
  locationMax: number;
  platformTopPct: number;
  staleWebsiteYears: number;
  requireWeakWebsite: boolean;
  requireStaleWebsite: boolean;
  dailyCap: number;
  minScoreForOutreach: number;
  outreachDailyCap: number;
  analyzerDailyCap: number;
  seedTarget: number;
  cities: Array<{ city: string; country: "GB" | "IE" }>;
};

const DEFAULT_UK_IE_CITIES = leadEngineCityNames().join(",");

function parseLeadEngineCities(citiesRaw: string): Array<{ city: string; country: "GB" | "IE" }> {
  return citiesRaw
    .split(/[,;]+/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((city) => ({
      city,
      country: (isIrelandCity(city) ? "IE" : "GB") as "GB" | "IE",
    }));
}

export function getLeadEngineConfig(): LeadEngineConfig {
  const explicit = process.env.LEAD_ENGINE_UK_IE_CITIES?.trim();
  const cities = explicit
    ? parseLeadEngineCities(explicit)
    : ALL_LEAD_ENGINE_CITIES.map((c) => ({ city: c.city, country: c.country }));

  const irelandSet = new Set(
    (process.env.LEAD_ENGINE_IRELAND_CITIES?.trim() || "Dublin,Cork,Galway,Limerick,Waterford")
      .split(/[,;]+/)
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean),
  );

  const citiesWithCountry = cities.map((slot) => ({
    city: slot.city,
    country: (irelandSet.has(slot.city.toLowerCase()) || isIrelandCity(slot.city)
      ? "IE"
      : slot.country) as "GB" | "IE",
  }));

  return {
    reviewMin: Math.max(50, Number(process.env.OUTBOUND_REVIEW_MIN?.trim() || "50") || 50),
    googleReviewMin: Math.max(50, Number(process.env.LEAD_ENGINE_GOOGLE_REVIEW_MIN?.trim() || "50") || 50),
    reviewMax: Math.max(1, Number(process.env.OUTBOUND_REVIEW_MAX?.trim() || "2500") || 2500),
    ratingMin: Number(process.env.OUTBOUND_RATING_MIN?.trim() || "3.2") || 3.2,
    ratingMax: Number(process.env.OUTBOUND_RATING_MAX?.trim() || "4.7") || 4.7,
    requireWebsite: process.env.OUTBOUND_REQUIRE_WEBSITE?.trim() === "1",
    requireRecentReviewDays: Math.max(7, Number(process.env.LEAD_ENGINE_RECENT_REVIEW_DAYS?.trim() || "180") || 180),
    locationMax: Math.max(1, Number(process.env.LEAD_ENGINE_LOCATION_MAX?.trim() || "5") || 5),
    platformTopPct: Math.min(100, Math.max(5, Number(process.env.LEAD_ENGINE_PLATFORM_TOP_PCT?.trim() || "20") || 20)),
    staleWebsiteYears: Math.max(
      1,
      Number(process.env.LEAD_ENGINE_STALE_WEBSITE_YEARS?.trim() || "1") || 1,
    ),
    requireWeakWebsite: process.env.LEAD_ENGINE_REQUIRE_WEAK_WEBSITE?.trim() === "1",
    requireStaleWebsite: process.env.LEAD_ENGINE_REQUIRE_STALE_WEBSITE?.trim() === "1",
    // Throughput: target ~1k scraped/enriched per day. ICP quality is scoreIcp ≥70, not tiny caps.
    dailyCap: Math.min(2000, Math.max(50, Number(process.env.LEAD_ENGINE_DAILY_CAP?.trim() || "1000") || 1000)),
    minScoreForOutreach: Math.min(200, Math.max(1, Number(process.env.LEAD_ENGINE_MIN_SCORE?.trim() || "70") || 70)),
    outreachDailyCap: Math.min(1500, Math.max(20, Number(process.env.LEAD_ENGINE_OUTREACH_DAILY_CAP?.trim() || "1000") || 1000)),
    analyzerDailyCap: Math.min(2000, Math.max(20, Number(process.env.LEAD_ENGINE_ANALYZER_DAILY_CAP?.trim() || "1000") || 1000)),
    seedTarget: Math.max(100, Number(process.env.LEAD_ENGINE_SEED_TARGET?.trim() || "5000") || 5000),
    cities: citiesWithCountry.length ? citiesWithCountry : [{ city: "London", country: "GB" }],
  };
}

/** Parallel website analyses per analyzer wave. */
export function getLeadEngineAnalyzerConcurrency(): number {
  return Math.min(12, Math.max(1, Number(process.env.LEAD_ENGINE_CONCURRENCY?.trim() || "6") || 6));
}

export function isLeadEngineFastAnalyze(): boolean {
  return process.env.LEAD_ENGINE_FAST_ANALYZE?.trim() !== "0";
}

export type LeadQueryType = "restaurant" | "cafe" | "takeaway";

/** Discovery bias: high-street restaurants first (takeaway/cafe optional via env). */
export const LEAD_QUERY_TYPES: LeadQueryType[] =
  process.env.LEAD_ENGINE_INCLUDE_CAFE_TAKEAWAY?.trim() === "1"
    ? ["restaurant", "cafe", "takeaway"]
    : ["restaurant"];
