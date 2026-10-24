import type { ConnectorManifest } from "@/lib/hub/manifest";

/** Epos Now: owner creates an API device (Back Office → Apps → REST API) and pastes the key and secret. Read-only. */
export const eposNowManifest: ConnectorManifest = {
  provider: "EPOS_NOW",
  displayName: "Epos Now",
  category: "POS",
  regions: ["GB", "IE", "US"],
  auth: {
    kind: "BASIC_KEY_SECRET",
    keyFields: [
      { name: "apiKey", label: "API key", secret: false },
      { name: "apiSecret", label: "API secret", secret: true },
    ],
    helpUrl: "https://developer.eposnowhq.com/",
  },
  streams: [
    { name: "orders", mode: "INCREMENTAL", schedule: "20 */2 * * *", backfillDays: 90, cursorField: "DateTime" },
    { name: "catalog", mode: "FULL", schedule: "40 3 * * *", backfillDays: 0 },
    { name: "customers", mode: "FULL", schedule: "50 3 * * *", backfillDays: 0 },
  ],
  actions: [],
  rateLimit: { rps: 2, concurrency: 1 },
  approval: { selfServe: true, partnerRequired: false, notes: "Self-serve API device per site.", flag: "EPOS_NOW_LIVE" },
  dataContracts: ["sales", "menu", "guests"],
};
