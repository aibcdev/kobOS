/**
 * Each public page and the date its content (or title/description) last changed. Update the date when you change the
 * page; search engines use it to decide when to re-crawl, so build time would be wrong.
 * Client-safe: no imports. Read by app/sitemap.ts, the article link checks and the redirect test.
 */
export const STATIC_PAGES: Record<string, string> = {
  "/": "2026-10-28",
  "/resources": "2026-10-28",
  "/product": "2026-10-31",
  "/pricing": "2026-10-31",
  "/trial": "2026-10-28",
  "/demo": "2026-10-28",
  "/solutions": "2026-10-28",
  "/go/audit": "2026-10-31",
  "/features/website": "2026-10-28",
  "/features/online-ordering": "2026-10-28",
  "/features/delivery": "2026-10-28",
  "/features/branding": "2026-10-28",
  "/features/menu": "2026-10-28",
  "/about": "2026-10-28",
  "/roadmap": "2026-10-28",
  "/privacy": "2026-10-28",
  "/terms": "2026-10-28",
  "/data-management": "2026-10-28",
  "/press": "2026-10-31",
  "/tools/review-time-calculator": "2026-10-31",
  "/tools/review-reply-templates": "2026-10-31",
};
