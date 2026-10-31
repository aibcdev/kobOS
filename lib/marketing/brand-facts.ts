import { FREE_TRIAL_LABEL, TRIAL_DAYS } from "@/lib/billing/offer";
import { POSTING } from "@/lib/marketing/feature-status";

/**
 * Who KOB is, said one way everywhere: the site, structured data, the writers page and third-party listings.
 * Prices live in lib/billing/regional-pricing.ts; read them from there.
 *
 * listingName: the briefs ask for "Kob Business" on third-party listings (G2 already uses it), while
 * kob-outbound/listing-facts.md says "KOB". Akeem to confirm; change it here only.
 */
export const BRAND = {
  productName: "KOB",
  listingName: "Kob Business",
  siteUrl: "https://trykob.com",
  contactEmail: "hello@trykob.com",
  shortDescription: "The restaurant manager for independent restaurants: review replies and Google listing fixes, owner-approved.",
  longDescription: `KOB looks after the day-to-day admin independent restaurants never have time for. ${POSTING.reviews} It drafts fixes to your Google listing, checks your website like a guest would, and sends a morning brief of what needs you today. ${POSTING.control}`,
  trial: { label: `${FREE_TRIAL_LABEL}, no card`, days: TRIAL_DAYS, cardRequired: false },
} as const;
