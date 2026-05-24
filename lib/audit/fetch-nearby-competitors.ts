import type { AuditCompetitor } from "@/lib/audit/types";
import { placesSearchNearbyRestaurants } from "@/lib/places/google-places-server";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Map Google rating (0–5) to a 0–100 visibility-style score for bar charts. */
export function ratingToCompetitorScore(rating: number | null, userRatingCount: number | null): number {
  const base = rating != null ? rating * 18 : 68;
  const volumeBoost = userRatingCount != null && userRatingCount > 100 ? 4 : 0;
  return clamp(base + volumeBoost, 52, 94);
}

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic fallback when Places is unavailable. */
export function buildEstimatedCompetitors(city: string, seed: string): AuditCompetitor[] {
  const h = hashSeed(seed + city);
  const names = [
    `${city} Social Kitchen`,
    `North ${city} Table`,
    `The ${city} Cellar`,
    `Harbor ${city} Grill`,
    `Union ${city} Bistro`,
  ];
  const rotate = h % names.length;
  const picked = [...names.slice(rotate), ...names.slice(0, rotate)].slice(0, 4);
  return picked.map((name, i) => ({
    name,
    note: i === 0 ? "Strong Google profile presence" : "Aggressive local SEO pages",
    mockScore: clamp(68 + ((h + i * 7) % 22), 55, 91),
    source: "estimated" as const,
  }));
}

export async function fetchNearbyCompetitors(input: {
  lat: number;
  lng: number;
  excludeName: string;
  city: string;
  seed: string;
}): Promise<AuditCompetitor[]> {
  try {
    const nearby = await placesSearchNearbyRestaurants(input.lat, input.lng, input.excludeName, 4);
    if (nearby.length === 0) {
      return buildEstimatedCompetitors(input.city, input.seed);
    }

    return nearby.map((p) => ({
      name: p.name,
      note:
        p.rating != null && p.rating >= 4.3
          ? `${p.rating.toFixed(1)}★ on Google · strong local visibility`
          : "Competing for local search in your area",
      mockScore: ratingToCompetitorScore(p.rating, p.userRatingCount),
      source: "places" as const,
      lat: p.lat,
      lng: p.lng,
    }));
  } catch (e) {
    console.warn("[audit] fetchNearbyCompetitors", e);
    return buildEstimatedCompetitors(input.city, input.seed);
  }
}
