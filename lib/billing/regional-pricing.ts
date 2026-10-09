/** Founding price by visitor region. Stripe holds both amounts on one price via `currency_options`. */

export type PriceRegion = "GB" | "US";

export type RegionalPrice = {
  region: PriceRegion;
  currency: "gbp" | "usd";
  amount: number;
  /** e.g. "£79" */
  label: string;
};

export const PRICE_REGION_COOKIE = "kob_region";

export const FOUNDING_PRICES: Record<PriceRegion, RegionalPrice> = {
  GB: { region: "GB", currency: "gbp", amount: 79, label: "£79" },
  US: { region: "US", currency: "usd", amount: 99, label: "$99" },
};

/** UK + Crown Dependencies pay in GBP; everyone else in USD. */
const GBP_COUNTRIES = new Set(["GB", "UK", "IM", "JE", "GG"]);

export function regionForCountry(country: string | null | undefined): PriceRegion {
  return country && GBP_COUNTRIES.has(country.trim().toUpperCase()) ? "GB" : "US";
}

export function parsePriceRegion(value: string | null | undefined): PriceRegion | null {
  const v = value?.trim().toUpperCase();
  if (v === "GB" || v === "UK") return "GB";
  if (v === "US") return "US";
  return null;
}

export function foundingPrice(region: PriceRegion): RegionalPrice {
  return FOUNDING_PRICES[region];
}

function decodeNetlifyGeo(raw: string): string | null {
  try {
    const json = JSON.parse(atob(raw)) as { country?: { code?: string } };
    return json.country?.code ?? null;
  } catch {
    return null;
  }
}

/** Visitor country from CDN headers (Netlify, Cloudflare, Vercel). */
export function countryFromHeaders(h: Headers): string | null {
  const nfGeo = h.get("x-nf-geo");
  return (
    h.get("x-country") ||
    (nfGeo ? decodeNetlifyGeo(nfGeo) : null) ||
    h.get("cf-ipcountry") ||
    h.get("x-vercel-ip-country") ||
    null
  );
}

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Cookie (set by middleware, or `?region=` override) wins; falls back to geo headers. */
export function regionFromRequestHeaders(h: Headers): PriceRegion {
  return (
    parsePriceRegion(cookieValue(h.get("cookie"), PRICE_REGION_COOKIE)) ??
    regionForCountry(countryFromHeaders(h))
  );
}
