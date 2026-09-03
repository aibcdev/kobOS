/**
 * Guest-facing signals parsed from restaurant HTML.
 * Used when Google Places is missing and to score whether the site actually helps someone book/order.
 */

export type OnPageGuestSignals = {
  hasOpeningHours: boolean;
  hasAddressOrDirections: boolean;
  hasMenuPath: boolean;
  reviewWidgetDetected: boolean;
  mapsPlaceIds: string[];
  aggregateRating: number | null;
  aggregateReviewCount: number | null;
};

const HOURS_RE =
  /\b(opening hours|open(?:ing)? times|hours of operation|mon(?:day)?[\s–-]+(?:sun|fri)|we are open|opens at)\b/i;
const ADDRESS_RE =
  /\b(directions|find us|our (?:address|location)|street|road|lane|avenue|postcode|zip code|google maps|maps\.google|goo\.gl\/maps)\b/i;
const MENU_RE = /\b(view menu|full menu|our menu|food menu|menus?|order from the menu)\b/i;
const REVIEW_WIDGET_RE =
  /tripadvisor|trustpilot|yelp\.com|google\.com\/maps.*reviews|reviews\.io|feefo|opentable\.com\/reviews/i;

function parseJsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      /* ignore */
    }
  }
  return out;
}

function walkNodes(nodes: unknown[], visit: (o: Record<string, unknown>) => void) {
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const o = node as Record<string, unknown>;
    visit(o);
    if (Array.isArray(o["@graph"])) walkNodes(o["@graph"] as unknown[], visit);
  }
}

function extractAggregateRating(html: string): { rating: number | null; count: number | null } {
  let rating: number | null = null;
  let count: number | null = null;
  walkNodes(parseJsonLdBlocks(html), (o) => {
    const agg = o.aggregateRating;
    if (!agg || typeof agg !== "object") return;
    const a = agg as Record<string, unknown>;
    const r = typeof a.ratingValue === "number" ? a.ratingValue : Number(a.ratingValue);
    const c = typeof a.reviewCount === "number" ? a.reviewCount : Number(a.reviewCount ?? a.ratingCount);
    if (Number.isFinite(r) && r > 0 && r <= 5) rating = r;
    if (Number.isFinite(c) && c > 0) count = c;
  });
  return { rating, count };
}

/** Google Place IDs embedded in Maps links or schema. */
export function extractMapsPlaceIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  const patterns = [
    /query_place_id=([A-Za-z0-9_-]{20,})/gi,
    /place_id[=:]([A-Za-z0-9_-]{20,})/gi,
    /q=place_id:([A-Za-z0-9_-]{20,})/gi,
    /["'](ChIJ[A-Za-z0-9_-]{20,})["']/g,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const id = m[1];
      if (id && (id.startsWith("ChIJ") || id.startsWith("GhIJ") || id.length >= 22)) {
        ids.add(id.slice(0, 128));
      }
    }
  }
  return [...ids].slice(0, 6);
}

export function extractOnPageGuestSignals(html: string): OnPageGuestSignals {
  const { rating, count } = extractAggregateRating(html);
  return {
    hasOpeningHours: HOURS_RE.test(html),
    hasAddressOrDirections: ADDRESS_RE.test(html),
    hasMenuPath: MENU_RE.test(html),
    reviewWidgetDetected: REVIEW_WIDGET_RE.test(html),
    mapsPlaceIds: extractMapsPlaceIdsFromHtml(html),
    aggregateRating: rating,
    aggregateReviewCount: count,
  };
}

export function emptyOnPageGuestSignals(): OnPageGuestSignals {
  return {
    hasOpeningHours: false,
    hasAddressOrDirections: false,
    hasMenuPath: false,
    reviewWidgetDetected: false,
    mapsPlaceIds: [],
    aggregateRating: null,
    aggregateReviewCount: null,
  };
}

export function mergeOnPageGuestSignals(items: OnPageGuestSignals[]): OnPageGuestSignals {
  if (items.length === 0) return emptyOnPageGuestSignals();
  if (items.length === 1) return items[0];
  const ratings = items.map((i) => i.aggregateRating).filter((n): n is number => n != null);
  const counts = items.map((i) => i.aggregateReviewCount).filter((n): n is number => n != null);
  const ids = new Set<string>();
  for (const i of items) for (const id of i.mapsPlaceIds) ids.add(id);
  return {
    hasOpeningHours: items.some((i) => i.hasOpeningHours),
    hasAddressOrDirections: items.some((i) => i.hasAddressOrDirections),
    hasMenuPath: items.some((i) => i.hasMenuPath),
    reviewWidgetDetected: items.some((i) => i.reviewWidgetDetected),
    mapsPlaceIds: [...ids].slice(0, 6),
    aggregateRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    aggregateReviewCount: counts.length ? Math.max(...counts) : null,
  };
}
