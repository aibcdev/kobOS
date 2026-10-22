import { prisma } from "@/lib/db/prisma";

export type LimitResult = { ok: boolean; remaining: number; resetAt: Date; retryAfterSec: number };

const SWEEP_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

type Bucket = { count: number; resetAt: number };
const fallbackBuckets = new Map<string, Bucket>();

/** Used only when the database is unreachable, so a DB blip degrades to per-instance limits instead of none. */
function fallbackCount(key: string, resetAt: number, now: number): number {
  if (fallbackBuckets.size > 4000) {
    for (const [k, v] of fallbackBuckets) if (now > v.resetAt) fallbackBuckets.delete(k);
  }
  const bucket = fallbackBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    fallbackBuckets.set(key, { count: 1, resetAt });
    return 1;
  }
  bucket.count += 1;
  return bucket.count;
}

async function dbCount(key: string, windowStart: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "public"."RateLimitHit" ("key", "windowStart", "count")
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimitHit"."count" + 1
    RETURNING "count"`;
  return Number(rows[0]?.count ?? 1);
}

function maybeSweep(now: number) {
  if (Math.random() > 0.01) return;
  void prisma.$executeRaw`DELETE FROM "public"."RateLimitHit" WHERE "windowStart" < ${new Date(now - SWEEP_AFTER_MS)}`.catch(
    () => {},
  );
}

/** Fixed window aligned to the epoch, shared across serverless instances via Postgres. */
export async function limit(rawKey: string, opts: { windowSec: number; max: number }): Promise<LimitResult> {
  const key = rawKey.trim().slice(0, 200) || "unknown";
  const windowMs = Math.max(1, opts.windowSec) * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);

  let count: number;
  try {
    count = await dbCount(key, windowStart);
    maybeSweep(now);
  } catch (err) {
    console.warn("[rate-limit] db unavailable, using in-memory fallback", err instanceof Error ? err.message : err);
    count = fallbackCount(key, resetAt.getTime(), now);
  }

  return {
    ok: count <= opts.max,
    remaining: Math.max(0, opts.max - count),
    resetAt,
    retryAfterSec: Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000)),
  };
}

/**
 * The client can put anything in X-Forwarded-For, so the first entry is never trusted. Netlify's edge sets
 * x-nf-client-connection-ip itself; otherwise the last XFF hop is the one our nearest proxy appended.
 */
export function clientIpFromHeaders(h: Headers): string | null {
  const nf = h.get("x-nf-client-connection-ip")?.trim();
  if (nf) return nf;
  const hops = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (hops.length) return hops[hops.length - 1];
  return h.get("x-real-ip")?.trim() || null;
}

/** Fleet-wide cap per UTC day for endpoints that spend money on anonymous traffic (Google Places). */
export function dailyBudget(name: string, envVar: string, fallbackMax: number): Promise<LimitResult> {
  const max = Math.max(1, Number(process.env[envVar]) || fallbackMax);
  return limit(`budget:${name}`, { windowSec: 86_400, max });
}

/** 429 body + Retry-After for a failed `limit()` result. */
export function tooManyRequests(result: LimitResult, message = "Too many requests. Please try again shortly.") {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
  );
}
