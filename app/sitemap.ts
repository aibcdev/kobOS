import type { MetadataRoute } from "next";
import { listResourceArticles, articlePath } from "@/lib/marketing/resources";
import { getSiteUrl } from "@/lib/site-url";
import { STATIC_PAGES } from "@/lib/seo/static-pages";

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
