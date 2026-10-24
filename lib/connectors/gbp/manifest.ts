import { GBP_SCOPE } from "@/lib/connectors/gbp/client";
import type { ConnectorManifest } from "@/lib/hub/manifest";

/**
 * Google Business Profile: reviews and the listing in; review replies, hours, posts and description out, each
 * only after the owner approves and each read back from Google. Uses the same Google OAuth client
 * as Analytics / Search Console. API access needs Google's Business Profile API approval, hence GBP_LIVE.
 */
export const gbpManifest: ConnectorManifest = {
  provider: "GBP",
  displayName: "Google Business Profile",
  category: "REVIEWS",
  regions: ["GB", "IE", "US", "CA", "AU", "NZ", "IN", "ZA"],
  auth: {
    kind: "OAUTH2_CODE",
    scopes: [GBP_SCOPE],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    pkce: true,
  },
  streams: [
    { name: "reviews", mode: "INCREMENTAL", schedule: "*/30 * * * *", backfillDays: 30, cursorField: "updateTime" },
    // Hours, photos, posts and profile, compared with the last read and the website; the morning job also runs it.
    { name: "listing", mode: "FULL", schedule: "0 */6 * * *", backfillDays: 0 },
  ],
  actions: ["gbp.review.reply", "gbp.hours.regular.update", "gbp.hours.special.set", "gbp.post.create", "gbp.profile.description.update"],
  rateLimit: { rpm: 300, concurrency: 1 },
  approval: {
    selfServe: false,
    partnerRequired: false,
    notes: "Business Profile API access request (quota > 0) must be approved by Google before any call succeeds.",
    flag: "GBP_LIVE",
  },
  dataContracts: ["reviews", "review_replies", "listing"],
  costNote: "Free API; quota granted per project.",
};
