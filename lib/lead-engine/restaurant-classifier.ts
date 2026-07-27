/**
 * KOB Restaurant Classifier — first filter after scrape, before ICP scoring.
 * Rejects caterers, event/wedding ops, pure delivery/ghost kitchens, food trucks.
 */

export type RestaurantClassifierConfidence = "high" | "medium" | "low";

export type RestaurantClassifierInput = {
  name: string;
  categories?: string[] | null;
  description?: string | null;
  websiteText?: string | null;
  /** Google Places dineIn attribute when known. */
  hasDineIn?: boolean | null;
  /** Optional review snippets for theme check. */
  reviewTexts?: string[] | null;
};

export type RestaurantClassifierResult = {
  is_restaurant: boolean;
  confidence: RestaurantClassifierConfidence;
  reason: string;
  category_matched: string | null;
  flags: string[];
};

/** Accept — core restaurant / café / cuisine categories (substring match). */
export const ACCEPT_CATEGORIES = [
  "restaurant",
  "cafe",
  "café",
  "brasserie",
  "bistro",
  "diner",
  "steak house",
  "steakhouse",
  "pizza restaurant",
  "seafood restaurant",
  "sushi restaurant",
  "fine dining restaurant",
  "fast food restaurant",
  "takeaway",
  "meal_takeaway",
  "indian restaurant",
  "pakistani restaurant",
  "turkish restaurant",
  "chinese restaurant",
  "italian restaurant",
  "thai restaurant",
  "japanese restaurant",
  "mexican restaurant",
  "greek restaurant",
  "lebanese restaurant",
  "caribbean restaurant",
  "african restaurant",
  "mediterranean restaurant",
  "korean restaurant",
  "vietnamese restaurant",
  "french restaurant",
  "spanish restaurant",
  "british restaurant",
  "american restaurant",
  "barbecue restaurant",
  "ramen restaurant",
  "burger restaurant",
] as const;

/** Hard reject — catering / events / non-dining. */
export const HARD_REJECT_CATEGORIES = [
  "caterer",
  "catering",
  "event venue",
  "wedding venue",
  "wedding caterer",
  "corporate caterer",
  "food producer",
  "meal delivery",
  "meal_delivery",
  "ghost kitchen",
  "delivery restaurant",
  "food truck",
  "food_truck",
  "event planner",
  "party planner",
  "banquet hall",
  "convention center",
] as const;

const REJECT_KEYWORDS = [
  "wedding catering",
  "corporate catering",
  "event catering",
  "catering packages",
  "event packages",
  "get a quote for your event",
  "wedding menu",
  "corporate lunch",
  "outside catering",
  "mobile catering",
  "private chef for events",
  "catering for weddings",
  "corporate packages",
  "event quote",
  "book us for your event",
  "office catering",
  "buffet catering",
  // Non-restaurants attached via domain collision
  "web designer",
  "web design",
  "web developer",
  "freelance web",
  "logo design",
  "seo agency",
  "seo company",
  "digital marketing agency",
  "graphic design",
  "name card design",
  "flyer design",
  "brochure design",
  "website design singapore",
  "singapore web design",
];

const POSITIVE_SIGNALS = [
  "book a table",
  "reserve a table",
  "reservations",
  "dine in",
  "dine-in",
  "our restaurant",
  "visit us",
  "opening hours",
  "walk-ins welcome",
  "walk-in welcome",
  "table booking",
  "book online",
];

const NAME_HARD_REJECT = [
  /\bevent\s+cater/i,
  /\bwedding\s+cater/i,
  /\bcorporate\s+cater/i,
  /\bcatering\s+(co|company|ltd|limited|services?)\b/i,
  /\boutside\s+cater/i,
  /\bmobile\s+cater/i,
  /\bghost\s+kitchen\b/i,
  /\bcloud\s+kitchen\b/i,
  /\bfood\s+truck\b/i,
  /\bwedding\s+venue\b/i,
];

const EVENT_REVIEW_RE =
  /\b(wedding|office\s+lunch|corporate\s+event|catered\s+for|for\s+our\s+(wedding|party|event)|delivered\s+for\s+our)\b/i;
const VISIT_REVIEW_RE =
  /\b(atmosphere|waiter|waitress|table|dined|sat\s+down|walked\s+in|service\s+was|staff\s+were|ambience|cozy|cosy)\b/i;

function normalizeCategories(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  return raw
    .map((c) => c.toLowerCase().trim().replace(/_/g, " "))
    .filter(Boolean);
}

function categoryHits(categories: string[], needles: readonly string[]): string | null {
  for (const cat of categories) {
    for (const bad of needles) {
      if (cat.includes(bad.toLowerCase())) return cat;
    }
  }
  return null;
}

/**
 * Classify whether a scraped business is a real restaurant (or strong public takeaway).
 * Run this before ICP / opportunity scoring.
 */
