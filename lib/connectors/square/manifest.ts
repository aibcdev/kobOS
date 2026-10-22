import type { ConnectorManifest } from "@/lib/hub/manifest";

/**
 * Square: the Spec 2 backbone (sales, menu, guests, bookings, labour, payments). OAuth settings match
 * lib/integrations/oauth-config.ts; the current read path is lib/integrations/providers/square.ts until T-88.
 */
export const squareManifest: ConnectorManifest = {
  provider: "SQUARE",
  displayName: "Square",
  category: "POS",
  regions: ["GB", "IE", "US", "CA", "AU"],
  auth: {
    kind: "OAUTH2_CODE",
    scopes: ["ORDERS_READ", "MERCHANT_PROFILE_READ", "ITEMS_READ", "CUSTOMERS_READ"],
    authorizeUrl: "https://connect.squareup.com/oauth2/authorize",
    tokenUrl: "https://connect.squareup.com/oauth2/token",
    clientIdEnv: "SQUARE_APPLICATION_ID",
    clientSecretEnv: "SQUARE_APPLICATION_SECRET",
    tokenBody: "json",
    pkce: true,
    refreshAheadSeconds: 23 * 86_400,
  },
  streams: [
    { name: "orders", mode: "WEBHOOK_DRIVEN", schedule: "0 */6 * * *", backfillDays: 400, cursorField: "updated_at" },
    { name: "catalog", mode: "FULL", schedule: "0 3 * * *", backfillDays: 0 },
    { name: "customers", mode: "INCREMENTAL", schedule: "30 */6 * * *", backfillDays: 0, cursorField: "updated_at" },
  ],
  webhooks: {
    path: "/api/webhooks/square",
    verifier: "square",
    events: ["order.created", "order.updated", "catalog.version.updated", "customer.created", "customer.updated"],
    subscribe: "API",
  },
  actions: ["pos.item.86", "pos.item.price.update"],
  rateLimit: { rps: 10, concurrency: 2 },
  approval: {
    selfServe: true,
    partnerRequired: false,
    notes: "Private OAuth app, no review. Marketplace listing optional.",
    flag: "SQUARE_LIVE",
  },
  dataContracts: ["sales", "menu", "guests", "payments"],
  costNote: "Free API. KOB can take app_fee_money on payment links.",
};
