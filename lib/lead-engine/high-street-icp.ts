/**
 * High-street independent restaurant ICP — excludes fast food, pubs,
 * and venues that look closed / abandoned online.
 */

const MS_DAY = 86_400_000;
const IG_INACTIVE_DAYS = 730; // 2 years
const REVIEW_INACTIVE_DAYS = 180; // 6 months

/** Pure takeaway / fast-food / pub formats — wrong buyer for brand spend. */
const FAST_FOOD_OR_PUB_NAME = [
  /\bchippy\b/i,
  /\bfish\s*(&|and)?\s*chip/i,
  /\bfish\s*bar\b/i,
  /\bfisheries\b/i,
  /\bchip\s*inn\b/i,
  /\bplaice\b/i,
  /\bfried\s*(&|and)?\s*grilled\s*chicken\b/i,
  /\bfried\s*chicken\b/i,
  /\bgrilled\s*chicken\b/i,
  /\bperi[\s-]?peri\b/i,
  /\bkrispy\b/i,
  /\bkebab\b/i,
  /\bd[oö]ner\b/i,
  /\bshawarma\b/i,
  /\bpizza\s*(&|and)?\s*kebab\b/i,
  /\bpizza\s*(hut|express|go|guys?)\b/i,
  /\bhot\s*dogs?\b/i,
  /\bgrab\s*(&|and)?\s*go\b/i,
  /\bfast\s*food\b/i,
  /\bdrive[\s-]?thru\b/i,
  /\btakeaway\b/i,
  /\btake[\s-]?out\b/i,
  /\bpub\b/i,
  /\b(arms|tavern|ale\s*house|tap\s*house|taproom)\b/i,
  /\bwetherspoons?\b/i,
  /\bburger\s*(bar|king|joint)\b/i,
  /\bchicken\s*shop\b/i,
  /\bbakery\b/i,
  /\bcafe\b/i,
  /\bcafé\b/i,
  /\bcoffee\s*(shop|house|bar)\b/i,
  /\bbreakfast\b/i,
  /\bdessert\b/i,
  /\bbubble\s*tea\b/i,
  /\bice\s*cream\b/i,
  /\bsubway\b/i,
  /\bkfc\b/i,
  /\bsfc\b/i,
  /\bmc.?donald/i,
  /\bnando'?s\b/i,
  /\bspar\b/i,
  /\bservice\s*station\b/i,
  /\bcharcoal\s*grill\b/i,
  /\bpinkberry\b/i,
  /\biron\s+duke\b/i,
  /\bship\s*&\s*pelican\b/i,
  /\byogurt\b/i,
  /\byoghurt\b/i,
];

export type HighStreetIcpInput = {
  name: string;
  websiteUrl?: string | null;
  reviewCount?: number | null;
  /** Google reviews only — hard floor. */
  googleReviewMin?: number;
  lastReviewAt?: Date | string | null;
  instagramUrl?: string | null;
  instagramPostGapDays?: number | null;
  /** Prefer true dine-in restaurants. */
  businessType?: string | null;
  deliveryPlatforms?: string[] | null;
  hasOnlineOrdering?: boolean | null;
};

export function isFastFoodOrPubFormat(name: string): boolean {
  return FAST_FOOD_OR_PUB_NAME.some((re) => re.test(name.trim()));
}

/**
 * Dead online: no Instagram posts in 2 years (or no IG presence) AND
 * last known Google review older than 6 months.
 *
 * Unknown lastReviewAt → not enough evidence here (caller may treat
 * null lastReviewAt + no Instagram as inactive after enrichment).
 * Instagram URL present but gap unmeasured → not enough evidence on IG side.
 */
export function isLikelyClosedOrAbandoned(input: {
  lastReviewAt?: Date | string | null;
  instagramUrl?: string | null;
  instagramPostGapDays?: number | null;
}): boolean {
  const now = Date.now();
  const lastReview =
    input.lastReviewAt == null
      ? null
      : input.lastReviewAt instanceof Date
        ? input.lastReviewAt
        : new Date(input.lastReviewAt);
  if (!lastReview || Number.isNaN(lastReview.getTime())) return false;
  const reviewStale = now - lastReview.getTime() > REVIEW_INACTIVE_DAYS * MS_DAY;
  if (!reviewStale) return false;

  const igGap = input.instagramPostGapDays;
  const hasIgUrl = Boolean(input.instagramUrl?.trim());
  const igInactive =
    (igGap != null && igGap >= IG_INACTIVE_DAYS) || (!hasIgUrl && igGap == null);

  return igInactive;
}

/** High-street restaurant that also does takeaway/delivery — not chippy/pub/cafe. */
export function passesHighStreetRestaurantIcp(
  input: HighStreetIcpInput,
): { ok: true } | { ok: false; reason: string } {
  const googleMin = input.googleReviewMin ?? 100;
  const googleReviews = input.reviewCount ?? 0;
  if (googleReviews < googleMin) {
    return { ok: false, reason: "reviews_under_100" };
  }

  if (isFastFoodOrPubFormat(input.name)) {
    return { ok: false, reason: "fast_food_or_pub" };
  }

  if (
    isLikelyClosedOrAbandoned({
      lastReviewAt: input.lastReviewAt,
      instagramUrl: input.instagramUrl,
      instagramPostGapDays: input.instagramPostGapDays,
    })
  ) {
    return { ok: false, reason: "inactive_online" };
  }

  const type = (input.businessType || "").toUpperCase();
  if (type === "CAFE" || type === "TAKEAWAY") {
    return { ok: false, reason: "not_restaurant_format" };
  }

  // Prefer restaurants / small groups; unknown type OK (Google Places often maps to restaurant).
  if (type && type !== "RESTAURANT" && type !== "SMALL_GROUP") {
    return { ok: false, reason: "not_restaurant_format" };
  }

  return { ok: true };
}
