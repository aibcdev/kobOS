/**
 * Reddit buying-intent phrases for KOB (restaurant growth / online presence).
 * Strategy adapted from high-intent public hand-raisers (recommendation / alternative / burned-by).
 */

export const REDDIT_INTENT_SUBREDDITS = [
  "restaurant",
  "restaurantowners",
  "smallbusiness",
  "Entrepreneur",
  "restaurateur",
  "KitchenConfidential",
] as const;

/** Core phrase templates — `{service}` / `{competitor}` filled from lists below. */
export const REDDIT_INTENT_PHRASE_TEMPLATES = [
  "anyone got recommendations for {service}",
  "alternative to {competitor}",
  "looking for a good {service}",
  "got burned by {competitor}",
  "has anyone used {competitor}",
  "anyone use {competitor}",
  "recommend a {service}",
  "best {service} for restaurants",
] as const;

/** What KOB sells / adjacent services restaurant owners ask for. */
export const REDDIT_KOB_SERVICES = [
  "restaurant website",
  "restaurant marketing",
  "google business profile",
  "online ordering",
  "restaurant SEO",
  "review management",
  "social media for restaurants",
  "restaurant CRM",
  "guest marketing",
  "restaurant growth software",
] as const;

/** Competitors / tools owners compare when shopping. */
export const REDDIT_KOB_COMPETITORS = [
  "Owner.com",
  "Toast",
  "ChowNow",
  "BentoBox",
  "GloriaFood",
  "SevenRooms",
  "OpenTable",
  "SpotHopper",
  "Popmenu",
  "Yelp Ads",
] as const;

/** Reddit search queries (compact — API rate limits). */
export function buildRedditIntentQueries(): string[] {
  const q = new Set<string>();
  for (const service of REDDIT_KOB_SERVICES) {
    q.add(`"recommendations for" ${service}`);
    q.add(`"looking for" ${service}`);
    q.add(`"best" ${service}`);
  }
  for (const competitor of REDDIT_KOB_COMPETITORS) {
    q.add(`"alternative to" ${competitor}`);
    q.add(`"has anyone used" ${competitor}`);
    q.add(`"got burned" ${competitor}`);
    q.add(`${competitor} worth it`);
  }
  // Broad intent in restaurant subs (phrase forms from the viral playbook)
  q.add("anyone got recommendations");
  q.add("looking for a good");
  q.add("alternative to");
  q.add("got burned");
  q.add("has anyone used");
  q.add("recommendations for restaurant website");
  q.add("recommendations for restaurant marketing");
  q.add("looking for restaurant software");
  q.add("anyone recommend online ordering");
  q.add("website for my restaurant");
  q.add("google business profile");
  return [...q];
}

export type RedditIntentConfig = {
  subreddits: string[];
  maxAgeHours: number;
  minScore: number;
  limitPerQuery: number;
};

export function getRedditIntentConfig(): RedditIntentConfig {
  const subs =
    process.env.REDDIT_INTENT_SUBREDDITS?.split(",")
      .map((s) => s.trim().replace(/^r\//i, ""))
      .filter(Boolean) ?? [...REDDIT_INTENT_SUBREDDITS];
  return {
    subreddits: subs.length ? subs : [...REDDIT_INTENT_SUBREDDITS],
    // Hard cap: never keep posts older than 1 year (override with REDDIT_INTENT_MAX_AGE_HOURS, max 8760).
    maxAgeHours: Math.min(
      365 * 24,
      Math.max(1, Number(process.env.REDDIT_INTENT_MAX_AGE_HOURS?.trim() || String(365 * 24)) || 365 * 24),
    ),
    minScore: Math.max(0, Number(process.env.REDDIT_INTENT_MIN_SCORE?.trim() || "0") || 0),
    limitPerQuery: Math.min(50, Math.max(5, Number(process.env.REDDIT_INTENT_LIMIT?.trim() || "25") || 25)),
  };
}
