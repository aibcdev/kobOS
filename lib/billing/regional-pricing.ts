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

// ---- What each restaurant is charged ------------------------------------------------------------

/** What a restaurant pays per location per month: its currency (ISO 4217, lower case for Stripe) and amount. */
export type CountryPrice = { currency: string; amount: number; label: string };

function labelFor(currency: string, amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(amount);
}

/**
 * The default offer: £79 in the UK and Crown Dependencies, $99 everywhere else. Local prices (ZAR, INR, AUD, EUR…)
 * are a config change, not a code change: set KOB_PRICES, e.g. {"ZA":{"currency":"zar","amount":1499}}.
 */
export function priceTable(): Record<string, { currency: string; amount: number }> {
  const table: Record<string, { currency: string; amount: number }> = {};
  for (const c of GBP_COUNTRIES) table[c] = { currency: "gbp", amount: FOUNDING_PRICES.GB.amount };
  const raw = process.env.KOB_PRICES?.trim();
  if (raw) {
    try {
      for (const [country, p] of Object.entries(JSON.parse(raw) as Record<string, { currency?: unknown; amount?: unknown }>)) {
        if (typeof p.currency === "string" && /^[a-z]{3}$/i.test(p.currency) && typeof p.amount === "number" && p.amount > 0)
          table[country.toUpperCase()] = { currency: p.currency.toLowerCase(), amount: p.amount };
      }
    } catch {
      console.warn("[pricing] KOB_PRICES is not valid JSON; using the default prices");
    }
  }
  return table;
}

/** The one place a restaurant's price comes from: pricing page, billing, checkout, emails and Talk. */
export function priceForCountry(country: string | null | undefined): CountryPrice {
  const p = priceTable()[country?.trim().toUpperCase() ?? ""] ?? { currency: FOUNDING_PRICES.US.currency, amount: FOUNDING_PRICES.US.amount };
  return { ...p, label: labelFor(p.currency, p.amount) };
}
