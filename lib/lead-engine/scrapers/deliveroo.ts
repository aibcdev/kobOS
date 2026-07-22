import type { PlatformListing } from "@/lib/lead-engine/scrapers/types";
import { cityLatLngGrid, citySlug } from "@/lib/lead-engine/scrapers/uk-postcodes";
import { extractNextDataJson, fetchHtml } from "@/lib/lead-engine/scrapers/fetch-html";
import { fetchRenderedHtml } from "@/lib/lead-engine/scrapers/playwright-fetch";
import { randomUUID } from "node:crypto";

function deliverooCookieHeader(): string {
  const guid = randomUUID();
  return `roo_guid=${guid}`;
}

function encodeGeohash(lat: number, lng: number): string {
  const chars = "0123456789bcdefghjkmnpqrstuvwxyz";
  let minLat = -90,
    maxLat = 90,
    minLng = -180,
    maxLng = 180;
  let hash = "";
  let bit = 0;
  let ch = 0;
  let even = true;
  while (hash.length < 9) {
    if (even) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch |= 1 << (4 - bit);
        minLng = mid;
      } else maxLng = mid;
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        minLat = mid;
      } else maxLat = mid;
    }
    even = !even;
    if (bit < 4) bit++;
    else {
      hash += chars[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

type RooBlock = {
  typeName?: string;
  data?: Record<string, string>;
};

function parsePartnerA11y(label: string): {
  name: string;
  rating: number | null;
  reviewCount: number | null;
} {
  const name = label.split(/\.\s+\d/)[0]?.trim() || label.split(".")[0]?.trim() || "";
  const ratingMatch = label.match(/Rated\s+([\d.]+)/i);
  const countMatch = label.match(/from\s+([\d,]+)\+?\s+reviews/i);
  let reviewCount: number | null = null;
  if (countMatch) {
    const raw = Number(countMatch[1]!.replace(/\D/g, ""));
    reviewCount = /\+/.test(countMatch[0]!) ? Math.max(raw, 500) : raw;
  }
  return {
    name,
    rating: ratingMatch ? Number(ratingMatch[1]) : null,
    reviewCount,
  };
}

function parsePartnerAction(action: string): {
  drnId: string | null;
  href: string | null;
  branchType: string | null;
} {
  const params = new URLSearchParams(action.split("?").pop() ?? "");
  return {
    drnId: params.get("partner_drn_id"),
    href: params.get("restaurant_href"),
    branchType: params.get("navigate_to_restaurant_branch_type"),
  };
}

function collectRooBlocks(data: unknown): RooBlock[] {
  const out: RooBlock[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const obj = node as RooBlock;
    if (obj.typeName === "UIRooBlock" && obj.data) out.push(obj);
    for (const value of Object.values(node as Record<string, unknown>)) walk(value);
  };
  walk(data);
  return out;
}

async function fetchDeliverooHtml(url: string): Promise<string | null> {
  const cookie = deliverooCookieHeader();
  const html = await fetchHtml(url, 18_000, { Cookie: cookie });
  if (html && html.includes("UIRooBlock")) return html;

  const rendered = await fetchRenderedHtml(url, 3500);
  return rendered ?? html;
}

export function parseDeliverooHtml(
  html: string,
  city: string,
  geohash: string,
): PlatformListing[] {
  const nextData = extractNextDataJson(html);
  if (!nextData) return [];

  const blocks = collectRooBlocks(nextData);
  const restaurants = blocks
    .map((block) => {
      const action = block.data?.["partner-card.action"];
      const a11y = block.data?.["partner-card.accessibility.screen-reader"];
      if (!action || !a11y) return null;
      const { drnId, href, branchType } = parsePartnerAction(action);
      if (!drnId || branchType !== "restaurant") return null;
      const parsed = parsePartnerA11y(a11y);
      if (!parsed.name || parsed.name.length < 2) return null;
      return {
        id: drnId,
        name: parsed.name,
        rating: parsed.rating,
        reviewCount: parsed.reviewCount,
        url: href ? `https://deliveroo.co.uk${decodeURIComponent(href)}` : null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const total = restaurants.length;
  if (!total) return [];

  return restaurants.map((r, idx) => {
    const rank = idx + 1;
    return {
      platform: "deliveroo" as const,
      platformId: r.id,
      name: r.name,
      city,
      country: "GB" as const,
      rank,
      totalInRegion: total,
      rankPercentile: rank / total,
      platformRegion: geohash,
      rating: r.rating,
      reviewCount: r.reviewCount,
      url: r.url,
      address: null,
      isBrand: false,
    };
  });
}

export async function scrapeDeliverooForCity(
  city: string,
  country: "GB" | "IE" = "GB",
): Promise<PlatformListing[]> {
  if (country === "IE") return [];
  const slug = citySlug(city);
  const grid = cityLatLngGrid(city);
  const limit = Math.max(
    1,
    Number(process.env.LEAD_ENGINE_DR_GEOHASH_LIMIT?.trim() || "3") || 3,
  );
  const out: PlatformListing[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < Math.min(grid.length, limit); i++) {
    const { lat, lng } = grid[i]!;
    if (i > 0) await sleep(1200);
    const geohash = encodeGeohash(lat, lng);
    const url = `https://deliveroo.co.uk/restaurants/${slug}/${slug}?geohash=${geohash}&collection=all-restaurants`;
    const html = await fetchDeliverooHtml(url);
    if (!html) continue;

    for (const listing of parseDeliverooHtml(html, city, geohash)) {
      const key = listing.platformId;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(listing);
    }
  }

  return out;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
