/**
 * Review ask after a happy audit / trial. Send manually — never buy reviews.
 *
 *   npx tsx scripts/outbound-review-ask.ts --name "Venue" --email owner@example.com
 */
import { REVIEW_LISTINGS } from "./review-listings";

export function reviewAskEmail(restaurantName: string): { subject: string; body: string } {
  const name = restaurantName.trim() || "there";
  return {
    subject: `Quick favour — ${name}`,
    body: `Hi,

Glad the KOB audit was useful.

If you have 2 minutes, an honest review helps other independent owners (G2 / Capterra / Product Hunt). No payment, no pressure.

- G2: ${REVIEW_LISTINGS.g2Search}
- Capterra: ${REVIEW_LISTINGS.capterraSearch}
- Product Hunt: ${REVIEW_LISTINGS.productHunt}

Thanks,
KOB
hello@trykob.com
`,
  };
}

export const REVIEW_ASK_PLAYBOOK = `
When to send: after a completed audit they opened, or after 7 days of paid/trial with no complaint.
Who sends: founder / support from hello@trykob.com.
Do not: pay for reviews, gate features on a review, or spam the same owner twice.
Target: real G2 / Capterra / Product Hunt scores — Google spam updates punish fake review schemes.
`;