export function classifyRestaurant(data: RestaurantClassifierInput): RestaurantClassifierResult {
  const flags: string[] = [];
  const categories = normalizeCategories(data.categories ?? null);
  const primaryCategory = categories[0] ?? "";
  const name = (data.name || "").toLowerCase();
  const description = (data.description || "").toLowerCase();
  const websiteText = (data.websiteText || "").toLowerCase();
  const combinedText = `${name} ${description} ${websiteText}`;

  // 0. Name hard rejects
  for (const re of NAME_HARD_REJECT) {
    if (re.test(data.name || "")) {
      return {
        is_restaurant: false,
        confidence: "high",
        reason: `Hard reject name pattern: ${re.source}`,
        category_matched: primaryCategory || null,
        flags: ["hard_reject_name"],
      };
    }
  }

  // 1. Hard reject on category
  const badCat = categoryHits(categories, HARD_REJECT_CATEGORIES);
  if (badCat) {
    return {
      is_restaurant: false,
      confidence: "high",
      reason: `Hard reject category: ${badCat}`,
      category_matched: badCat,
      flags: ["hard_reject_category"],
    };
  }

  // 2. Hard reject on keywords (website / description / name)
  for (const kw of REJECT_KEYWORDS) {
    if (combinedText.includes(kw)) {
      // Hybrids: if strong dine-in / book-a-table language, soft-flag instead of hard reject
      const hasPositive = POSITIVE_SIGNALS.some((sig) => combinedText.includes(sig));
      const hasDineIn =
        data.hasDineIn === true ||
        combinedText.includes("dine-in") ||
        combinedText.includes("dine in") ||
        combinedText.includes("book a table");
      if (hasPositive && hasDineIn) {
        flags.push("catering_keyword_but_dine_in");
        break;
      }
      return {
        is_restaurant: false,
        confidence: "high",
        reason: `Reject keyword found: '${kw}'`,
        category_matched: primaryCategory || null,
        flags: ["hard_reject_keyword"],
      };
    }
  }

  // 3. Must have at least one acceptable category when categories are present
  let matched: string | null = null;
  if (categories.length > 0) {
    matched = categoryHits(categories, ACCEPT_CATEGORIES);
    if (!matched) {
      return {
        is_restaurant: false,
        confidence: "high",
        reason: "No acceptable restaurant category found",
        category_matched: primaryCategory || null,
        flags: ["no_restaurant_category"],
      };
    }
  } else {
    // No Google categories yet — allow through only if name/website look like a restaurant
    const looksLikeRestaurant =
      /\b(restaurant|bistro|brasserie|kitchen|grill|diner|eatery|pizzeria|trattoria|tandoori|curry\s*house)\b/i.test(
        data.name,
      ) || POSITIVE_SIGNALS.some((sig) => combinedText.includes(sig));
    if (!looksLikeRestaurant && /\b(cater|wedding|event\s+hire)\b/i.test(combinedText)) {
      return {
        is_restaurant: false,
        confidence: "medium",
        reason: "No categories and catering/event language without restaurant signals",
        category_matched: null,
        flags: ["no_category_catering_language"],
      };
    }
    if (looksLikeRestaurant) {
      matched = "inferred_from_name_or_site";
      flags.push("categories_missing_inferred");
    } else {
      // Unknown — medium reject to avoid catering leak when we lack types
      // But discovery already used includedType=restaurant; allow with low confidence
      matched = "unknown_pending_categories";
      flags.push("categories_missing_allowed");
    }
  }

  // 4. Borderline: takeaway / cafe / fast food without dine-in or restaurant language
  const isBorderline = Boolean(
    matched &&
      (matched.includes("takeaway") ||
        matched.includes("cafe") ||
        matched.includes("café") ||
        matched.includes("fast food") ||
        matched.includes("meal takeaway")),
  );

  const hasPositive = POSITIVE_SIGNALS.some((sig) => combinedText.includes(sig));
  const hasDineIn =
    data.hasDineIn === true ||
    combinedText.includes("dine-in") ||
    combinedText.includes("dine in");

  if (isBorderline && !hasPositive && !hasDineIn) {
    return {
      is_restaurant: false,
      confidence: "medium",
      reason: `Borderline category '${matched}' without dine-in or restaurant language`,
      category_matched: matched,
      flags: ["borderline_rejected"],
    };
  }

  // 5. Review theme: overwhelmingly events → reject
  const reviews = (data.reviewTexts ?? []).map((r) => r.toLowerCase()).filter(Boolean);
  if (reviews.length >= 3) {
    const eventHits = reviews.filter((r) => EVENT_REVIEW_RE.test(r)).length;
    const visitHits = reviews.filter((r) => VISIT_REVIEW_RE.test(r)).length;
    if (eventHits >= 2 && visitHits === 0) {
      return {
        is_restaurant: false,
        confidence: "medium",
        reason: "Review themes overwhelmingly about events / catering, not dining visits",
        category_matched: matched,
        flags: ["event_review_theme"],
      };
    }
    if (eventHits > visitHits && eventHits >= 3) {
      flags.push("event_heavy_reviews");
    }
  }

  const confidence: RestaurantClassifierConfidence = isBorderline ? "medium" : "high";
  if (isBorderline) flags.push("borderline_accepted");
  if (flags.includes("catering_keyword_but_dine_in")) {
    flags.push("hybrid_accepted");
  }

  return {
    is_restaurant: true,
    confidence,
    reason: "Passed restaurant classifier",
    category_matched: matched,
    flags,
  };
}

/** Short log line for rejection telemetry. */
export function formatClassifierReject(name: string, result: RestaurantClassifierResult): string {
  return `[restaurant-classifier] REJECT ${name}: ${result.reason} (${result.flags.join(",")})`;
}
