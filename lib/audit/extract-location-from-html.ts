/** Best-effort city + coordinates from JSON-LD / microdata in crawled HTML. */
export type HtmlGeoHint = {
  city: string | null;
  lat: number | null;
  lng: number | null;
  source: "json_ld" | "meta_geo";
};

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
      /* ignore malformed blocks */
    }
  }
  return out;
}

function localityFromAddress(addr: Record<string, unknown>): string | null {
  const city =
    (typeof addr.addressLocality === "string" && addr.addressLocality.trim()) ||
    (typeof addr.addressRegion === "string" && addr.addressRegion.trim()) ||
    null;
  return city ? city.slice(0, 80) : null;
}

function geoFromNode(node: Record<string, unknown>): { lat: number; lng: number } | null {
  const geo = node.geo;
  if (geo && typeof geo === "object") {
    const g = geo as Record<string, unknown>;
    const lat = typeof g.latitude === "number" ? g.latitude : Number(g.latitude);
    const lng = typeof g.longitude === "number" ? g.longitude : Number(g.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

function walkJsonLd(nodes: unknown[]): HtmlGeoHint | null {
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const o = node as Record<string, unknown>;
    const types = String(o["@type"] ?? "")
      .toLowerCase()
      .split(/\s+/);
    const isPlace =
      types.some((t) =>
        ["restaurant", "foodestablishment", "localbusiness", "organization", "store"].includes(t),
      ) || Boolean(o.address);

    if (!isPlace) {
      if (Array.isArray(o["@graph"])) {
        const nested = walkJsonLd(o["@graph"] as unknown[]);
        if (nested) return nested;
      }
      continue;
    }

    let city: string | null = null;
    const addr = o.address;
    if (addr && typeof addr === "object") {
      city = localityFromAddress(addr as Record<string, unknown>);
    }

    const geo = geoFromNode(o);
    if (city || geo) {
      return { city, lat: geo?.lat ?? null, lng: geo?.lng ?? null, source: "json_ld" };
    }
  }
  return null;
}

export function extractLocationFromHtml(html: string): HtmlGeoHint | null {
  const blocks = parseJsonLdBlocks(html);
  const fromLd = walkJsonLd(blocks);
  if (fromLd) return fromLd;

  const geoPos = html.match(/<meta[^>]+name=["']geo\.position["'][^>]+content=["']([^"']+)["']/i);
  if (geoPos?.[1]) {
    const [latS, lngS] = geoPos[1].split(";");
    const lat = Number.parseFloat(latS ?? "");
    const lng = Number.parseFloat(lngS ?? "");
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { city: null, lat, lng, source: "meta_geo" };
    }
  }
  return null;
}
