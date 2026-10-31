/** Marketing resources: how-to guides and “Best X / X vs Z” comparisons for owners and search. */

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
  /** First H2: buyer question in plain English (AEO / Meta Muse). */
  questionH2: string;
  /** One-sentence answer that can be quoted on its own — appears first under questionH2. */
  directAnswer: string;
  /** Short definition block. */
  definition: string;
  /** Comparison table rows (best-of / vs). Empty for how-to guides; the table is then left out. */
  comparisons: ResourceComparisonRow[];
  /** Where each competitor fact comes from: their own pages, with the date checked. */
  sources?: Array<{ label: string; href: string }>;
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
