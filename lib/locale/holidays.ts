/** Dates that change what a restaurant should promote, by country. All dates are local calendar dates (YYYY-MM-DD). */

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Western Easter Sunday (anonymous Gregorian algorithm). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** The nth given weekday (0 = Sunday) of a month (1-12). */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month - 1, 1 + offset + (n - 1) * 7));
}

const MOTHERING_SUNDAY = new Set(["GB", "UK", "IE", "IM", "JE", "GG"]);

/** Mother's Day: Mothering Sunday (3 weeks before Easter) in the UK and Ireland, otherwise the 2nd Sunday of May. */
export function mothersDay(countryCode: string | null | undefined, year: number): string {
  const c = (countryCode ?? "GB").toUpperCase();
  if (MOTHERING_SUNDAY.has(c)) return iso(new Date(easterSunday(year).getTime() - 21 * 86_400_000));
  return iso(nthWeekday(year, 5, 0, 2));
}

/** The next Mother's Day on or after `today` (YYYY-MM-DD). */
export function nextMothersDay(countryCode: string | null | undefined, today: string): string {
  const year = Number(today.slice(0, 4));
  const thisYear = mothersDay(countryCode, year);
  return thisYear >= today ? thisYear : mothersDay(countryCode, year + 1);
}

export function formatLocalDate(date: string, locale = "en-GB"): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

// ---- Dates restaurants plan around, per market --------------------------------------------------

export type LocalEvent = { key: string; name: string; date: string };

const fixed = (year: number, month: number, day: number) => iso(new Date(Date.UTC(year, month - 1, day)));
/** The last given weekday (0 = Sunday) of a month. */
function lastWeekday(year: number, month: number, weekday: number): Date {
  const last = new Date(Date.UTC(year, month, 0));
  return new Date(Date.UTC(year, month - 1, last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7)));
}

/**
 * Only dates that can be computed exactly. Lunar and regional dates (Diwali, Holi, Eid, Lunar New Year) are left
 * out rather than guessed; the owner can tell KOB about those.
 */
export function restaurantDates(countryCode: string | null | undefined, year: number): LocalEvent[] {
  const c = (countryCode ?? "GB").toUpperCase();
  const easter = easterSunday(year);
  const shared: LocalEvent[] = [
    { key: "valentines", name: "Valentine's Day", date: fixed(year, 2, 14) },
    { key: "mothers_day", name: "Mother's Day", date: mothersDay(c, year) },
    { key: "christmas", name: "Christmas", date: fixed(year, 12, 25) },
    { key: "new_years_eve", name: "New Year's Eve", date: fixed(year, 12, 31) },
  ];
  const byCountry: Record<string, LocalEvent[]> = {
    GB: [
      { key: "easter", name: "Easter Sunday", date: iso(easter) },
      { key: "fathers_day", name: "Father's Day", date: iso(nthWeekday(year, 6, 0, 3)) },
      { key: "halloween", name: "Halloween", date: fixed(year, 10, 31) },
      { key: "bonfire_night", name: "Bonfire Night", date: fixed(year, 11, 5) },
    ],
    IE: [
      { key: "st_patricks", name: "St Patrick's Day", date: fixed(year, 3, 17) },
      { key: "easter", name: "Easter Sunday", date: iso(easter) },
      { key: "fathers_day", name: "Father's Day", date: iso(nthWeekday(year, 6, 0, 3)) },
      { key: "halloween", name: "Halloween", date: fixed(year, 10, 31) },
    ],
    US: [
      { key: "memorial_day", name: "Memorial Day", date: iso(lastWeekday(year, 5, 1)) },
      { key: "fathers_day", name: "Father's Day", date: iso(nthWeekday(year, 6, 0, 3)) },
      { key: "independence_day", name: "Fourth of July", date: fixed(year, 7, 4) },
      { key: "labor_day", name: "Labor Day", date: iso(nthWeekday(year, 9, 1, 1)) },
      { key: "halloween", name: "Halloween", date: fixed(year, 10, 31) },
      { key: "thanksgiving", name: "Thanksgiving", date: iso(nthWeekday(year, 11, 4, 4)) },
    ],
    CA: [
      { key: "fathers_day", name: "Father's Day", date: iso(nthWeekday(year, 6, 0, 3)) },
      { key: "canada_day", name: "Canada Day", date: fixed(year, 7, 1) },
      { key: "thanksgiving", name: "Thanksgiving", date: iso(nthWeekday(year, 10, 1, 2)) },
      { key: "halloween", name: "Halloween", date: fixed(year, 10, 31) },
    ],
    AU: [
      { key: "australia_day", name: "Australia Day", date: fixed(year, 1, 26) },
      { key: "easter", name: "Easter Sunday", date: iso(easter) },
      { key: "fathers_day", name: "Father's Day", date: iso(nthWeekday(year, 9, 0, 1)) },
    ],
    NZ: [
      { key: "waitangi_day", name: "Waitangi Day", date: fixed(year, 2, 6) },
      { key: "easter", name: "Easter Sunday", date: iso(easter) },
      { key: "fathers_day", name: "Father's Day", date: iso(nthWeekday(year, 9, 0, 1)) },
    ],
    IN: [
      { key: "independence_day", name: "Independence Day", date: fixed(year, 8, 15) },
      { key: "fathers_day", name: "Father's Day", date: iso(nthWeekday(year, 6, 0, 3)) },
    ],
    ZA: [
      { key: "human_rights_day", name: "Human Rights Day", date: fixed(year, 3, 21) },
      { key: "easter", name: "Easter Sunday", date: iso(easter) },
      { key: "freedom_day", name: "Freedom Day", date: fixed(year, 4, 27) },
      { key: "youth_day", name: "Youth Day", date: fixed(year, 6, 16) },
      { key: "fathers_day", name: "Father's Day", date: iso(nthWeekday(year, 6, 0, 3)) },
      { key: "womens_day", name: "Women's Day", date: fixed(year, 8, 9) },
      { key: "heritage_day", name: "Heritage Day", date: fixed(year, 9, 24) },
      { key: "reconciliation_day", name: "Day of Reconciliation", date: fixed(year, 12, 16) },
    ],
  };
  const key = c === "UK" ? "GB" : ["IM", "JE", "GG"].includes(c) ? "GB" : c;
  return [...shared, ...(byCountry[key] ?? [])].sort((a, b) => a.date.localeCompare(b.date));
}

/** The next date within `withinDays` of `today` (YYYY-MM-DD), with how many days away it is. */
export function nextLocalEvent(countryCode: string | null | undefined, today: string, withinDays = 21): (LocalEvent & { daysAway: number }) | null {
  const year = Number(today.slice(0, 4));
  const start = Date.parse(`${today}T00:00:00Z`);
  for (const e of [...restaurantDates(countryCode, year), ...restaurantDates(countryCode, year + 1)]) {
    const days = Math.round((Date.parse(`${e.date}T00:00:00Z`) - start) / 86_400_000);
    if (days >= 0 && days <= withinDays) return { ...e, daysAway: days };
  }
  return null;
}
