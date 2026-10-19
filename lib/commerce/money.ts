/** ISO 4217 minor-unit exponents that differ from 2. Everything else (GBP, USD, EUR, MXN …) is 2. */
const EXPONENT: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  ISK: 0,
  CLP: 0,
  HUF: 2,
  BHD: 3,
  KWD: 3,
  OMR: 3,
  JOD: 3,
  TND: 3,
};

export function currencyExponent(currency: string): number {
  return EXPONENT[currency.toUpperCase()] ?? 2;
}

/** "12.50" / 12.5 GBP → 1250. Providers that already send minor units (Square, Zettle) skip this. */
export function toMinor(amount: number | string, currency: string): number {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) throw new Error(`Bad money amount: ${amount}`);
  return Math.round(n * 10 ** currencyExponent(currency));
}

export function fromMinor(minor: number, currency: string): number {
  return minor / 10 ** currencyExponent(currency);
}

export function formatMinor(minor: number, currency: string, locale = "en-GB"): string {
  const exp = currencyExponent(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: exp,
    maximumFractionDigits: exp,
  }).format(fromMinor(minor, currency));
}
