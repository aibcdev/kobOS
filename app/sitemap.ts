import type { MetadataRoute } from "next";
import { listResourceArticles, articlePath } from "@/lib/marketing/resources";
import { getSiteUrl } from "@/lib/site-url";

const STATIC_PATHS = [
  "/",
  "/resources",
  "/product",
  "/pricing",
  "/demo",
  "/solutions",
  "/go/audit",
  "/audit",
  "/features/website",
  "/features/online-ordering",
  "/features/delivery",
  "/features/branding",
  "/features/ai-menu",
  "/privacy",
  "/terms",
  "/for-ai",
] as const;

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
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
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
