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
