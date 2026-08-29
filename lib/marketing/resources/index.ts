import { RESOURCE_ARTICLES } from "./articles";
import type { ResourceArticle } from "./types";
import { articlePath } from "./types";

export type { ResourceArticle, ResourceFaq, ResourceComparisonRow } from "./types";
export { articlePath } from "./types";

export function listResourceArticles(): ResourceArticle[] {
  return [...RESOURCE_ARTICLES].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getResourceArticle(slug: string): ResourceArticle | undefined {
  return RESOURCE_ARTICLES.find((a) => a.slug === slug);
}

export function listResourceSlugs(): string[] {
  return RESOURCE_ARTICLES.map((a) => a.slug);
}

export function resourceArticleUrl(slug: string, siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}${articlePath(slug)}`;
}
