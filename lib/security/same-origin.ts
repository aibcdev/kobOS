/**
 * CSRF guard for state-changing routes that rely on the session cookie. Accepts the request's own origin and the
 * configured app/site URLs; when the browser sends no Origin, falls back to `Sec-Fetch-Site`.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) {
    const site = req.headers.get("sec-fetch-site");
    return !site || site === "same-origin" || site === "none";
  }
  const allowed = new Set<string>();
  for (const raw of [req.url, process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!raw?.trim()) continue;
    try {
      allowed.add(new URL(raw).origin);
    } catch {
      // ignore malformed env
    }
  }
  return allowed.has(origin);
}
