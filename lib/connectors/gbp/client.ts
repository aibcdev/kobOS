import { ConnectorError } from "@/lib/connectors/errors";

/**
 * Google Business Profile. Accounts, locations and the listing itself (hours, profile) use the v1 Account Management
 * / Business Information APIs; reviews, photos and posts are still only on My Business v4.
 */
export const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";

const ACCOUNTS = "https://mybusinessaccountmanagement.googleapis.com/v1";
const INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";
const V4 = "https://mybusiness.googleapis.com/v4";

export type GbpStar = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" | "STAR_RATING_UNSPECIFIED";

export type GbpReview = {
  /** accounts/{a}/locations/{l}/reviews/{r} */
  name: string;
  reviewId: string;
  reviewer?: { displayName?: string; isAnonymous?: boolean };
  starRating: GbpStar;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
};

export type GbpLocation = { name: string; title: string; address: string | null };

export type GbpTime = { hours?: number; minutes?: number };
export type GbpPeriod = { openDay: string; openTime?: GbpTime; closeDay: string; closeTime?: GbpTime };
export type GbpDate = { year: number; month: number; day: number };
export type GbpSpecialPeriod = { startDate: GbpDate; endDate?: GbpDate; openTime?: GbpTime; closeTime?: GbpTime; closed?: boolean };

/** The parts of a v1 Location KOB reads and may change. */
export type GbpListing = {
  name: string;
  title?: string;
  websiteUri?: string;
  regularHours?: { periods?: GbpPeriod[] };
  specialHours?: { specialHourPeriods?: GbpSpecialPeriod[] };
  categories?: { primaryCategory?: { displayName?: string }; additionalCategories?: { displayName?: string }[] };
  profile?: { description?: string };
  metadata?: { placeId?: string; newReviewUri?: string; mapsUri?: string };
};

export type GbpMediaItem = { name: string; createTime?: string; mediaFormat?: string };
export type GbpLocalPost = {
  name: string;
  summary?: string;
  state?: "LOCAL_POST_STATE_UNSPECIFIED" | "REJECTED" | "LIVE" | "PROCESSING";
  topicType?: string;
  createTime?: string;
  updateTime?: string;
};

export const LISTING_READ_MASK = "name,title,websiteUri,regularHours,specialHours,categories,profile,metadata";

/** `accounts/1/locations/2` → { account: "accounts/1", location: "locations/2" }; null when it isn't one. */
export function parseLocationName(name: string): { account: string; location: string } | null {
  const m = /^(accounts\/[^/]+)\/(locations\/[^/]+)$/.exec(name);
  return m ? { account: m[1], location: m[2] } : null;
}

export type Fetch = typeof fetch;

const STARS: Record<GbpStar, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, STAR_RATING_UNSPECIFIED: 0 };
export const starsOf = (s: GbpStar) => STARS[s] ?? 0;

/** `accounts/1/locations/2/reviews/3` → its parts; null when it isn't one. */
export function parseReviewName(name: string): { account: string; location: string; review: string } | null {
  const m = /^accounts\/([^/]+)\/locations\/([^/]+)\/reviews\/([^/]+)$/.exec(name);
  return m ? { account: `accounts/${m[1]}`, location: `locations/${m[2]}`, review: m[3] } : null;
}

