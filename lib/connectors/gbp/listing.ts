import type { Prisma } from "@prisma/client";
import type { GbpClient, GbpListing, GbpPeriod, GbpSpecialPeriod, GbpTime } from "@/lib/connectors/gbp/client";
import { prisma } from "@/lib/db/prisma";

/**
 * The Google listing as KOB tracks it: one snapshot per read (stored as an OsFact), compared with the last snapshot
 * and with the restaurant's own website so stale or wrong details turn into tasks the owner can approve.
 */

export const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export type Day = (typeof DAYS)[number];
export type HoursPeriod = { day: Day; open: string; close: string };
export type SpecialDay = { date: string; closed: boolean; open?: string; close?: string };

export type ListingSnapshot = {
  location: string;
  takenAt: string;
  title: string | null;
  websiteUri: string | null;
  hours: HoursPeriod[];
  specialHours: SpecialDay[];
  categories: string[];
  description: string | null;
  photoCount: number;
  lastPhotoAt: string | null;
  lastPostAt: string | null;
  livePosts: number;
  placeId?: string | null;
  /** Google's own "write a review" link for this listing. */
  reviewUri?: string | null;
};

export const LISTING_FACT = "gbp.listing";
export const WEBSITE_HOURS_FACT = "website.hours";

const pad = (n: number | undefined) => String(n ?? 0).padStart(2, "0");
const hhmm = (t: GbpTime | undefined) => `${pad(t?.hours)}:${pad(t?.minutes)}`;
const time = (s: string): GbpTime => {
  const [h, m] = s.split(":").map(Number);
  return m ? { hours: h, minutes: m } : { hours: h };
};
const isDay = (d: string): d is Day => (DAYS as readonly string[]).includes(d);
const byDay = (a: HoursPeriod, b: HoursPeriod) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.open.localeCompare(b.open);

export function hoursFromGoogle(periods: GbpPeriod[] | undefined): HoursPeriod[] {
  return (periods ?? [])
    .filter((p) => isDay(p.openDay))
    .map((p) => ({ day: p.openDay as Day, open: hhmm(p.openTime), close: hhmm(p.closeTime) }))
    .sort(byDay);
}

/** Back to Google's shape; a close at or before the open time ends on the next day (e.g. 18:00–01:00). */
export function hoursToGoogle(periods: HoursPeriod[]): GbpPeriod[] {
  return periods.map((p) => {
    const next = p.close <= p.open && p.close !== "24:00" ? DAYS[(DAYS.indexOf(p.day) + 1) % 7] : p.day;
    return { openDay: p.day, openTime: time(p.open), closeDay: next, closeTime: time(p.close) };
  });
}

const isoDate = (d: { year: number; month: number; day: number }) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;

export function specialFromGoogle(periods: GbpSpecialPeriod[] | undefined): SpecialDay[] {
  return (periods ?? []).map((p) =>
    p.closed ? { date: isoDate(p.startDate), closed: true } : { date: isoDate(p.startDate), closed: false, open: hhmm(p.openTime), close: hhmm(p.closeTime) },
  );
}

export function specialToGoogle(days: SpecialDay[]): GbpSpecialPeriod[] {
  return days.map((d) => {
    const [year, month, day] = d.date.split("-").map(Number);
    const date = { year, month, day };
    return d.closed
      ? { startDate: date, endDate: date, closed: true }
      : { startDate: date, endDate: date, openTime: time(d.open ?? "00:00"), closeTime: time(d.close ?? "00:00") };
  });
}

export function sameHours(a: HoursPeriod[], b: HoursPeriod[]): boolean {
  return JSON.stringify([...a].sort(byDay)) === JSON.stringify([...b].sort(byDay));
}

/** Reads everything KOB checks on the listing. Photos and posts are best-effort: a failure there leaves them unknown. */
export async function readListing(client: GbpClient, location: string, now: Date): Promise<ListingSnapshot> {
  const listing: GbpListing = await client.listing(location);
  const [media, posts] = await Promise.all([client.media(location).catch(() => null), client.localPosts(location).catch(() => null)]);
  const latest = (xs: (string | undefined)[]) => xs.filter(Boolean).sort().at(-1) ?? null;
  return {
    location,
    takenAt: now.toISOString(),
    title: listing.title ?? null,
    websiteUri: listing.websiteUri ?? null,
    hours: hoursFromGoogle(listing.regularHours?.periods),
    specialHours: specialFromGoogle(listing.specialHours?.specialHourPeriods),
    categories: [listing.categories?.primaryCategory?.displayName, ...(listing.categories?.additionalCategories ?? []).map((c) => c.displayName)].filter(
      (c): c is string => Boolean(c),
    ),
    description: listing.profile?.description?.trim() || null,
    photoCount: media?.total ?? 0,
    lastPhotoAt: latest((media?.items ?? []).map((m) => m.createTime)),
    lastPostAt: latest((posts ?? []).map((p) => p.createTime)),
    livePosts: (posts ?? []).filter((p) => p.state === "LIVE").length,
    placeId: listing.metadata?.placeId ?? null,
    reviewUri: listing.metadata?.newReviewUri ?? null,
  };
}

