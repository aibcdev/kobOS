/** Origin used in magic-link redirects (dev: port 3000). */
export function getAuthOrigin(): string {
  const fromApp = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromApp) return fromApp.replace(/\/$/, "");
  const fromSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromSite) return fromSite.replace(/\/$/, "");
  return "http://localhost:3000";
}
