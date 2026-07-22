import { cityCenter } from "@/lib/lead-engine/scrapers/uk-postcodes";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

type UberLocation = {
  address: string;
  reference: string;
  referenceType: string;
  latitude: number;
  longitude: number;
};

export type UberStoreHit = {
  uuid: string;
  title: string;
  ratingValue: number | null;
  reviewCount: number | null;
  actionUrl: string | null;
};

function sessionCookie(): string {
  return process.env.UBER_EATS_SESSION_COOKIE?.trim() ?? "";
}

async function warmCookie(): Promise<string> {
  const extra = sessionCookie();
  try {
    const warm = await fetch("https://www.ubereats.com/gb", {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    const base = warm.headers.getSetCookie?.().map((c) => c.split(";")[0]).join("; ") ?? "";
    return [base, extra].filter(Boolean).join("; ");
  } catch {
    return extra;
  }
}

function apiHeaders(cookie: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "User-Agent": BROWSER_UA,
    "x-csrf-token": "x",
    Accept: "application/json",
    Cookie: cookie,
    Origin: "https://www.ubereats.com",
    Referer: "https://www.ubereats.com/gb/feed",
  };
}

async function mapsSearch(
  cookie: string,
  query: string,
  country: "GB" | "IE",
): Promise<UberLocation | null> {
  const locale = country === "IE" ? "en-IE" : "en-GB";
  try {
    const res = await fetch(`https://www.ubereats.com/_p/api/mapsSearchV1?localeCode=${locale}`, {
      method: "POST",
      headers: apiHeaders(cookie),
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      data?: Array<{
        id?: string;
        provider?: string;
        addressLine1?: string;
        addressLine2?: string;
      }>;
    };
    const hit = json.data?.[0];
    if (!hit?.id || !hit.provider) return null;

    return {
      address: `${hit.addressLine1 ?? ""}, ${hit.addressLine2 ?? ""}`.replace(/^,\s*/, ""),
      reference: hit.id,
      referenceType: hit.provider,
      latitude: 0,
      longitude: 0,
    };
  } catch {
    return null;
  }
}

function buildCacheKeys(location: UberLocation): string[] {
  const encoded = encodeURIComponent(JSON.stringify(location));
  return [
    Buffer.from(encoded, "utf8").toString("base64"),
    Buffer.from(`${encoded}/DELIVERY///0/0//JTVCJTVE/undefined//////HOME///////`, "utf8").toString(
      "base64",
    ),
  ];
}

function parseStoresMap(data: unknown): UberStoreHit[] {
  const root = data as {
    data?: {
      storesMap?: Record<
        string,
        {
          uuid?: string;
          title?: string;
          rating?: { ratingValue?: number; reviewCount?: string | number };
          actionUrl?: string;
        }
      >;
    };
  };

  const out: UberStoreHit[] = [];
  for (const store of Object.values(root.data?.storesMap ?? {})) {
    if (!store?.title || !store.uuid) continue;
    out.push({
      uuid: store.uuid,
      title: store.title,
      ratingValue: store.rating?.ratingValue ?? null,
      reviewCount: store.rating?.reviewCount
        ? Number(String(store.rating.reviewCount).replace(/\D/g, "")) || null
        : null,
      actionUrl: store.actionUrl ?? null,
    });
  }
  return out;
}

async function fetchFeed(
  cookie: string,
  location: UberLocation,
  country: "GB" | "IE",
): Promise<UberStoreHit[]> {
  const locale = country === "IE" ? "en-IE" : "en-GB";
  for (const cacheKey of buildCacheKeys(location)) {
    try {
      const res = await fetch(`https://www.ubereats.com/_p/api/getFeedV1?localeCode=${locale}`, {
        method: "POST",
        headers: apiHeaders(cookie),
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({
          cacheKey,
          feedSessionCount: { announcementCount: 0, announcementLabel: "" },
          userQuery: "",
          date: "",
          startTime: 0,
          endTime: 0,
          sortAndFilters: [],
          isUserInitiatedRefresh: false,
          billboardUuid: "",
          feedProvider: "HOME",
          promotionUuid: "",
          targetingStoreTag: "",
          venueUUID: "",
          selectedSectionUUID: "",
          favorites: "",
          vertical: "",
          searchSource: "",
          searchType: "",
          keyName: "",
          serializedRequestContext: "",
          carouselId: "",
        }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const stores = parseStoresMap(json);
      if (stores.length) return stores;
    } catch {
      continue;
    }
  }
  return [];
}

/** Uber feed via official web API (mapsSearch + getFeedV1). Set UBER_EATS_SESSION_COOKIE if feed is empty. */
export async function fetchUberFeedForLocation(
  postcode: string,
  city: string,
  country: "GB" | "IE" = "GB",
): Promise<UberStoreHit[]> {
  const cookie = await warmCookie();
  const query = `${postcode} ${city}`;
  const located = await mapsSearch(cookie, query, country);
  if (!located) return [];

  const center = cityCenter(city);
  located.latitude = center.lat;
  located.longitude = center.lng;

  return fetchFeed(cookie, located, country);
}
