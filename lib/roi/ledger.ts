import { Prisma, type RoiWeek } from "@prisma/client";
import { restaurantContext, utcToZoned, zonedToUtc } from "@/lib/connectors/shared";
import { prisma } from "@/lib/db/prisma";
import { dataSourcesFor, providerName, recommendedFor } from "@/lib/hub/capabilities";
import { METRIC_KEYS, METRICS, sumRows, type EvidenceRow, type MetricKey, type RoiUnit } from "@/lib/roi/metrics";
import { STANDARD_MINUTES_VERSION } from "@/lib/roi/standard-minutes";

/**
 * Spec 2 Phase 9. A restaurant's week runs Monday 00:00 to Monday 00:00 in its own timezone. `saveWeek` snapshots the
 * totals into RoiWeek so the email, the page and the print view show the same numbers; the click-through recomputes
 * the rows and says so if anything changed since (a late refund, an import undone).
 */

export type MetricState = "LIVE" | "OFF";

export type StoredMetric = {
  state: MetricState;
  value: number | null;
  unit: RoiUnit;
  count: number;
  /** Providers the rows came from. */
  sources: string[];
  /** OFF: what to connect, recommended first. */
  connect: string[];
};

export type WeekSnapshot = {
  weekStart: string;
  timezone: string;
  currency: string;
  standardMinutesVersion: string;
  metrics: Record<MetricKey, StoredMetric>;
};

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" ± days, calendar arithmetic only. */
export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The local Monday of the week containing `at`. */
export function weekStartOf(at: Date, timeZone: string): string {
  const local = utcToZoned(at, timeZone).slice(0, 10);
  const dow = new Date(`${local}T00:00:00Z`).getUTCDay();
  return addDays(local, -((dow + 6) % 7));
}

/** The last full week before `now` (what Monday's report covers). */
export function lastCompletedWeek(now: Date, timeZone: string): string {
  return addDays(weekStartOf(now, timeZone), -7);
}

export function weekBounds(weekStart: string, timeZone: string): { start: Date; end: Date } {
  return { start: zonedToUtc(`${weekStart}T00:00:00`, timeZone), end: zonedToUtc(`${addDays(weekStart, 7)}T00:00:00`, timeZone) };
}

export function isWeekStart(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`)) && new Date(`${day}T00:00:00Z`).getUTCDay() === 1;
}

async function context(restaurantId: string) {
  const [{ timezone, currency }, supply] = await Promise.all([restaurantContext(restaurantId), dataSourcesFor(restaurantId)]);
  return { timezone, currency, ...supply };
}

/** Evidence rows for one metric and week (the click-through). */
export async function metricRows(restaurantId: string, weekStart: string, key: MetricKey): Promise<{ rows: EvidenceRow[]; timezone: string; currency: string }> {
  const { timezone, currency } = await restaurantContext(restaurantId);
  const { start, end } = weekBounds(weekStart, timezone);
  return { rows: await METRICS[key].rows({ restaurantId, start, end, currency }), timezone, currency };
}

export async function computeWeek(restaurantId: string, weekStart: string): Promise<WeekSnapshot> {
  const ctx = await context(restaurantId);
  const { start, end } = weekBounds(weekStart, ctx.timezone);
  const supplied = new Set(ctx.sources.flatMap((s) => s.contracts));
  const metrics = {} as Record<MetricKey, StoredMetric>;
  for (const key of METRIC_KEYS) {
    const spec = METRICS[key];
    const rows = await spec.rows({ restaurantId, start, end, currency: ctx.currency });
    const { value, count } = sumRows(rows);
    const fed = !spec.contracts || spec.contracts.some((c) => supplied.has(c));
    const sources = [...new Set(rows.map((r) => r.ref.provider))];
    if (!fed && count === 0) {
      metrics[key] = { state: "OFF", value: null, unit: spec.unit, count: 0, sources: [], connect: recommendedFor(spec.contracts![0], ctx.region) };
    } else {
      metrics[key] = { state: "LIVE", value, unit: spec.unit, count, sources, connect: [] };
    }
  }
  return { weekStart, timezone: ctx.timezone, currency: ctx.currency, standardMinutesVersion: STANDARD_MINUTES_VERSION, metrics };
}

export async function saveWeek(restaurantId: string, weekStart: string, now = new Date()): Promise<RoiWeek> {
  const snap = await computeWeek(restaurantId, weekStart);
  const data = {
    timezone: snap.timezone,
    currency: snap.currency,
    metricsJson: snap.metrics as unknown as Prisma.InputJsonValue,
    standardMinutesVersion: snap.standardMinutesVersion,
    computedAt: now,
  };
  return prisma.roiWeek.upsert({
    where: { restaurantId_weekStart: { restaurantId, weekStart: new Date(`${weekStart}T00:00:00Z`) } },
    create: { restaurantId, weekStart: new Date(`${weekStart}T00:00:00Z`), ...data },
    update: data,
  });
}

export function snapshotOf(row: RoiWeek): WeekSnapshot {
  return {
    weekStart: row.weekStart.toISOString().slice(0, 10),
    timezone: row.timezone,
    currency: row.currency,
    standardMinutesVersion: row.standardMinutesVersion,
    metrics: row.metricsJson as unknown as Record<MetricKey, StoredMetric>,
  };
}

/** The saved snapshot when there is one (what the email said); otherwise computed now and not saved. */
export async function weekView(restaurantId: string, weekStart: string): Promise<{ snapshot: WeekSnapshot; saved: RoiWeek | null }> {
  const saved = await prisma.roiWeek.findUnique({ where: { restaurantId_weekStart: { restaurantId, weekStart: new Date(`${weekStart}T00:00:00Z`) } } });
  return saved ? { snapshot: snapshotOf(saved), saved } : { snapshot: await computeWeek(restaurantId, weekStart), saved: null };
}

/** Saved weeks plus the last completed one, newest first. */
export async function recentWeeks(restaurantId: string, timeZone: string, now = new Date(), take = 12): Promise<string[]> {
  const rows = await prisma.roiWeek.findMany({ where: { restaurantId }, orderBy: { weekStart: "desc" }, take, select: { weekStart: true } });
  const weeks = new Set([lastCompletedWeek(now, timeZone), ...rows.map((r) => r.weekStart.toISOString().slice(0, 10))]);
  return [...weeks].sort().reverse().slice(0, take);
}

/** Click-through check: do today's rows still add up to what the report said? */
export function reconcile(stored: StoredMetric | undefined, rows: EvidenceRow[]): { total: number; count: number; reported: number | null; changed: boolean } {
  const { value, count } = sumRows(rows);
  const reported = stored?.state === "LIVE" ? stored.value : null;
  return { total: value, count, reported, changed: reported !== null && (reported !== value || stored!.count !== count) };
}

export function sourceNames(m: StoredMetric): string[] {
  return m.sources.map(providerName);
}
