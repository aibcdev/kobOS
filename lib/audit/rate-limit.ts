import { clientIpFromHeaders, limit } from "@/lib/security/rate-limit";

export { clientIpFromHeaders };

const WINDOW_SEC = Math.max(60, Number(process.env.AUDIT_RATE_LIMIT_WINDOW_SEC) || 3600);
const MAX = Math.max(1, Number(process.env.AUDIT_RATE_LIMIT_MAX_REQUESTS) || 30);

export type AuditRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/** Audit runs per IP. Disabled when `AUDIT_RATE_LIMIT_DISABLED=1`. */
export async function checkAuditRunRateLimit(key: string | null): Promise<AuditRateLimitResult> {
  if (process.env.AUDIT_RATE_LIMIT_DISABLED === "1") return { ok: true };
  const r = await limit(`audit-run:${(key?.trim() || "unknown").slice(0, 128)}`, { windowSec: WINDOW_SEC, max: MAX });
  return r.ok ? { ok: true } : { ok: false, retryAfterSec: r.retryAfterSec };
}
