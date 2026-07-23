/** Fixed-window rate limit by key (IP / email). Single-node; fine for Netlify until Redis. */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 4000) return;
  for (const [k, v] of buckets) {
    if (now > v.resetAt) buckets.delete(k);
  }
}

export type SimpleRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function checkSimpleRateLimit(
  key: string,
  opts: { windowMs: number; max: number },
): SimpleRateLimitResult {
  const k = key.trim().slice(0, 160) || "unknown";
  const now = Date.now();
  prune(now);
  const b = buckets.get(k);
  if (!b || now > b.resetAt) {
    buckets.set(k, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (b.count >= opts.max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true };
}

export function clientIpFromHeaders(h: Headers): string | null {
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return h.get("x-real-ip")?.trim() || null;
}
