import { describe, expect, it } from "vitest";
import {
  isValidTimeZone,
  localeForCountry,
  normalizeCountryCode,
  resolveRestaurantTimezone,
  usStateTimezone,
  usTimezoneFromOffset,
  utcOffsetMinutesAt,
} from "./timezone";

const JULY = new Date("2026-07-15T12:00:00Z");
const JANUARY = new Date("2026-01-15T12:00:00Z");

describe("resolveRestaurantTimezone", () => {
  it("puts GB restaurants on Europe/London whatever the browser says", () => {
    expect(resolveRestaurantTimezone({ countryCode: "GB" })).toBe("Europe/London");
    expect(resolveRestaurantTimezone({ countryCode: "uk", browserTimezone: "America/New_York" })).toBe(
      "Europe/London",
    );
  });

  it("uses the state map for US restaurants", () => {
    expect(resolveRestaurantTimezone({ countryCode: "US", state: "TX" })).toBe("America/Chicago");
    expect(resolveRestaurantTimezone({ countryCode: "US", state: "California" })).toBe("America/Los_Angeles");
    expect(resolveRestaurantTimezone({ countryCode: "US", state: "AZ" })).toBe("America/Phoenix");
  });

  it("falls back to the Places offset when the US state is unknown", () => {
    expect(resolveRestaurantTimezone({ countryCode: "US", utcOffsetMinutes: -240, now: JULY })).toBe(
      "America/New_York",
    );
    expect(resolveRestaurantTimezone({ countryCode: "US", utcOffsetMinutes: -300, now: JANUARY })).toBe(
      "America/New_York",
    );
    expect(resolveRestaurantTimezone({ countryCode: "US", utcOffsetMinutes: -300, now: JULY })).toBe(
      "America/Chicago",
    );
  });

  it("only trusts a US-shaped browser zone for US restaurants", () => {
    expect(resolveRestaurantTimezone({ countryCode: "US", browserTimezone: "America/Denver" })).toBe(
      "America/Denver",
    );
    expect(resolveRestaurantTimezone({ countryCode: "US", browserTimezone: "Europe/London" })).toBeNull();
  });

  it("uses the browser zone when the country is unknown, and ignores junk", () => {
    expect(resolveRestaurantTimezone({ browserTimezone: "Europe/Madrid" })).toBe("Europe/Madrid");
    expect(resolveRestaurantTimezone({ browserTimezone: "Not/AZone" })).toBeNull();
    expect(resolveRestaurantTimezone({})).toBeNull();
  });
});

describe("helpers", () => {
  it("normalises country codes", () => {
    expect(normalizeCountryCode(" gb ")).toBe("GB");
    expect(normalizeCountryCode("UK")).toBe("GB");
    expect(normalizeCountryCode("United Kingdom")).toBeNull();
    expect(normalizeCountryCode(null)).toBeNull();
  });

  it("maps every state code to a valid IANA zone", () => {
    for (const state of ["NY", "IN", "MI", "HI", "AK", "PR", "DC", "ID"]) {
      expect(isValidTimeZone(usStateTimezone(state))).toBe(true);
    }
    expect(usStateTimezone("ZZ")).toBeNull();
  });

  it("reads offsets with DST", () => {
    expect(utcOffsetMinutesAt("Europe/London", JULY)).toBe(60);
    expect(utcOffsetMinutesAt("Europe/London", JANUARY)).toBe(0);
    expect(usTimezoneFromOffset(-600, JULY)).toBe("Pacific/Honolulu");
    expect(usTimezoneFromOffset(330, JULY)).toBeNull();
  });

  it("picks a locale", () => {
    expect(localeForCountry("GB")).toBe("en-GB");
    expect(localeForCountry("US")).toBe("en-US");
    expect(localeForCountry(null)).toBe("en-GB");
  });
});
