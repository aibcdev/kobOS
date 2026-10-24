import type { ConnectorManifest } from "@/lib/hub/manifest";

/**
 * Zettle (PayPal): the owner creates an API key at my.zettle.com/apps/api-keys; KOB's self-hosted app id
 * (ZETTLE_CLIENT_ID) exchanges it for 2-hour tokens through the JWT-bearer grant. Read-only.
 */
export const zettleManifest: ConnectorManifest = {
  provider: "ZETTLE",
  displayName: "Zettle",
  category: "POS",
  regions: ["GB", "IE"],
  auth: {
    kind: "JWT_BEARER",
    keyFields: [{ name: "apiKey", label: "API key", secret: true }],
    tokenUrl: "https://oauth.zettle.com/token",
    clientIdEnv: "ZETTLE_CLIENT_ID",
    scopes: ["READ:PURCHASE", "READ:PRODUCT"],
    helpUrl: "https://my.zettle.com/apps/api-keys",
  },
  streams: [
    { name: "orders", mode: "INCREMENTAL", schedule: "25 */2 * * *", backfillDays: 90, cursorField: "timestamp" },
    { name: "catalog", mode: "FULL", schedule: "35 3 * * *", backfillDays: 0 },
  ],
  actions: [],
  rateLimit: { rps: 5, concurrency: 1 },
  approval: { selfServe: true, partnerRequired: false, notes: "Self-hosted app; owner pastes an API key.", flag: "ZETTLE_LIVE" },
  dataContracts: ["sales", "menu"],
};
