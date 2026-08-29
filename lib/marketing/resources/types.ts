/** Marketing resources: “Best X / X vs Z” articles for SEO + AI Overview citation. */

export type ResourceFaq = { question: string; answer: string };

export type ResourceComparisonRow = {
  name: string;
  bestFor: string;
  pricing: string;
  verdict: string;
  /** Optional competitor / product URL for context — not a paid placement. */
  href?: string;
};

export type ResourceArticle = {
  slug: string;
  /** Search-intent title: Best X for Z / X vs Y */
  title: string;
  description: string;
  publishedAt: string; // YYYY-MM-DD
  updatedAt: string;
  /** One-sentence answer AI can quote — appears first. */
  directAnswer: string;
  /** Short definition block. */
  definition: string;
  /** Comparison table rows (best-of / vs). */
  comparisons: ResourceComparisonRow[];
  /** Modular sections with H2 + short paragraphs. */
  sections: Array<{ heading: string; body: string }>;
  faqs: ResourceFaq[];
  /** Primary CTA path */
  ctaHref: string;
  ctaLabel: string;
  tags: string[];
};

export function articlePath(slug: string): string {
  return `/resources/${slug}`;
}
