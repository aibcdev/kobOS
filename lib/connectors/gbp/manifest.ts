import { GBP_SCOPE } from "@/lib/connectors/gbp/client";
import type { ConnectorManifest } from "@/lib/hub/manifest";

/**
 * Google Business Profile: reviews in, review replies out (Spec 1 T-20/T-21/T-24). Uses the same Google OAuth client
 * as Analytics / Search Console. API access needs Google's Business Profile API approval, hence GBP_LIVE.
 */
export const gbpManifest: ConnectorManifest = {
  provider: "GBP",
  displayName: "Google Business Profile",
  category: "REVIEWS",
  regions: ["GB", "IE", "US", "CA", "AU", "NZ"],
  auth: {
    kind: "OAUTH2_CODE",
    scopes: [GBP_SCOPE],
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    pkce: true,
  },
  streams: [{ name: "reviews", mode: "INCREMENTAL", schedule: "*/30 * * * *", backfillDays: 30, cursorField: "updateTime" }],
  actions: ["gbp.review.reply"],
  rateLimit: { rpm: 300, concurrency: 1 },
  approval: {
    selfServe: false,
    partnerRequired: false,
    notes: "Business Profile API access request (quota > 0) must be approved by Google before any call succeeds.",
    flag: "GBP_LIVE",
  },
  dataContracts: ["reviews", "review_replies"],
  costNote: "Free API; quota granted per project.",
};
