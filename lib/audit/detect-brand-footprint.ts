/**
 * Detect brand scale (location count / chain vs independent) for Opportunity Report.
 * Three passes with different strategies; reconcile to reduce single-pass mistakes.
 */

export type BrandFootprint = {
  locations: number;
  isChain: boolean;
  isIndependent: boolean;
  /** Prefer null for multi-site — avoids pinning the wrong city from one Places hit. */
  displayCity: string | null;
  confidence: "high" | "medium" | "low";
  sources: string[];
};

function normalizeBrand(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(restaurant|bar|cafe|café|kitchen|ltd|limited|uk)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseLocationHintsFromHtml(html: string): number {
  let n = 0;
  const countMatch = html.match(
    /(\d{1,3})\+?\s*(?:restaurants?|locations?|venues?|sites|branches)/i,
  );
  if (countMatch?.[1]) n = Math.max(n, Number(countMatch[1]));

  const across = html.match(
    /across\s+(\d{1,3})\+?\s*(?:restaurants?|locations?|venues?)/i,
  );
  if (across?.[1]) n = Math.max(n, Number(across[1]));

  if (/\b(our locations|find (a |your )?restaurant|multiple locations|all locations)\b/i.test(html)) {
    n = Math.max(n, 3);
  }

  const locationLinks = (html.match(/href=["'][^"']*(?:\/locations?\/?|\/find-us|\/restaurants\/)[^"']*["']/gi) ?? [])
    .length;
  if (locationLinks >= 5) n = Math.max(n, Math.min(40, locationLinks));
  else if (locationLinks >= 2) n = Math.max(n, 3);

  return n;
}

async function fetchWebsiteHtml(websiteUrl: string | null): Promise<string | null> {
  if (!websiteUrl?.trim()) return null;
  try {
    const href = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
    const origin = new URL(href).origin;
    const pages = [href, `${origin}/locations`, `${origin}/find-us`, `${origin}/restaurants`];
    let best = 0;
    let bestHtml: string | null = null;
    for (const url of pages.slice(0, 3)) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "KOB-Audit/1.0" },
          signal: AbortSignal.timeout(10_000),
          redirect: "follow",
        });
        if (!res.ok) continue;
        const html = await res.text();
        const hint = parseLocationHintsFromHtml(html);
        if (hint > best || !bestHtml) {
          best = hint;
          bestHtml = html;
        }
        if (hint >= 10) break;
      } catch {
        /* try next */
      }
    }
    return bestHtml;
  } catch {
    return null;
  }
}

async function placesLocationCount(
  name: string,
  city: string | null,
  mode: "with_city" | "brand_only",
): Promise<number> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return 0;

  const textQuery =
    mode === "with_city" && city?.trim()
      ? `"${name}" ${city}`.slice(0, 200)
      : `"${name}" restaurant UK`.slice(0, 200);

  try {
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
        maxResultCount: 20,
        regionCode: "GB",
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as {
      places?: Array<{ displayName?: { text?: string }; formattedAddress?: string }>;
    };
    const norm = normalizeBrand(name).replace(/\s/g, "");
    const addresses = new Set<string>();
    for (const p of json.places ?? []) {
      const n = normalizeBrand(p.displayName?.text ?? "").replace(/\s/g, "");
      if (!n || (n.length >= 4 && !n.includes(norm.slice(0, 6)) && !norm.includes(n.slice(0, 6)))) {
        continue;
      }
      const addr = (p.formattedAddress ?? "").toLowerCase().replace(/\s+/g, " ").trim();
      if (addr) addresses.add(addr);
    }
    return addresses.size;
  } catch {
    return 0;
  }
}

