/** Simple fixed-window rate limiting by key (IP). Fine for single-node / low volume; use Redis in production at scale. */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = Math.max(60_000, (Number(process.env.AUDIT_RATE_LIMIT_WINDOW_SEC) || 3600) * 1000);
const MAX = Math.max(1, Number(process.env.AUDIT_RATE_LIMIT_MAX_REQUESTS) || 30);

function prune(now: number) {
  if (buckets.size < 4000) return;
  for (const [k, v] of buckets) {
    if (now > v.resetAt) buckets.delete(k);
  }
}

export type AuditRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Returns whether the request should proceed. Disabled when `AUDIT_RATE_LIMIT_DISABLED=1`.
 */
export function checkAuditRunRateLimit(key: string | null): AuditRateLimitResult {
  if (process.env.AUDIT_RATE_LIMIT_DISABLED === "1") {
    return { ok: true };
  }

  const k = (key?.trim() || "unknown").slice(0, 128);
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

export function clientIpFromHeaders(h: Headers): string | null {
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return h.get("x-real-ip")?.trim() || null;
}
