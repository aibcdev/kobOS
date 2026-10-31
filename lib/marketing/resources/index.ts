import { RESOURCE_ARTICLES } from "./articles";
import type { ResourceArticle } from "./types";
import { articlePath } from "./types";

export type { ResourceArticle, ResourceFaq, ResourceComparisonRow } from "./types";
export { articlePath } from "./types";

/** Drafts show in dev so they can be reviewed, and nowhere in production. */
export const isPublished = (a: ResourceArticle) => a.status !== "draft";

function visibleArticles(): ResourceArticle[] {
  return process.env.NODE_ENV === "production" ? RESOURCE_ARTICLES.filter(isPublished) : RESOURCE_ARTICLES;
}

export function listResourceArticles(): ResourceArticle[] {
  return [...visibleArticles()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getResourceArticle(slug: string): ResourceArticle | undefined {
  return visibleArticles().find((a) => a.slug === slug);
}

export function listResourceSlugs(): string[] {
  return visibleArticles().map((a) => a.slug);
}

export function resourceArticleUrl(slug: string, siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}${articlePath(slug)}`;
}
