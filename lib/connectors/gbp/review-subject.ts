import type { CustomerReview } from "@prisma/client";

const SAFETY = /\b(food poisoning|poison(ed|ing)?|allerg(y|ic|ies)|anaphyla\w*|sick|vomit\w*|ill(ness)?|hospital|diarrh\w*|hair in|glass in|raw chicken|undercooked|cockroach\w*|rat|mice|mouse)\b/i;

/** What the policy engine reads: low stars raise severity; health and hygiene complaints always ask. */
export function reviewSubject(r: Pick<CustomerReview, "rating" | "body">): { rating: number; severity: number; safety: boolean } {
  return { rating: r.rating, severity: r.rating <= 2 ? 2 : r.rating === 3 ? 1 : 0, safety: SAFETY.test(r.body) };
}

export const reviewTaskKey = (reviewName: string) => `gbp-review:${reviewName}`;
