import { clientIpFromHeaders, limit } from "@/lib/security/rate-limit";

export { clientIpFromHeaders };

export type SimpleRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/** Fixed-window rate limit by key (IP / email), shared across instances via `lib/security/rate-limit.ts`. */
export async function checkSimpleRateLimit(
  key: string,
  opts: { windowMs: number; max: number },
): Promise<SimpleRateLimitResult> {
  const r = await limit(key, { windowSec: Math.ceil(opts.windowMs / 1000), max: opts.max });
  return r.ok ? { ok: true } : { ok: false, retryAfterSec: r.retryAfterSec };
}
