import { placesAutocompleteNew, placesPlaceDetailsNew, type PlaceDetailsResult } from "@/lib/places/google-places-server";

/** True when the URL is a Google Maps short/share or maps.google.com place link. */
export function isGoogleMapsUrl(raw: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "maps.app.goo.gl" || host === "goo.gl") return true;
    if (host === "maps.google.com" || host === "google.com" || host.endsWith(".google.com")) {
      return u.pathname.includes("/maps") || u.searchParams.has("q");
    }
    return false;
  } catch {
    return false;
  }
}

/** Instagram / Facebook / Maps presence links owners often paste instead of a website. */
export function isNonWebsitePresenceUrl(raw: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (isGoogleMapsUrl(raw)) return true;
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return true;
    if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.com") return true;
    return false;
  } catch {
    return false;
  }
}

export function gbpPlaceholderWebsiteUrl(placeId: string, name?: string): string {
  const id = placeId.trim();
  if (id) {
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(id)}`;
  }
  const q = (name || "restaurant").trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function placeNameFromMapsPath(pathname: string): string | null {
  const m = pathname.match(/\/maps\/place\/([^/]+)/i);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1].replace(/\+/g, " ")).split(",")[0]?.trim() || null;
  } catch {
    return m[1].replace(/\+/g, " ").split(",")[0]?.trim() || null;
  }
}

/** Follow Maps short links and resolve to Places details when possible. */
export async function resolveGoogleMapsUrlToPlace(rawUrl: string): Promise<PlaceDetailsResult | null> {
  const normalized = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  if (!isGoogleMapsUrl(normalized)) return null;

  let finalUrl = normalized;
  try {
    const res = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KOBAudit/1.0)" },
    });
    if (res.url) finalUrl = res.url;
  } catch (e) {
    console.warn("[places] maps redirect failed", e);
  }

  let searchName = placeNameFromMapsPath(new URL(finalUrl).pathname);
  if (!searchName) {
    try {
      const q = new URL(finalUrl).searchParams.get("q");
      if (q) searchName = q.split(",")[0]?.trim() || q;
    } catch {
      /* ignore */
    }
  }
  if (!searchName || searchName.length < 2) return null;

  const suggestions = await placesAutocompleteNew(searchName);
  const top = suggestions[0];
  if (!top?.placeId) return null;
  return placesPlaceDetailsNew(top.placeId);
}
