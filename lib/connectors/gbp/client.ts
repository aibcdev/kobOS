import { ConnectorError } from "@/lib/connectors/errors";

/**
 * Google Business Profile, only the calls the review-reply loop needs. Account and location listing use the v1
 * Account Management / Business Information APIs; reviews are still only on My Business v4.
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

export type Fetch = typeof fetch;

const STARS: Record<GbpStar, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, STAR_RATING_UNSPECIFIED: 0 };
export const starsOf = (s: GbpStar) => STARS[s] ?? 0;

/** `accounts/1/locations/2/reviews/3` → its parts; null when it isn't one. */
export function parseReviewName(name: string): { account: string; location: string; review: string } | null {
  const m = /^accounts\/([^/]+)\/locations\/([^/]+)\/reviews\/([^/]+)$/.exec(name);
  return m ? { account: `accounts/${m[1]}`, location: `locations/${m[2]}`, review: m[3] } : null;
}

export function gbpClient(accessToken: string, f: Fetch = fetch) {
  async function call<T>(method: "GET" | "PUT", url: string, body?: unknown): Promise<T> {
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

    /** Newest first; one page is enough for a 30-minute sync. */
    async reviews(account: string, location: string, pageSize = 50): Promise<GbpReview[]> {
      const out = await call<{ reviews?: GbpReview[] }>("GET", `${V4}/${account}/${location}/reviews?pageSize=${pageSize}&orderBy=updateTime%20desc`);
      return out.reviews ?? [];
    },

    async review(name: string): Promise<GbpReview> {
      return call<GbpReview>("GET", `${V4}/${name}`);
    },

    async reply(name: string, comment: string): Promise<{ comment: string; updateTime: string }> {
      return call("PUT", `${V4}/${name}/reply`, { comment });
    },
  };
}

export type GbpClient = ReturnType<typeof gbpClient>;
