/**
 * Hours a month an owner spends on review replies and listing admin, from their own numbers. Pure arithmetic: no
 * benchmark and no "hours saved", because KOB has no measured figure for that.
 *
 *   hours = (reviews × minutesPerReply + 4.33 × weeklyListingMinutes × locations) / 60
 */
export type ReviewTimeInputs = {
  /** New reviews a month, all sites and all locations. */
  reviews: number;
  minutesPerReply: number;
  locations: number;
  /** Minutes a week, per location, updating hours, menus and listings. */
  weeklyListingMinutes: number;
};

export const WEEKS_PER_MONTH = 52 / 12; // 4.33

/** Examples shown in the form, for the owner to replace. Not benchmarks. */
export const REVIEW_TIME_EXAMPLE: ReviewTimeInputs = { reviews: 20, minutesPerReply: 5, locations: 1, weeklyListingMinutes: 30 };

const LIMITS: Record<keyof ReviewTimeInputs, number> = {
  reviews: 10_000,
  minutesPerReply: 120,
  locations: 100,
  weeklyListingMinutes: 7 * 24 * 60,
};

/** A finite number in [0, max]. Anything unreadable is 0. */
function clamp(value: unknown, max: number): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim() || NaN);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

export function cleanInputs(raw: Partial<Record<keyof ReviewTimeInputs, unknown>>): ReviewTimeInputs {
  return {
    reviews: clamp(raw.reviews, LIMITS.reviews),
    minutesPerReply: clamp(raw.minutesPerReply, LIMITS.minutesPerReply),
    locations: Math.round(clamp(raw.locations, LIMITS.locations)),
    weeklyListingMinutes: clamp(raw.weeklyListingMinutes, LIMITS.weeklyListingMinutes),
  };
}

/** Hours a month, to one decimal place. */
export function monthlyAdminHours(raw: Partial<Record<keyof ReviewTimeInputs, unknown>>): number {
  const i = cleanInputs(raw);
  const minutes = i.reviews * i.minutesPerReply + WEEKS_PER_MONTH * i.weeklyListingMinutes * i.locations;
  return Math.round((minutes / 60) * 10) / 10;
}

/** Query string → inputs, falling back to the example for anything missing (so outreach links can prefill). */
export function inputsFromQuery(q: Record<string, string | string[] | undefined>): ReviewTimeInputs {
  const one = (k: string) => (Array.isArray(q[k]) ? q[k]![0] : q[k]);
  const pick = (k: string, fallback: number) => (one(k) == null || one(k) === "" ? fallback : one(k));
  return cleanInputs({
    reviews: pick("reviews", REVIEW_TIME_EXAMPLE.reviews),
    minutesPerReply: pick("minutes", REVIEW_TIME_EXAMPLE.minutesPerReply),
    locations: pick("locations", REVIEW_TIME_EXAMPLE.locations),
    weeklyListingMinutes: pick("listing", REVIEW_TIME_EXAMPLE.weeklyListingMinutes),
  });
}