export type ListingChange = { field: string; before: unknown; after: unknown };

export function diffListing(prev: ListingSnapshot | null, next: ListingSnapshot): ListingChange[] {
  if (!prev) return [];
  const out: ListingChange[] = [];
  if (!sameHours(prev.hours, next.hours)) out.push({ field: "hours", before: prev.hours, after: next.hours });
  if (JSON.stringify(prev.specialHours) !== JSON.stringify(next.specialHours)) out.push({ field: "specialHours", before: prev.specialHours, after: next.specialHours });
  if (prev.description !== next.description) out.push({ field: "description", before: prev.description, after: next.description });
  if (JSON.stringify(prev.categories) !== JSON.stringify(next.categories)) out.push({ field: "categories", before: prev.categories, after: next.categories });
  if (next.photoCount > prev.photoCount) out.push({ field: "photos", before: prev.photoCount, after: next.photoCount });
  if (next.lastPostAt && next.lastPostAt !== prev.lastPostAt) out.push({ field: "posts", before: prev.lastPostAt, after: next.lastPostAt });
  return out;
}

export type FreshnessIssue = {
  key: "hours_mismatch" | "photos_stale" | "no_recent_post" | "no_description";
  title: string;
  detail: string;
  /** For hours_mismatch: what the website says, ready to propose to Google. */
  proposedHours?: HoursPeriod[];
};

const DAY_MS = 86_400_000;
const daysSince = (iso: string | null, now: Date) => (iso ? Math.floor((now.getTime() - Date.parse(iso)) / DAY_MS) : null);
const title = (d: Day) => d[0] + d.slice(1).toLowerCase();

function describeHours(periods: HoursPeriod[], day: Day): string {
  const p = periods.filter((x) => x.day === day);
  return p.length ? p.map((x) => `${x.open}–${x.close}`).join(", ") : "closed";
}

/** What's stale or wrong. Website hours are only compared when the site states them. */
export function freshnessIssues(s: ListingSnapshot, websiteHours: HoursPeriod[] | null, now: Date): FreshnessIssue[] {
  const out: FreshnessIssue[] = [];
  if (websiteHours?.length && !sameHours(s.hours, websiteHours)) {
    const days = DAYS.filter((d) => describeHours(s.hours, d) !== describeHours(websiteHours, d));
    const first = days[0];
    out.push({
      key: "hours_mismatch",
      title: days.length === 1 ? `${title(first)} hours differ from your website` : "Your Google hours differ from your website",
      detail: days.map((d) => `${title(d)}: Google ${describeHours(s.hours, d)}, website ${describeHours(websiteHours, d)}`).join(". "),
      proposedHours: websiteHours,
    });
  }
  const photoAge = daysSince(s.lastPhotoAt, now);
  if (s.photoCount === 0 || (photoAge !== null && photoAge > 90))
    out.push({
      key: "photos_stale",
      title: s.photoCount === 0 ? "No photos on your Google listing" : `No new photos in ${photoAge} days`,
      detail: "Fresh photos of your food and room help guests choose you. Add a few from this week.",
    });
  const postAge = daysSince(s.lastPostAt, now);
  if (postAge === null || postAge > 30)
    out.push({
      key: "no_recent_post",
      title: postAge === null ? "No posts on your Google listing" : `No Google post in ${postAge} days`,
      detail: "A short post about this week's specials or an event keeps your listing fresh.",
    });
  if (!s.description)
    out.push({ key: "no_description", title: "Your Google listing has no description", detail: "Add a short description of your food, room and who you're for." });
  return out;
}

// ---- Website hours (schema.org JSON-LD) ---------------------------------------------------------

