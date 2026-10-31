import { describe, expect, it, vi } from "vitest";
import { RESOURCE_ARTICLES } from "./articles";
import { isPublished } from "./index";
import { articlePath } from "./types";
import { STATIC_PAGES } from "@/lib/seo/static-pages";

const published = RESOURCE_ARTICLES.filter(isPublished);
const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).filter(Boolean).length;
const known = new Set([...Object.keys(STATIC_PAGES), ...published.map((a) => articlePath(a.slug))]);

describe("published guides (search titles, snippets and links)", () => {
  it.each(published.map((a) => [a.slug, a] as const))("%s", (_, a) => {
    expect(a.slug).toMatch(/^[a-z0-9-]+$/);
    expect(a.title.length, "title ≤ 60").toBeLessThanOrEqual(60);
    expect(a.description.length, "description ≥ 70").toBeGreaterThanOrEqual(70);
    expect(a.description.length, "description ≤ 160").toBeLessThanOrEqual(160);
    if (a.tldr) {
      expect(sentences(a.tldr), "tldr 2–3 sentences").toBeGreaterThanOrEqual(2);
      expect(sentences(a.tldr), "tldr 2–3 sentences").toBeLessThanOrEqual(3);
      expect(a.tldr.length, "tldr ≤ 320").toBeLessThanOrEqual(320);
    }
    for (const link of a.linkFrom ?? []) {
      expect(known.has(link.path), `linkFrom ${link.path} is a real page`).toBe(true);
      expect(link.path).not.toBe(articlePath(a.slug));
    }
    if (a.tool) expect(known.has(a.tool.href), `tool ${a.tool.href} is a real page`).toBe(true);
    expect(JSON.stringify(a)).not.toContain("TODO(Akeem)");
  });

  it("guides published after the 28 Oct 2026 pass open with a TLDR", () => {
    expect(published.filter((a) => a.publishedAt > "2026-10-28" && !a.tldr).map((a) => a.slug)).toEqual([]);
  });

  it("slugs are unique", () => {
    expect(new Set(RESOURCE_ARTICLES.map((a) => a.slug)).size).toBe(RESOURCE_ARTICLES.length);
  });
});

describe("drafts", () => {
  it("are hidden in production (no route, sitemap or llms.txt) and visible in dev", async () => {
    const { getResourceArticle, listResourceArticles, listResourceSlugs } = await import("./index");
    const draft = { ...RESOURCE_ARTICLES[0], slug: "draft-example", status: "draft" as const };
    RESOURCE_ARTICLES.push(draft);
    try {
      vi.stubEnv("NODE_ENV", "production");
      expect(getResourceArticle("draft-example")).toBeUndefined();
      expect(listResourceSlugs()).not.toContain("draft-example");
      expect(listResourceArticles().map((a) => a.slug)).not.toContain("draft-example");
      vi.stubEnv("NODE_ENV", "development");
      expect(getResourceArticle("draft-example")?.slug).toBe("draft-example");
    } finally {
      RESOURCE_ARTICLES.pop();
      vi.unstubAllEnvs();
    }
  });
});
