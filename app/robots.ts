import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

function robotsBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NETLIFY_PRODUCTION_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const local = getSiteUrl();
  if (local.includes("localhost") || local.includes("127.0.0.1")) return "https://trykob.com";
  return local;
}

export default function robots(): MetadataRoute.Robots {
  const base = robotsBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/studio", "/api/", "/login", "/signup", "/review/"],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/studio", "/api/", "/login", "/signup", "/review/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/studio", "/api/", "/login", "/signup", "/review/"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/studio", "/api/", "/login", "/signup", "/review/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/studio", "/api/", "/login", "/signup", "/review/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/studio", "/api/", "/login", "/signup", "/review/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
