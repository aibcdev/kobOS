import type { AuditResultPayload } from "@/lib/audit/types";
import { isLikelyChainRestaurant } from "@/lib/outbound/chain-denylist";

/** Names that must never appear as owner-facing benchmark anchors. */
const FORBIDDEN_ANCHOR_PATTERNS = [
  /\bmcdonald'?s?\b/i,
  /\bburger king\b/i,
  /\bkfc\b/i,
  /\bstarbucks\b/i,
  /\bsubway\b/i,
  /\bdomino'?s\b/i,
  /\bpizza hut\b/i,
  /\bnando'?s\b/i,
  /\bwagamama\b/i,
  /\bdishoom\b/i,
  /\bshake shack\b/i,
  /\bfive guys\b/i,
  /\bchipotle\b/i,
  /\bwetherspoon\b/i,
  /\bpret a manger\b/i,
  /\bpret\b/i,
  /\bcosta coffee\b/i,
  /\bpizza express\b/i,
  /\bzizzi\b/i,
  /\bharvester\b/i,
  /\btoby carvery\b/i,
  /\bbeefeater\b/i,
];

export const PEER_TIER_DESCRIPTION =
  "UK hospitality groups with roughly 10–30 sites — established, digitally polished, sometimes with light international expansion — not global mega-chains.";

const CURATED_FALLBACKS: Record<string, string[]> = {
  burger: ["Honest Burgers", "Patty & Bun", "GBK"],
  pizza: ["Franco Manca", "Pizza Pilgrims", "Homeslice"],
  coffee: ["Origin Coffee", "Workshop Coffee", "Notes Coffee"],
  asian: ["Rosa's Thai", "Banh Mi Bay", "Tonkotsu"],
  general: ["Modern UK multi-site group (10–20 sites)", "Regional independent with strong digital"],
};

function inferCuisineHint(name: string, websiteUrl: string | null): string {
  const text = `${name} ${websiteUrl ?? ""}`.toLowerCase();
  if (/\b(burger|grill|smoke|pit|bbq)\b/.test(text)) return "burger";
  if (/\b(pizza|pizzeria|slice)\b/.test(text)) return "pizza";
  if (/\b(coffee|café|cafe|espresso|roast)\b/.test(text)) return "coffee";
  if (/\b(thai|sushi|ramen|asian|wok|dim sum)\b/.test(text)) return "asian";
  return "general";
}

export function isForbiddenBenchmarkAnchor(name: string): boolean {
  const t = name.trim();
  if (!t) return true;
  if (isLikelyChainRestaurant(t, null)) return true;
  return FORBIDDEN_ANCHOR_PATTERNS.some((re) => re.test(t));
}

export function sanitizeBenchmarkAnchors(
  anchors: string[],
  suggestedAnchors: string[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  function push(name: string) {
    const t = name.trim();
    if (!t || isForbiddenBenchmarkAnchor(t)) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t.slice(0, 120));
  }

  for (const a of anchors) push(a);
  for (const a of suggestedAnchors) {
    if (out.length >= 4) break;
    push(a);
  }

  if (out.length < 2) {
    for (const a of CURATED_FALLBACKS.general) {
      if (out.length >= 2) break;
      push(a);
    }
  }

  return out.slice(0, 6);
}

export type PeerBenchmarkContext = {
  tierDescription: string;
  nearbyPeerNames: string[];
  suggestedAnchors: string[];
  peerBenchmarkRule: string;
};

export function buildPeerBenchmarkContext(payload: AuditResultPayload): PeerBenchmarkContext {
  const restaurantName = payload.evidencePack?.restaurantName ?? "Your restaurant";
  const websiteUrl = payload.evidencePack?.websiteUrl ?? null;
  const cuisine = inferCuisineHint(restaurantName, websiteUrl);

  const nearbyPeerNames = payload.competitors
    .filter((c) => c.source === "places" && !isForbiddenBenchmarkAnchor(c.name))
    .map((c) => c.name)
    .slice(0, 4);

  const fallbackPeers = CURATED_FALLBACKS[cuisine] ?? CURATED_FALLBACKS.general;
  const suggestedAnchors = sanitizeBenchmarkAnchors(nearbyPeerNames, fallbackPeers);

  return {
    tierDescription: PEER_TIER_DESCRIPTION,
    nearbyPeerNames,
    suggestedAnchors,
    peerBenchmarkRule:
      "Compare to aspirational peers (10–30 site UK groups or strong nearby independents). Never cite global mega-chains (McDonald's, Burger King, KFC, Starbucks, Dishoom, Nando's, etc.) in benchmarkAnchors or owner-facing copy.",
  };
}