function footprintFromParts(input: {
  fromPlaces: number;
  fromWebsite: number;
  city: string;
  pass: 1 | 2 | 3;
}): BrandFootprint {
  const locations = Math.min(80, Math.max(1, Math.max(input.fromPlaces, input.fromWebsite, 1)));
  const isChain = locations >= 6 || input.fromWebsite >= 6 || input.fromPlaces >= 6;
  const isIndependent = !isChain && locations <= 5;
  const sources: string[] = [];
  if (input.fromPlaces > 0) sources.push(`places:${input.fromPlaces}`);
  if (input.fromWebsite > 0) sources.push(`website:${input.fromWebsite}`);

  let confidence: BrandFootprint["confidence"] = "low";
  if (input.fromWebsite >= 6 || (input.fromPlaces >= 4 && input.fromWebsite >= 2)) confidence = "high";
  else if (input.fromPlaces >= 2 || input.fromWebsite >= 2) confidence = "medium";

  const displayCity =
    locations >= 3 || isChain ? null : input.city.trim() || null;

  return {
    locations,
    isChain,
    isIndependent,
    displayCity,
    confidence,
    sources: [...sources, `pass:${input.pass}`],
  };
}

/** Single detection pass (strategy varies by pass number). */
export async function detectBrandFootprintPass(
  meta: { name: string; city: string; websiteUrl?: string | null },
  pass: 1 | 2 | 3,
): Promise<BrandFootprint> {
  const html = pass === 2 ? null : await fetchWebsiteHtml(meta.websiteUrl ?? null);
  const fromWebsite = html ? parseLocationHintsFromHtml(html) : 0;

  let fromPlaces = 0;
  if (pass === 1) {
    fromPlaces = await placesLocationCount(meta.name, meta.city, "with_city");
  } else if (pass === 2) {
    fromPlaces = await placesLocationCount(meta.name, null, "brand_only");
  } else {
    const [a, b] = await Promise.all([
      placesLocationCount(meta.name, meta.city, "with_city"),
      placesLocationCount(meta.name, null, "brand_only"),
    ]);
    fromPlaces = Math.max(a, b);
    // Re-fetch website on pass 3 if earlier missed
    if (fromWebsite < 3) {
      const html3 = await fetchWebsiteHtml(meta.websiteUrl ?? null);
      const w3 = html3 ? parseLocationHintsFromHtml(html3) : 0;
      return footprintFromParts({
        fromPlaces,
        fromWebsite: Math.max(fromWebsite, w3),
        city: meta.city,
        pass,
      });
    }
  }

  return footprintFromParts({ fromPlaces, fromWebsite, city: meta.city, pass });
}

/** Run three passes and reconcile — prefer upper location count when signals agree on multi-site. */
export async function detectBrandFootprintTriple(meta: {
  name: string;
  city: string;
  websiteUrl?: string | null;
}): Promise<BrandFootprint> {
  const passes = await Promise.all([
    detectBrandFootprintPass(meta, 1),
    detectBrandFootprintPass(meta, 2),
    detectBrandFootprintPass(meta, 3),
  ]);
  return reconcileBrandFootprintPasses(passes, meta.city);
}

export function reconcileBrandFootprintPasses(
  passes: BrandFootprint[],
  fallbackCity: string,
): BrandFootprint {
  const locCounts = passes.map((p) => p.locations).sort((a, b) => a - b);
  const median = locCounts[Math.floor(locCounts.length / 2)] ?? 1;
  const max = locCounts[locCounts.length - 1] ?? 1;
  const multiVotes = passes.filter((p) => p.locations >= 3 || p.isChain).length;

  const locations = multiVotes >= 2 ? Math.max(median, max) : median;
  const isChain = passes.filter((p) => p.isChain).length >= 2 || locations >= 6;
  const confidence =
    passes.filter((p) => p.confidence === "high").length >= 1
      ? "high"
      : passes.filter((p) => p.confidence !== "low").length >= 2
        ? "medium"
        : "low";

  return {
    locations: Math.min(80, Math.max(1, locations)),
    isChain,
    isIndependent: !isChain && locations <= 5,
    displayCity: locations >= 3 || isChain ? null : fallbackCity.trim() || null,
    confidence,
    sources: passes.flatMap((p) => p.sources),
  };
}
