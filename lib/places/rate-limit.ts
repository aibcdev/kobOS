/** Fixed-window rate limit for /api/places/* by IP (separate bucket from audit runs). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = Math.max(30_000, (Number(process.env.PLACES_RATE_LIMIT_WINDOW_SEC) || 3600) * 1000);
const MAX = Math.max(1, Number(process.env.PLACES_RATE_LIMIT_MAX_REQUESTS) || 80);

function prune(now: number) {
  if (buckets.size < 4000) return;
  for (const [k, v] of buckets) {
    if (now > v.resetAt) buckets.delete(k);
  }
}

export type PlacesRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function checkPlacesRateLimit(key: string | null): PlacesRateLimitResult {
  if (process.env.PLACES_RATE_LIMIT_DISABLED === "1") {
    return { ok: true };
  }

  const k = `places:${(key?.trim() || "unknown").slice(0, 128)}`;
  const now = Date.now();
  prune(now);

  const b = buckets.get(k);
  if (!b || now > b.resetAt) {
    buckets.set(k, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (b.count >= MAX) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }

  b.count += 1;
  return { ok: true };
}
