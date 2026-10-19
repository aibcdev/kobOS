import type { ConnectorManifest } from "@/lib/hub/manifest";

/**
 * Toast: read-only through the owner's Standard API access (Toast Web → Integrations → Toast API access). KOB never
 * writes to Toast; menu or price changes become an owner checklist. Partner API access is a separate approval.
 */
export const toastManifest: ConnectorManifest = {
  provider: "TOAST",
  displayName: "Toast",
  category: "POS",
  regions: ["US", "CA", "GB", "IE"],
  auth: {
    kind: "API_KEY",
    keyFields: [
      { name: "clientId", label: "Client ID", secret: false },
      { name: "clientSecret", label: "Client secret", secret: true },
      { name: "restaurantGuid", label: "Restaurant GUID", secret: false },
    ],
    helpUrl: "https://doc.toasttab.com/doc/devguide/apiStandardApiAccess.html",
  },
  streams: [
    { name: "orders", mode: "INCREMENTAL", schedule: "15 */2 * * *", backfillDays: 90, cursorField: "modifiedDate" },
    { name: "catalog", mode: "FULL", schedule: "45 3 * * *", backfillDays: 0 },
  ],
  actions: [],
  rateLimit: { rps: 5, concurrency: 1 },
  approval: {
    selfServe: true,
    partnerRequired: false,
    notes: "Standard API access is self-serve for the owner (read-only). Partner integration needs Toast approval.",
    flag: "TOAST_LIVE",
  },
  dataContracts: ["sales", "menu", "guests"],
  costNote: "Standard API access may carry a Toast fee on some plans.",
};
