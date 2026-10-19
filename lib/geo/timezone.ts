/** Country / US state / Places offset → IANA timezone + locale for new restaurants. */

const FIXED_COUNTRY_TZ: Record<string, string> = {
  GB: "Europe/London",
  IM: "Europe/Isle_of_Man",
  JE: "Europe/Jersey",
  GG: "Europe/Guernsey",
  IE: "Europe/Dublin",
  FR: "Europe/Paris",
  DE: "Europe/Berlin",
  NL: "Europe/Amsterdam",
  BE: "Europe/Brussels",
  IT: "Europe/Rome",
  NG: "Africa/Lagos",
  GH: "Africa/Accra",
  ZA: "Africa/Johannesburg",
  AE: "Asia/Dubai",
  IN: "Asia/Kolkata",
  SG: "Asia/Singapore",
};

/** Majority-population zone per state; split states (TN, KY, FL, TX…) use the larger side. */
const US_STATE_TZ: Record<string, string> = {
  AL: "America/Chicago",
  AK: "America/Anchorage",
  AZ: "America/Phoenix",
  AR: "America/Chicago",
  CA: "America/Los_Angeles",
  CO: "America/Denver",
  CT: "America/New_York",
  DC: "America/New_York",
  DE: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  HI: "Pacific/Honolulu",
  ID: "America/Boise",
  IL: "America/Chicago",
  IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago",
  KS: "America/Chicago",
  KY: "America/New_York",
  LA: "America/Chicago",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/Detroit",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  MT: "America/Denver",
  NE: "America/Chicago",
  NV: "America/Los_Angeles",
  NH: "America/New_York",
  NJ: "America/New_York",
  NM: "America/Denver",
  NY: "America/New_York",
  NC: "America/New_York",
  ND: "America/Chicago",
  OH: "America/New_York",
  OK: "America/Chicago",
  OR: "America/Los_Angeles",
  PA: "America/New_York",
  PR: "America/Puerto_Rico",
  RI: "America/New_York",
  SC: "America/New_York",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  UT: "America/Denver",
  VT: "America/New_York",
  VA: "America/New_York",
  WA: "America/Los_Angeles",
  WV: "America/New_York",
  WI: "America/Chicago",
  WY: "America/Denver",
};

const US_STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", "district of columbia": "DC", delaware: "DE",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "puerto rico": "PR", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY",
};

/** Order matters: Phoenix and Los Angeles share an offset during US summer time. */
const US_OFFSET_CANDIDATES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export function normalizeCountryCode(value: string | null | undefined): string | null {
  const v = value?.trim().toUpperCase();
  if (!v) return null;
  if (v === "UK") return "GB";
  return /^[A-Z]{2}$/.test(v) ? v : null;
}

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz?.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

/** Current UTC offset of `tz` in minutes (e.g. America/New_York in July → -240). */
export function utcOffsetMinutesAt(tz: string, at: Date): number {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = part?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  const minutes = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === "-" ? -minutes : minutes;
}

export function usStateTimezone(state: string | null | undefined): string | null {
  const raw = state?.trim();
  if (!raw) return null;
  const code = raw.length === 2 ? raw.toUpperCase() : US_STATE_NAMES[raw.toLowerCase()];
  return (code && US_STATE_TZ[code]) || null;
}

export function usTimezoneFromOffset(offsetMinutes: number, at: Date = new Date()): string | null {
  return US_OFFSET_CANDIDATES.find((tz) => utcOffsetMinutesAt(tz, at) === offsetMinutes) ?? null;
}

export type TimezoneInput = {
  countryCode?: string | null;
  state?: string | null;
  /** Google Places `utcOffsetMinutes` (current offset, DST included). */
  utcOffsetMinutes?: number | null;
  /** `Intl.DateTimeFormat().resolvedOptions().timeZone` from the owner's browser. */
  browserTimezone?: string | null;
  now?: Date;
};

/** Null means "no confident answer" — keep the column default. */
export function resolveRestaurantTimezone(input: TimezoneInput): string | null {
  const country = normalizeCountryCode(input.countryCode);
  const browser = isValidTimeZone(input.browserTimezone) ? input.browserTimezone.trim() : null;

  if (country && FIXED_COUNTRY_TZ[country]) return FIXED_COUNTRY_TZ[country];

  if (country === "US") {
    const byState = usStateTimezone(input.state);
    if (byState) return byState;
    if (typeof input.utcOffsetMinutes === "number") {
      const byOffset = usTimezoneFromOffset(input.utcOffsetMinutes, input.now ?? new Date());
      if (byOffset) return byOffset;
    }
    if (browser && (browser.startsWith("America/") || browser === "Pacific/Honolulu")) return browser;
    return null;
  }

  return browser;
}

export function localeForCountry(countryCode: string | null | undefined): string {
  const country = normalizeCountryCode(countryCode);
  if (country === "US" || country === "PR") return "en-US";
  if (country === "IE") return "en-IE";
  return "en-GB";
}