const SCHEMA_DAYS: Record<string, Day> = {
  mo: "MONDAY", monday: "MONDAY", tu: "TUESDAY", tuesday: "TUESDAY", we: "WEDNESDAY", wednesday: "WEDNESDAY",
  th: "THURSDAY", thursday: "THURSDAY", fr: "FRIDAY", friday: "FRIDAY", sa: "SATURDAY", saturday: "SATURDAY", su: "SUNDAY", sunday: "SUNDAY",
};
const dayOf = (raw: string): Day | null => SCHEMA_DAYS[raw.replace(/^https?:\/\/schema\.org\//i, "").trim().toLowerCase()] ?? null;
const t5 = (s: string) => s.trim().slice(0, 5);

function expandDays(spec: string): Day[] {
  const [a, b] = spec.split("-").map((x) => dayOf(x));
  if (!a) return [];
  if (!b) return [a];
  const out: Day[] = [];
  for (let i = DAYS.indexOf(a); ; i = (i + 1) % 7) {
    out.push(DAYS[i]);
    if (DAYS[i] === b || out.length === 7) break;
  }
  return out;
}

function hoursFromSchemaNode(node: Record<string, unknown>): HoursPeriod[] {
  const out: HoursPeriod[] = [];
  const specs = ([] as unknown[]).concat(node.openingHoursSpecification ?? []);
  for (const raw of specs) {
    const s = raw as { dayOfWeek?: string | string[]; opens?: string; closes?: string };
    if (!s.opens || !s.closes) continue;
    for (const d of ([] as string[]).concat(s.dayOfWeek ?? [])) {
      const day = dayOf(d);
      if (day) out.push({ day, open: t5(s.opens), close: t5(s.closes) });
    }
  }
  // "Mo-Sa 12:00-22:30" strings
  for (const line of ([] as unknown[]).concat(node.openingHours ?? [])) {
    if (typeof line !== "string") continue;
    const m = /^([A-Za-z,-]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(line.trim());
    if (!m) continue;
    for (const part of m[1].split(",")) for (const day of expandDays(part)) out.push({ day, open: m[2].padStart(5, "0"), close: m[3].padStart(5, "0") });
  }
  return out;
}

/** Opening hours the website states in its structured data, or null when it doesn't say. */
export function hoursFromWebsiteHtml(html: string): HoursPeriod[] | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const out: HoursPeriod[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== "object") return;
    const node = v as Record<string, unknown>;
    out.push(...hoursFromSchemaNode(node));
    if (node["@graph"]) visit(node["@graph"]);
  };
  for (const b of blocks) {
    try {
      visit(JSON.parse(b));
    } catch {
      // ignore malformed blocks
    }
  }
  if (!out.length) return null;
  const unique = new Map(out.map((p) => [`${p.day}|${p.open}|${p.close}`, p]));
  return [...unique.values()].sort(byDay);
}

export async function fetchWebsiteHours(url: string, f: typeof fetch = fetch): Promise<HoursPeriod[] | null> {
  try {
    const res = await f(url, { headers: { "User-Agent": "KOB listing check (+https://trykob.com)" }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return hoursFromWebsiteHtml((await res.text()).slice(0, 2_000_000));
  } catch {
    return null;
  }
}

// ---- Storage ------------------------------------------------------------------------------------

export async function lastSnapshot(restaurantId: string): Promise<ListingSnapshot | null> {
  const row = await prisma.osFact.findFirst({ where: { restaurantId, key: LISTING_FACT }, orderBy: { lastUpdatedAt: "desc" } });
  return (row?.valueJson as ListingSnapshot | undefined) ?? null;
}

export async function saveSnapshot(restaurantId: string, s: ListingSnapshot, changes: ListingChange[]): Promise<void> {
  await prisma.osFact.create({
    data: {
      restaurantId,
      key: LISTING_FACT,
      valueJson: { ...s, changes } as unknown as Prisma.InputJsonValue,
      source: "GBP",
      lastUpdatedAt: new Date(s.takenAt),
      freshness: "CURRENT",
    },
  });
  // Keep the last 30 reads; older ones aren't needed to spot a change.
  const old = await prisma.osFact.findMany({ where: { restaurantId, key: LISTING_FACT }, orderBy: { lastUpdatedAt: "desc" }, skip: 30, select: { id: true } });
  if (old.length) await prisma.osFact.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
}

export async function saveWebsiteHours(restaurantId: string, hours: HoursPeriod[], now: Date, source: "website" | "owner"): Promise<void> {
  await prisma.osFact.create({
    data: { restaurantId, key: WEBSITE_HOURS_FACT, valueJson: { hours, source } as unknown as Prisma.InputJsonValue, source, lastUpdatedAt: now, freshness: "CURRENT" },
  });
}

export async function websiteHours(restaurantId: string): Promise<HoursPeriod[] | null> {
  const row = await prisma.osFact.findFirst({ where: { restaurantId, key: WEBSITE_HOURS_FACT }, orderBy: { lastUpdatedAt: "desc" } });
  return ((row?.valueJson as { hours?: HoursPeriod[] } | undefined)?.hours as HoursPeriod[] | undefined) ?? null;
}
