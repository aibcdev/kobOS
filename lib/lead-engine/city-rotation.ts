import { getLeadEngineConfig } from "@/lib/lead-engine/config";

/** Pick one city per calendar day (stable rotation). */
export function pickLeadCityForDate(date = new Date()): {
  city: string;
  country: "GB" | "IE";
} {
  const { cities } = getLeadEngineConfig();
  if (cities.length === 1) return cities[0]!;

  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return cities[dayOfYear % cities.length]!;
}

/** Iterate all cities for bulk seeding. */
export function* iterateLeadCities(): Generator<{ city: string; country: "GB" | "IE" }> {
  const { cities } = getLeadEngineConfig();
  for (const slot of cities) {
    yield slot;
  }
}

/** @deprecated Use pickLeadCityForDate — kept for seed script compat */
export function pickLeadDiscoverySlot(date = new Date()) {
  const slot = pickLeadCityForDate(date);
  return { ...slot, queryType: "restaurant" as const };
}

/** @deprecated Use iterateLeadCities */
export function* iterateLeadDiscoverySlots() {
  for (const { city, country } of iterateLeadCities()) {
    for (const queryType of ["restaurant", "cafe", "takeaway"] as const) {
      yield { city, country, queryType };
    }
  }
}
