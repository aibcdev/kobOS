import { auditPlacesRegionCodes } from "@/lib/places/audit-places-config";

function skipPlacesLocations(): boolean {
  if (process.env.LEAD_ENGINE_SKIP_PLACES_LOCATIONS?.trim() === "1") return true;
  // Places key currently 401s in this workspace — don't burn time on it in fast mode.
  return process.env.LEAD_ENGINE_FAST_ANALYZE?.trim() !== "0";
}

/**
 * Estimate site count. Caps at 10 for storage; callers hard-DQ above locationMax (≤5).
 * Fast mode: website signals only (skips Places). Pass `preloadedHtml` to avoid a second fetch.
 */
export async function detectLocationCount(
  name: string,
  city: string,
  websiteUrl: string | null,
  country: "GB" | "IE" = "GB",
  preloadedHtml?: string | null,
): Promise<number> {
  let fromPlaces = 0;
  let fromWebsite = 0;

  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (key && !skipPlacesLocations()) {
    try {
      const textQuery = `"${name}" ${city}`.slice(0, 200);
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress",
        },
        body: JSON.stringify({
          textQuery,
          languageCode: "en",
          maxResultCount: 10,
          regionCode: country === "IE" ? "IE" : auditPlacesRegionCodes()[0] ?? "GB",
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          places?: Array<{ displayName?: { text?: string }; formattedAddress?: string }>;
        };
        const norm = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const addresses = new Set<string>();
        for (const p of json.places ?? []) {
          const n = (p.displayName?.text ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
          if (!n.includes(norm.slice(0, 8)) && !norm.includes(n.slice(0, 8))) continue;
          const addr = (p.formattedAddress ?? "").toLowerCase();
          if (addr) addresses.add(addr);
        }
        fromPlaces = addresses.size;
      }
    } catch {
      /* ignore Places failures */
    }
  }

  let html = preloadedHtml ?? "";
  if (!html && websiteUrl) {
    try {
      const res = await fetch(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`, {
        headers: { "User-Agent": "KOB-LeadEngine/1.0" },
        signal: AbortSignal.timeout(6_000),
      });
      if (res.ok) html = await res.text();
    } catch {
      /* ignore */
    }
  }

  if (html) {
    const locationLinks = (
      html.match(/href=["'][^"']*(?:\/locations?|\/find-us|\/branches|\/our-restaurants)[^"']*["']/gi) ?? []
    ).length;
    const addressBlocks = (html.match(/\b(postcode|post code|zip)[:\s]/gi) ?? []).length;
    fromWebsite = Math.max(locationLinks, Math.min(4, addressBlocks));
    if (/\b(our locations|multiple locations|find a restaurant|all locations)\b/i.test(html)) {
      fromWebsite = Math.max(fromWebsite, 2);
    }
    const locCountMatch = html.match(/\b(\d+)\s+(?:locations|restaurants|venues|sites)\b/i);
    if (locCountMatch) {
      const n = Number(locCountMatch[1]);
      if (Number.isFinite(n) && n >= 1) fromWebsite = Math.max(fromWebsite, Math.min(10, n));
    }
  }

  const count = Math.max(fromPlaces, fromWebsite, 1);
  return Math.min(count, 10);
}
