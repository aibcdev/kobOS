/**
 * Every path redirect the site serves, in one list (next.config.ts reads it). redirects.test.ts checks there are no
 * duplicates and no chains, and that each destination is a real page. Host redirects (http → https, www → apex)
 * live in netlify.toml.
 */
export type SiteRedirect = { source: string; destination: string; permanent: boolean };

export const REDIRECTS: SiteRedirect[] = [
  // Aliases → dedicated Google Ads audit landing
  { source: "/ads/audit", destination: "/go/audit", permanent: false },
  { source: "/google/audit", destination: "/go/audit", permanent: false },
  { source: "/audit", destination: "/scan", permanent: true },
  { source: "/dashboard", destination: "/app", permanent: false },
  { source: "/features/ai-menu", destination: "/features/menu", permanent: true },
];

/** Real destinations that aren't in the sitemap on purpose: the scan search box (noindex) and the signed-in app. */
export const UNLISTED_DESTINATIONS = ["/scan", "/app"] as const;
