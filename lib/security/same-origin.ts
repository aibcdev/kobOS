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
  // req.url may not carry the public host (dev server, proxies); the Host the browser used does.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const fromHost = host ? `${proto}://${host}` : null;
  // Netlify sets URL (production) and DEPLOY_PRIME_URL / DEPLOY_URL (deploy previews and branch deploys).
  const configured = [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_SITE_URL, process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL];
  for (const raw of [req.url, fromHost, ...configured]) {
    if (!raw?.trim()) continue;
    try {
      allowed.add(new URL(raw).origin);
    } catch {
      // ignore malformed env
    }
  }
  return allowed.has(origin);
}
