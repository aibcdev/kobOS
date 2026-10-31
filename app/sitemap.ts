import type { MetadataRoute } from "next";
import { listResourceArticles, articlePath } from "@/lib/marketing/resources";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Each public page and the date its content (or title/description) last changed. Update the date when you change the
 * page; search engines use it to decide when to re-crawl, so build time would be wrong.
 */
const STATIC_PAGES: Record<string, string> = {
  "/": "2026-10-28",
  "/resources": "2026-10-28",
  "/product": "2026-10-28",
  "/pricing": "2026-10-28",
  "/trial": "2026-10-28",
  "/demo": "2026-10-28",
  "/solutions": "2026-10-28",
  "/go/audit": "2026-10-28",
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
};

function sitemapBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NETLIFY_PRODUCTION_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const local = getSiteUrl();
  // Never publish localhost URLs in sitemap.xml on a production deploy.
  if (local.includes("localhost") || local.includes("127.0.0.1")) return "https://trykob.com";
  return local;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = sitemapBaseUrl();
  const staticEntries: MetadataRoute.Sitemap = Object.entries(STATIC_PAGES).map(([path, updated]) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: new Date(updated),
    changeFrequency: path === "/resources" || path.startsWith("/go") ? "weekly" : "monthly",
    priority: path === "/" || path === "/go/audit" || path === "/resources" ? 0.9 : 0.6,
  }));

  const articles: MetadataRoute.Sitemap = listResourceArticles().map((article) => ({
    url: `${base}${articlePath(article.slug)}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...articles];
}
