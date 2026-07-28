/** Origin used in magic-link redirects (dev: port 3000). */
export function getAuthOrigin(): string {
  const fromApp = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const fromSite = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  const isLocal = (u: string) => /localhost|127\.0\.0\.1/i.test(u);
  // Netlify / production must never email localhost magic links.
  const deployed = Boolean(process.env.NETLIFY || process.env.CONTEXT === "production");

  if (deployed) {
    if (fromApp && !isLocal(fromApp)) return fromApp;
    if (fromSite && !isLocal(fromSite)) return fromSite;
  }
  if (fromApp) return fromApp;
  if (fromSite) return fromSite;
  return "http://localhost:3000";
}
