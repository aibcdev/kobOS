/**
 * Hard format excludes for outbound — keep narrow.
 * Quality gate is scoreIcp ≥70, not name regex theatre.
 */

const MS_DAY = 86_400_000;
const IG_INACTIVE_DAYS = 730; // 2 years
const REVIEW_INACTIVE_DAYS = 180; // 6 months

/** Obvious non-buyers for KOB brand spend — not every café / pizza place. */
const FAST_FOOD_OR_PUB_NAME = [
  /\bchippy\b/i,
  /\bfish\s*(&|and)?\s*chip/i,
  /\bfish\s*bar\b/i,
  /\bfisheries\b/i,
  /\bchip\s*inn\b/i,
  /\bfried\s*chicken\b/i,
  /\bkrispy\b/i,
  /\bkebab\b/i,
  /\bd[oö]ner\b/i,
  /\bshawarma\b/i,
  /\bpizza\s*(&|and)?\s*kebab\b/i,
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
  /\bsubway\b/i,
  /\bkfc\b/i,
  /\bsfc\b/i,
  /\bmc.?donald/i,
  /\bnando'?s\b/i,
  /\bservice\s*station\b/i,
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
  businessType?: string | null;
  deliveryPlatforms?: string[] | null;
  hasOnlineOrdering?: boolean | null;
};

export function isFastFoodOrPubFormat(name: string): boolean {
  return FAST_FOOD_OR_PUB_NAME.some((re) => re.test(name.trim()));
}

/**
 * Dead online: no Instagram posts in 2 years (or no IG) AND
 * last Google review older than 6 months.
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

/** Pre-score format gate — chain/fast-food/dead venues only. Score ≥70 decides fit. */
export function passesHighStreetRestaurantIcp(
  input: HighStreetIcpInput,
): { ok: true } | { ok: false; reason: string } {
  const googleMin = input.googleReviewMin ?? 50;
  const googleReviews = input.reviewCount ?? 0;
  if (googleReviews < googleMin) {
    return { ok: false, reason: "reviews_too_low" };
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
  // Soft: only hard-exclude explicit cafe/takeaway labels when set
  if (type === "CAFE" || type === "TAKEAWAY") {
    return { ok: false, reason: "not_restaurant_format" };
  }

  return { ok: true };
}
