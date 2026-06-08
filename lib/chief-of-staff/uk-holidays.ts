export type UkHolidayEvent = {
  id: string;
  name: string;
  /** Month 1-12 */
  month: number;
  /** Day of month; for Easter use computed */
  day?: number;
  /** If set, compute date from this rule */
  rule?: "easter";
};

const FIXED: UkHolidayEvent[] = [
  { id: "new-year", name: "New Year's Day", month: 1, day: 1 },
  { id: "valentines", name: "Valentine's Day", month: 2, day: 14 },
  { id: "mothers-day", name: "Mother's Day", month: 3, day: 30 },
  { id: "easter", name: "Easter", month: 1, rule: "easter" },
  { id: "fathers-day", name: "Father's Day", month: 6, day: 21 },
  { id: "halloween", name: "Halloween", month: 10, day: 31 },
  { id: "christmas", name: "Christmas", month: 12, day: 25 },
];

/** Anonymous Gregorian algorithm — good enough for UK marketing dates. */
function easterSunday(year: number): Date {
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
  return new Date(year, month - 1, day);
}

function eventDate(event: UkHolidayEvent, year: number): Date {
  if (event.rule === "easter") return easterSunday(year);
  return new Date(year, event.month - 1, event.day ?? 1);
}

export function nextUkHoliday(from: Date = new Date()): { event: UkHolidayEvent; date: Date; daysAway: number } | null {
  const year = from.getFullYear();
  const candidates: { event: UkHolidayEvent; date: Date }[] = [];

  for (const y of [year, year + 1]) {
    for (const event of FIXED) {
      candidates.push({ event, date: eventDate(event, y) });
    }
  }

  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const upcoming = candidates
    .filter((c) => c.date >= start)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const next = upcoming[0];
  if (!next) return null;

  const daysAway = Math.ceil((next.date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return { event: next.event, date: next.date, daysAway };
}
