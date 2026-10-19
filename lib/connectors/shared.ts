import { ConnectorError } from "@/lib/connectors/errors";
import { prisma } from "@/lib/db/prisma";
import type { ConnectorCtx } from "@/lib/hub/connector";

/**
 * Provider HTTP with the hub's error contract: 429 → RATE_LIMIT (+ Retry-After), 401/403 → AUTH, 404 → NOT_FOUND,
 * other 4xx → VALIDATION, 5xx / network → PROVIDER / NETWORK. Response bodies never reach logs or error messages.
 */
export async function providerJson<T>(ctx: Pick<ConnectorCtx, "fetch">, provider: string, url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await (ctx.fetch ?? fetch)(url, { ...init, signal: init.signal ?? AbortSignal.timeout(30_000) });
  } catch (e) {
    throw new ConnectorError("NETWORK", `${provider} request failed: ${e instanceof Error ? e.name : "error"}`);
  }
  if (res.ok) return (await res.json()) as T;
  const path = new URL(url).pathname;
  if (res.status === 429) {
    const after = Number(res.headers.get("retry-after"));
    throw new ConnectorError("RATE_LIMIT", `${provider} rate limited`, 429, undefined, Number.isFinite(after) && after > 0 ? after * 1000 : undefined);
  }
  if (res.status === 401 || res.status === 403) throw new ConnectorError("AUTH", `${provider} rejected credentials (${res.status})`, res.status);
  if (res.status === 404) throw new ConnectorError("NOT_FOUND", `${provider} ${path} not found`, 404);
  if (res.status < 500) throw new ConnectorError("VALIDATION", `${provider} ${path} returned ${res.status}`, res.status);
  throw new ConnectorError("PROVIDER", `${provider} ${path} returned ${res.status}`, res.status);
}

/**
 * Incremental cursor stored in SyncCursor.cursor. `since` is the watermark the current run reads from; `page` the
 * provider's page token inside that run; `maxSeen` the newest update seen so far, which becomes the next `since`.
 */
export type IncrementalCursor = { since: string; page?: string | null; maxSeen?: string | null };

export function readCursor(raw: string | null, backfillDays: number, now: Date): IncrementalCursor {
  if (raw) {
    try {
      const c = JSON.parse(raw) as IncrementalCursor;
      if (c && typeof c.since === "string") return c;
    } catch {
      // legacy plain-string cursor: treat as a watermark
      if (!Number.isNaN(Date.parse(raw))) return { since: raw };
    }
  }
  return { since: new Date(now.getTime() - Math.max(backfillDays, 1) * 86_400_000).toISOString() };
}

export function laterOf(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

/** A page of an incremental stream: either more pages in this run, or done with the next run's watermark. */
export function incrementalPage(c: IncrementalCursor, rows: number, nextPage: string | null, maxSeen: string | null) {
  const seen = laterOf(c.maxSeen, maxSeen);
  if (nextPage) return { rows, nextCursor: JSON.stringify({ since: c.since, page: nextPage, maxSeen: seen }), done: false };
  return { rows, nextCursor: JSON.stringify({ since: seen ?? c.since }), done: true };
}

const COUNTRY_CURRENCY: Record<string, string> = { US: "USD", CA: "CAD", GB: "GBP", IE: "EUR", AU: "AUD", NZ: "NZD", MX: "MXN" };

/** For providers whose payloads carry wall-clock times or no currency (Toast, Epos Now). */
export async function restaurantContext(restaurantId: string): Promise<{ timezone: string; currency: string }> {
  const r = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { timezone: true, countryCode: true, locale: true } });
  const country = r?.countryCode?.toUpperCase() ?? r?.locale.split("-")[1]?.toUpperCase() ?? "GB";
  return { timezone: r?.timezone ?? "Europe/London", currency: COUNTRY_CURRENCY[country] ?? "GBP" };
}

/** "2026-10-14T19:42:00" in `timeZone` → UTC Date (for providers that report wall-clock time, e.g. Epos Now). */
export function zonedToUtc(local: string, timeZone: string): Date {
  const asUtc = new Date(`${local.replace(/Z$/, "").slice(0, 19)}Z`);
  if (Number.isNaN(asUtc.getTime())) throw new ConnectorError("VALIDATION", `Bad local time ${local}`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(asUtc);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const zoned = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offset = zoned - asUtc.getTime();
  // Second pass handles instants near a DST change.
  const guess = new Date(asUtc.getTime() - offset);
  const parts2 = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(guess);
  const m = parts2.find((p) => p.type === "timeZoneName")?.value.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offset2 = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) * 60_000 : offset;
  return new Date(asUtc.getTime() - offset2);
}

/** Wall-clock "YYYY-MM-DDTHH:mm:ss" of a UTC instant in `timeZone` (for providers that filter on local time). */
export function utcToZoned(at: Date, timeZone: string): string {
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(at);
  return s.replace(" ", "T");
}
