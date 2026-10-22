import { describe, expect, it } from "vitest";
import { currencyExponent, formatMinor, fromMinor, toMinor } from "@/lib/commerce/money";

describe("minor-unit money", () => {
  it("uses ISO 4217 exponents", () => {
    expect([currencyExponent("GBP"), currencyExponent("jpy"), currencyExponent("KWD")]).toEqual([2, 0, 3]);
  });

  it("converts without float drift", () => {
    expect(toMinor("12.50", "GBP")).toBe(1250);
    expect(toMinor(0.1 + 0.2, "USD")).toBe(30);
    expect(toMinor(1999, "JPY")).toBe(1999);
    expect(toMinor("1.234", "KWD")).toBe(1234);
    expect(fromMinor(1250, "GBP")).toBe(12.5);
    expect(() => toMinor("abc", "GBP")).toThrow();
  });

  it("formats in the currency's own precision", () => {
    expect(formatMinor(1250, "GBP")).toBe("£12.50");
    expect(formatMinor(1999, "JPY", "en-US")).toBe("¥1,999");
  });
});
