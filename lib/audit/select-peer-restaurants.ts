import { prisma } from "@/lib/db/prisma";
import type { AuditCompetitor } from "@/lib/audit/types";
import { isLikelyChainRestaurant } from "@/lib/outbound/chain-denylist";
import { placesSearchNearbyRestaurants } from "@/lib/places/google-places-server";

/** Three is enough to feel like a market, few enough to read at a glance. */
export const PEER_TARGET_COUNT = 3;

/** Widen only when the closer ring cannot produce three genuine higher scorers. */
const RADIUS_STEPS_KM = [5, 15, 50] as const;

export type PeerSelectionInput = {
  city: string;
  lat?: number | null;
  lng?: number | null;
  /** Restaurant being audited — excluded from its own peer list. */
  excludeName: string;
  /** The subject's KOB score. Peers must match or beat it. */
  subjectScore: number | null;
};

function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function sameName(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function noteFor(rating: number | null, reviewCount: number | null): string {
  if (rating != null && reviewCount != null && reviewCount >= 50) {
    return `${rating.toFixed(1)}★ from ${reviewCount.toLocaleString()} Google reviews`;
  }
  if (rating != null) return `${rating.toFixed(1)}★ on Google`;
  return "Competing for the same local searches";
}

/**
 * Real, named local restaurants scoring at or above the subject.
 *
 * We only ever show restaurants that were actually measured, so the source of truth is
 * the pre-scan index (`npm run prescan:city`). If a city is thin we widen the radius —
 * nearby towns, then the region — before ever falling back to a listing-strength
 * estimate, and we never invent a name.
 */
export async function selectPeerRestaurants(
  input: PeerSelectionInput,
): Promise<AuditCompetitor[]> {
  const floor = input.subjectScore ?? 0;
  const city = input.city.trim();
  const hasCoords = input.lat != null && input.lng != null;

  const picked = new Map<string, AuditCompetitor>();
  const add = (peer: AuditCompetitor, key: string) => {
    if (picked.size >= PEER_TARGET_COUNT) return;
    if (sameName(peer.name, input.excludeName)) return;
    if (isLikelyChainRestaurant(peer.name, null)) return;
    if (!picked.has(key)) picked.set(key, peer);
  };

  // 1. Same city, measured, scoring at least as high — the honest comparison.
  try {
    const inCity = await prisma.restaurantScoreIndex.findMany({
      where: { city: { equals: city, mode: "insensitive" }, kobScore: { gte: floor } },
      orderBy: { kobScore: "asc" },
      take: 25,
    });
    // Closest above the subject reads as attainable rather than discouraging.
    for (const r of inCity) {
      add(
        {
          name: r.name,
          note: noteFor(r.rating, r.reviewCount),
          mockScore: r.kobScore,
          source: "index",
          scoreMeasured: true,
          rating: r.rating,
          reviewCount: r.reviewCount,
          photoCount: r.photoCount,
          websiteUrl: r.websiteUrl,
          ...(r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : {}),
          distanceKm:
            hasCoords && r.lat != null && r.lng != null
              ? Math.round(distanceKm(input.lat as number, input.lng as number, r.lat, r.lng) * 10) / 10
              : null,
        },
        r.placeId,
      );
    }
  } catch (e) {
    console.warn("[audit/peers] city index lookup failed", e);
  }

  // 2. Widen: nearby towns, then the region. Same measured bar, just further away.
  if (picked.size < PEER_TARGET_COUNT && hasCoords) {
    for (const km of RADIUS_STEPS_KM) {
      if (picked.size >= PEER_TARGET_COUNT) break;
      const degrees = km / 111;
      try {
        const nearby = await prisma.restaurantScoreIndex.findMany({
          where: {
            kobScore: { gte: floor },
            lat: { gte: (input.lat as number) - degrees, lte: (input.lat as number) + degrees },
            lng: { gte: (input.lng as number) - degrees, lte: (input.lng as number) + degrees },
          },
          orderBy: { kobScore: "asc" },
          take: 40,
        });
        const withDistance = nearby
          .map((r) => ({
            row: r,
            km:
              r.lat != null && r.lng != null
                ? distanceKm(input.lat as number, input.lng as number, r.lat, r.lng)
                : Number.POSITIVE_INFINITY,
          }))
          .filter((x) => x.km <= km)
          .sort((a, b) => a.km - b.km);

        for (const { row, km: d } of withDistance) {
          add(
            {
              name: row.name,
              note: `${noteFor(row.rating, row.reviewCount)} · ${row.city}`,
              mockScore: row.kobScore,
              source: "index",
              scoreMeasured: true,
              rating: row.rating,
              reviewCount: row.reviewCount,
              photoCount: row.photoCount,
              websiteUrl: row.websiteUrl,
              ...(row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : {}),
              distanceKm: Math.round(d * 10) / 10,
            },
            row.placeId,
          );
        }
      } catch (e) {
        console.warn("[audit/peers] radius lookup failed", e);
        break;
      }
    }
  }

  // 3. Last resort: real nearby listings we have not pre-scanned yet. Named and real,
  // but the score is listing strength only, so it is flagged as unmeasured.
  if (picked.size < PEER_TARGET_COUNT && hasCoords) {
    try {
      const places = await placesSearchNearbyRestaurants(
        input.lat as number,
        input.lng as number,
        input.excludeName,
        12,
        15000,
      );
      const ranked = places
        .filter((p) => p.rating != null)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      for (const p of ranked) {
        add(
          {
            name: p.name,
            note: noteFor(p.rating, p.userRatingCount),
            mockScore: listingStrengthScore(p.rating, p.userRatingCount, floor),
            source: "places",
            scoreMeasured: false,
            rating: p.rating,
            reviewCount: p.userRatingCount,
            photoCount: p.photoCount,
            websiteUrl: p.websiteUri,
            lat: p.lat,
            lng: p.lng,
            distanceKm:
              Math.round(distanceKm(input.lat as number, input.lng as number, p.lat, p.lng) * 10) / 10,
          },
          p.placeId,
        );
      }
    } catch (e) {
      console.warn("[audit/peers] places fallback failed", e);
    }
  }

  return [...picked.values()].sort((a, b) => a.mockScore - b.mockScore);
}

/**
 * Listing-only strength for a peer we have not pre-scanned. Kept at or just above the
 * subject so the comparison stays coherent, and never presented as a measured score.
 */
function listingStrengthScore(
  rating: number | null,
  reviewCount: number | null,
  floor: number,
): number {
  const base = rating != null ? rating * 18 : 68;
  const volumeBoost = reviewCount != null && reviewCount > 100 ? 4 : 0;
  const raw = Math.round(base + volumeBoost);
  return Math.min(97, Math.max(raw, floor + 1));
}
