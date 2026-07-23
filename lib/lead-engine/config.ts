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
    googleReviewMin: Math.max(40, Number(process.env.LEAD_ENGINE_GOOGLE_REVIEW_MIN?.trim() || "40") || 40),
    reviewMax: Math.max(1, Number(process.env.OUTBOUND_REVIEW_MAX?.trim() || "2500") || 2500),
    ratingMin: Number(process.env.OUTBOUND_RATING_MIN?.trim() || "4.0") || 4.0,
    ratingMax: Number(process.env.OUTBOUND_RATING_MAX?.trim() || "4.5") || 4.5,
    requireWebsite: process.env.OUTBOUND_REQUIRE_WEBSITE?.trim() === "1",
    requireRecentReviewDays: Math.max(7, Number(process.env.LEAD_ENGINE_RECENT_REVIEW_DAYS?.trim() || "30") || 30),
    locationMax: Math.max(1, Number(process.env.LEAD_ENGINE_LOCATION_MAX?.trim() || "3") || 3),
    platformTopPct: Math.min(100, Math.max(5, Number(process.env.LEAD_ENGINE_PLATFORM_TOP_PCT?.trim() || "20") || 20)),
    staleWebsiteYears: Math.max(
      1,
      Number(process.env.LEAD_ENGINE_STALE_WEBSITE_YEARS?.trim() || "1") || 1,
    ),
    requireWeakWebsite: process.env.LEAD_ENGINE_REQUIRE_WEAK_WEBSITE?.trim() === "1",
    requireStaleWebsite: process.env.LEAD_ENGINE_REQUIRE_STALE_WEBSITE?.trim() === "1",
    dailyCap: Math.min(150, Math.max(10, Number(process.env.LEAD_ENGINE_DAILY_CAP?.trim() || "80") || 80)),
    minScoreForOutreach: Math.min(200, Math.max(1, Number(process.env.LEAD_ENGINE_MIN_SCORE?.trim() || "70") || 70)),
    outreachDailyCap: Math.min(50, Math.max(5, Number(process.env.LEAD_ENGINE_OUTREACH_DAILY_CAP?.trim() || "25") || 25)),
    analyzerDailyCap: Math.min(100, Math.max(10, Number(process.env.LEAD_ENGINE_ANALYZER_DAILY_CAP?.trim() || "50") || 50)),
    seedTarget: Math.max(100, Number(process.env.LEAD_ENGINE_SEED_TARGET?.trim() || "3000") || 3000),
    cities: citiesWithCountry.length ? citiesWithCountry : [{ city: "London", country: "GB" }],
  };
}

export type LeadQueryType = "restaurant" | "cafe" | "takeaway";

export const LEAD_QUERY_TYPES: LeadQueryType[] = ["restaurant", "cafe", "takeaway"];
