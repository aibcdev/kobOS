import type { ConnectorManifest } from "@/lib/hub/manifest";

/**
 * Clover (Fiserv): sales, menu and customers for US/CA, and UK/IE via Clover Europe. Expiring OAuth v2 tokens with
 * rotating refresh tokens; permissions are set on the app in the Clover dashboard, so no scopes are requested.
 * Read-only until the App Market review is through.
 */
export const cloverManifest: ConnectorManifest = {
  provider: "CLOVER",
  displayName: "Clover",
  category: "POS",
  regions: ["US", "CA", "GB", "IE"],
  auth: {
    kind: "OAUTH2_CODE",
    scopes: [],
    authorizeUrl: "https://www.clover.com/oauth/v2/authorize",
    tokenUrl: "https://www.clover.com/oauth/v2/token",
    refreshUrl: "https://www.clover.com/oauth/v2/refresh",
    clientIdEnv: "CLOVER_APP_ID",
    clientSecretEnv: "CLOVER_APP_SECRET",
    tokenBody: "json",
    regionOrigins: { NA: "https://www.clover.com", EU: "https://eu.clover.com", LA: "https://la.clover.com" },
    regionByCountry: { US: "NA", CA: "NA", GB: "EU", IE: "EU", MX: "LA" },
    sandbox: { env: "CLOVER_ENV", origin: "https://sandbox.dev.clover.com" },
  },
  streams: [
    { name: "orders", mode: "WEBHOOK_DRIVEN", schedule: "0 */6 * * *", backfillDays: 400, cursorField: "modifiedTime" },
    { name: "catalog", mode: "FULL", schedule: "0 3 * * *", backfillDays: 0 },
    { name: "customers", mode: "FULL", schedule: "30 3 * * *", backfillDays: 0 },
  ],
  webhooks: {
    path: "/api/webhooks/clover",
    verifier: "clover",
    events: ["O", "C", "I"],
    subscribe: "MANUAL",
  },
  actions: [],
  rateLimit: { rps: 10, concurrency: 2 },
  approval: {
    selfServe: false,
    partnerRequired: true,
    notes: "Clover App Market review before merchants other than our test merchants can install.",
    flag: "CLOVER_LIVE",
  },
  dataContracts: ["sales", "menu", "guests"],
  costNote: "Free API; App Market listing may carry a revenue share if billed through Clover.",
};
