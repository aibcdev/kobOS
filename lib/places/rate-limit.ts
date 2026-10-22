import { dailyBudget, limit } from "@/lib/security/rate-limit";

const WINDOW_SEC = Math.max(30, Number(process.env.PLACES_RATE_LIMIT_WINDOW_SEC) || 3600);
const MAX = Math.max(1, Number(process.env.PLACES_RATE_LIMIT_MAX_REQUESTS) || 80);

export type PlacesRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/** /api/places/* per IP (separate bucket from audit runs). Disabled when `PLACES_RATE_LIMIT_DISABLED=1`. */
export async function checkPlacesRateLimit(key: string | null): Promise<PlacesRateLimitResult> {
  if (process.env.PLACES_RATE_LIMIT_DISABLED === "1") return { ok: true };
  const r = await limit(`places:${(key?.trim() || "unknown").slice(0, 128)}`, { windowSec: WINDOW_SEC, max: MAX });
  if (!r.ok) return { ok: false, retryAfterSec: r.retryAfterSec };
  const day = await dailyBudget("places", "PLACES_DAILY_MAX", 10_000);
  return day.ok ? { ok: true } : { ok: false, retryAfterSec: day.retryAfterSec };
}
