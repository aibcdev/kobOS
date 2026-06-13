import { auditPlacesRegionCodes } from "@/lib/places/audit-places-config";

export async function detectLocationCount(
  name: string,
  city: string,
  websiteUrl: string | null,
  country: "GB" | "IE" = "GB",
): Promise<number> {
  let fromPlaces = 0;
  let fromWebsite = 0;

  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (key) {
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
  }

  if (websiteUrl) {
    try {
      const res = await fetch(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`, {
        headers: { "User-Agent": "KOB-LeadEngine/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const html = await res.text();
        const locationLinks = (
          html.match(/href=["'][^"']*(?:\/locations?|\/find-us|\/branches)[^"']*["']/gi) ?? []
        ).length;
        const addressBlocks = (html.match(/\b(postcode|post code|zip)[:\s]/gi) ?? []).length;
        fromWebsite = Math.max(locationLinks, Math.min(3, addressBlocks));
        if (/\b(our locations|multiple locations|find a restaurant)\b/i.test(html)) {
          fromWebsite = Math.max(fromWebsite, 2);
        }
      }
    } catch {
      /* ignore */
    }
  }

  const count = Math.max(fromPlaces, fromWebsite, 1);
  return Math.min(count, 10);
}