export function gbpClient(accessToken: string, f: Fetch = fetch) {
  async function call<T>(method: "GET" | "PUT" | "PATCH" | "POST", url: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await f(url, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      throw new ConnectorError("NETWORK", e instanceof Error ? e.message : "GBP unreachable");
    }
    if (res.ok) return (await res.json().catch(() => ({}))) as T;
    const err = (await res.json().catch(() => null)) as { error?: { status?: string; message?: string } } | null;
    const msg = err?.error?.message ?? `GBP ${res.status}`;
    const code = err?.error?.status;
    if (res.status === 401 || res.status === 403) throw new ConnectorError("AUTH", msg, res.status, code);
    if (res.status === 404) throw new ConnectorError("NOT_FOUND", msg, res.status, code);
    if (res.status === 429) {
      const after = Number(res.headers.get("retry-after"));
      throw new ConnectorError("RATE_LIMIT", msg, res.status, code, Number.isFinite(after) && after > 0 ? after * 1000 : undefined);
    }
    if (res.status === 400) throw new ConnectorError("VALIDATION", msg, res.status, code);
    throw new ConnectorError("PROVIDER", msg, res.status, code);
  }

  return {
    async accounts(): Promise<{ name: string; accountName?: string }[]> {
      const out = await call<{ accounts?: { name: string; accountName?: string }[] }>("GET", `${ACCOUNTS}/accounts?pageSize=20`);
      return out.accounts ?? [];
    },

    async locations(account: string): Promise<GbpLocation[]> {
      const url = `${INFO}/${account}/locations?pageSize=100&readMask=name,title,storefrontAddress`;
      const out = await call<{ locations?: { name: string; title?: string; storefrontAddress?: { addressLines?: string[]; locality?: string; postalCode?: string } }[] }>("GET", url);
      return (out.locations ?? []).map((l) => {
        const a = l.storefrontAddress;
        const address = a ? [...(a.addressLines ?? []), a.locality, a.postalCode].filter(Boolean).join(", ") : "";
        return { name: l.name, title: l.title ?? l.name, address: address || null };
      });
    },

    /**
     * Newest first. Pages until it reaches reviews not updated since `since` (the sync cursor), or up to `maxPages`
     * on the first sync, so a listing with hundreds of reviews is brought in whole over a few syncs.
     */
    async reviews(account: string, location: string, opts: { since?: string | null; maxPages?: number; pageSize?: number } = {}): Promise<GbpReview[]> {
      const out: GbpReview[] = [];
      let token: string | undefined;
      for (let page = 0; page < (opts.maxPages ?? 10); page++) {
        const q = new URLSearchParams({ pageSize: String(opts.pageSize ?? 50), orderBy: "updateTime desc", ...(token ? { pageToken: token } : {}) });
        const res = await call<{ reviews?: GbpReview[]; nextPageToken?: string }>("GET", `${V4}/${account}/${location}/reviews?${q}`);
        const batch = res.reviews ?? [];
        out.push(...batch);
        token = res.nextPageToken;
        if (!token || (opts.since && batch.some((r) => r.updateTime <= opts.since!))) break;
      }
      return out;
    },

    async review(name: string): Promise<GbpReview> {
      return call<GbpReview>("GET", `${V4}/${name}`);
    },

    async reply(name: string, comment: string): Promise<{ comment: string; updateTime: string }> {
      return call("PUT", `${V4}/${name}/reply`, { comment });
    },

    /** The listing (v1 addresses it as `locations/{l}`). */
    async listing(locationName: string): Promise<GbpListing> {
      const loc = parseLocationName(locationName);
      if (!loc) throw new ConnectorError("VALIDATION", `Bad GBP location ${locationName}`);
      return call<GbpListing>("GET", `${INFO}/${loc.location}?readMask=${LISTING_READ_MASK}`);
    },

    /** Changes only the fields in `updateMask` (e.g. "regularHours", "profile.description"). */
    async updateListing(locationName: string, patch: Partial<GbpListing>, updateMask: string): Promise<GbpListing> {
      const loc = parseLocationName(locationName);
      if (!loc) throw new ConnectorError("VALIDATION", `Bad GBP location ${locationName}`);
      return call<GbpListing>("PATCH", `${INFO}/${loc.location}?updateMask=${encodeURIComponent(updateMask)}`, patch);
    },

    async media(locationName: string): Promise<{ items: GbpMediaItem[]; total: number }> {
      const out = await call<{ mediaItems?: GbpMediaItem[]; totalMediaItemCount?: number }>("GET", `${V4}/${locationName}/media?pageSize=100`);
      return { items: out.mediaItems ?? [], total: out.totalMediaItemCount ?? out.mediaItems?.length ?? 0 };
    },

    async localPosts(locationName: string): Promise<GbpLocalPost[]> {
      const out = await call<{ localPosts?: GbpLocalPost[] }>("GET", `${V4}/${locationName}/localPosts?pageSize=20`);
      return out.localPosts ?? [];
    },

    async createLocalPost(locationName: string, post: Record<string, unknown>): Promise<GbpLocalPost> {
      return call<GbpLocalPost>("POST", `${V4}/${locationName}/localPosts`, post);
    },

    async localPost(name: string): Promise<GbpLocalPost> {
      return call<GbpLocalPost>("GET", `${V4}/${name}`);
    },
  };
}

export type GbpClient = ReturnType<typeof gbpClient>;
