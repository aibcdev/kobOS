/**
 * Which public pages have a clean Markdown copy for assistants and search tools (/pricing → /pricing.md, home →
 * /index.md). The copies are made at build time from the rendered pages listed in /sitemap.xml
 * (scripts/build-markdown.mjs); this list must match that sitemap, which markdown-pages.test.ts checks.
 * Client-safe: no imports.
 */
export const MARKDOWN_STATIC_PATHS = [
  "/",
  "/resources",
  "/product",
  "/pricing",
  "/trial",
  "/demo",
  "/solutions",
  "/features/website",
  "/features/online-ordering",
  "/features/delivery",
  "/features/branding",
  "/features/menu",
  "/about",
  "/roadmap",
  "/privacy",
  "/terms",
  "/data-management",
  "/for-ai",
] as const;

/** Sitemap paths that are redirects or forms, not readable pages. */
export const MARKDOWN_SKIPPED_PATHS = ["/go/audit", "/scan"] as const;

const STATIC = new Set<string>(MARKDOWN_STATIC_PATHS);

/** The Markdown copy of a page, or null when the page has none. */
export function markdownPathFor(path: string): string | null {
  const p = path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
  if (p === "/") return "/index.md";
  if (STATIC.has(p) || /^\/resources\/[a-z0-9-]+$/.test(p)) return `${p}.md`;
  return null;
}
