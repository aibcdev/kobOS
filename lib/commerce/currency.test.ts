import { describe, expect, it } from "vitest";
import { COUNTRY_CURRENCY, currencyForCountry } from "@/lib/commerce/currency";
import { formatMinor, toMinor } from "@/lib/commerce/money";

describe("currency by country", () => {
  it("gives each country its own currency", () => {
    expect(currencyForCountry("GB")).toBe("GBP");
    expect(currencyForCountry("us")).toBe("USD");
    expect(currencyForCountry("IE")).toBe("EUR");
    expect(currencyForCountry("FR")).toBe("EUR");
    expect(currencyForCountry("CA")).toBe("CAD");
    expect(currencyForCountry("AU")).toBe("AUD");
    expect(currencyForCountry("MX")).toBe("MXN");
    expect(currencyForCountry("JP")).toBe("JPY");
    expect(currencyForCountry("NG")).toBe("NGN");
    expect(currencyForCountry("AE")).toBe("AED");
    expect(currencyForCountry("CH")).toBe("CHF");
    expect(currencyForCountry("EC")).toBe("USD");
  });

  it("falls back to USD outside the UK and to GBP only when the country is unknown", () => {
    expect(currencyForCountry("ZZ")).toBe("USD");
    expect(currencyForCountry(null)).toBe("GBP");
    expect(currencyForCountry("")).toBe("GBP");
  });

  it("covers every country with a real, unique ISO 4217 code", () => {
    const codes = Object.keys(COUNTRY_CURRENCY);
    expect(codes.length).toBeGreaterThanOrEqual(240);
    expect(codes.every((c) => /^[A-Z]{2}$/.test(c))).toBe(true);
    const supported = new Set(Intl.supportedValuesOf("currency"));
    const unknown = [...new Set(Object.values(COUNTRY_CURRENCY))].filter((c) => !supported.has(c));
    expect(unknown).toEqual([]);
  });

  it("stores and formats zero- and three-decimal currencies correctly", () => {
    expect(toMinor(1500, "JPY")).toBe(1500);
    expect(toMinor("12.345", "KWD")).toBe(12345);
    expect(formatMinor(1500, "JPY", "en-GB")).toBe("JP¥1,500");
    expect(formatMinor(12345, "KWD", "en-GB").replace(/\s/g, " ")).toBe("KWD 12.345");
  });
});
