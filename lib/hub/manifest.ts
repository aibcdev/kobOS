import { cloverManifest } from "@/lib/connectors/clover/manifest";
import { eposNowManifest } from "@/lib/connectors/epos-now/manifest";
import { squareManifest } from "@/lib/connectors/square/manifest";
import { toastManifest } from "@/lib/connectors/toast/manifest";
import { zettleManifest } from "@/lib/connectors/zettle/manifest";

/** Spec 2 §3.3. Every connector describes itself once; the hub, capabilities and UI read only this. */
export type AuthKind =
  | "OAUTH2_CODE"
  | "OAUTH2_CLIENT_CREDENTIALS"
  | "API_KEY"
  | "BASIC_KEY_SECRET"
  | "JWT_BEARER"
  | "WEBHOOK_ONLY"
  | "FILE_IMPORT"
  | "EMAIL_INGEST"
  | "PLATFORM_KEY";

export type ConnectorCategory =
  | "POS"
  | "PAYMENTS"
  | "BOOKINGS"
  | "DELIVERY"
  | "MARKETING"
  | "ACCOUNTING"
  | "REVIEWS"
  | "SOCIAL"
  | "LABOUR"
  | "PHONE"
  | "WIFI"
  | "SIGNALS";

export const REGIONS = ["GB", "IE", "US", "CA", "AU", "NZ"] as const;
export type Region = (typeof REGIONS)[number];

/** Kinds of rows a connector can supply. Features (lib/hub/capabilities.ts) are defined in terms of these. */
export const DATA_CONTRACTS = [
  "sales",
  "menu",
  "guests",
  "bookings",
  "payments",
  "delivery_sales",
  "reviews",
  "review_replies",
  "social_publish",
  "messaging",
  "supplier_bills",
  "shifts",
  "calls",
  "weather",
  "events",
  "places",
  "wifi_guests",
] as const;
export type DataContract = (typeof DATA_CONTRACTS)[number];

export type StreamSpec = {
  name: string;
  mode: "INCREMENTAL" | "FULL" | "WEBHOOK_DRIVEN";
  /** Cron for the polling safety net. */
  schedule: string;
  backfillDays: number;
  cursorField?: string;
};

export type KeyField = { name: string; label: string; secret: boolean };

export type ConnectorManifest = {
  /** `IntegrationProvider` value (or import source for file/email connectors). */
  provider: string;
  displayName: string;
  category: ConnectorCategory;
  regions: Region[];
  auth: {
    kind: AuthKind;
    scopes?: string[];
    authorizeUrl?: string;
    tokenUrl?: string;
    clientIdEnv?: string;
    clientSecretEnv?: string;
    keyFields?: KeyField[];
    /** "Where to find your API key" deep link. */
    helpUrl?: string;
    /** PLATFORM_KEY: env vars that must be set for the source to be available. */
    platformEnv?: string[];
    /** Token endpoint body encoding (default form) and where client credentials go (default body). */
    tokenBody?: "form" | "json";
    clientAuth?: "body" | "basic";
    /** Refresh this long before expiry (default 300 s). Square: tokens last 30 days, refreshed at day 7. */
    refreshAheadSeconds?: number;
    /** Refresh endpoint when it isn't tokenUrl (Clover /oauth/v2/refresh). */
    refreshUrl?: string;
    /**
     * Regional data centres (Clover NA/EU/LA): OAuth origin per provider region, and which region a restaurant's
     * country lives in. The URLs above are written for the first region; the stored Integration.region picks one.
     */
    regionOrigins?: Record<string, string>;
    regionByCountry?: Record<string, string>;
    /** `env` = "sandbox" switches every OAuth URL to `origin`. */
    sandbox?: { env: string; origin: string };
  };
  streams: StreamSpec[];
  webhooks?: {
    path: string;
    verifier: string;
    events: string[];
    subscribe?: "API" | "MANUAL";
    /** DEGRADED when no webhook arrives for this long (only set for providers that send steadily). */
    expectedSilenceHours?: number;
  };
  /** Ledger action types it can execute (lib/agent/action-types.ts). */
  actions: string[];
  rateLimit: { rps?: number; rpm?: number; daily?: number; concurrency?: number };
  /** `flag` gates the connector until it is approved/rolled out (lib/flags.ts). */
  approval: { selfServe: boolean; partnerRequired: boolean; notes: string; flag: string };
  dataContracts: DataContract[];
  costNote?: string;
};

const REGISTRY: readonly ConnectorManifest[] = [squareManifest, toastManifest, eposNowManifest, zettleManifest, cloverManifest];

const byProvider = new Map(REGISTRY.map((m) => [m.provider, m]));
if (byProvider.size !== REGISTRY.length) throw new Error("Duplicate connector manifest provider");

export function allManifests(): readonly ConnectorManifest[] {
  return REGISTRY;
}

export function getManifest(provider: string): ConnectorManifest | undefined {
  return byProvider.get(provider);
}

/** Manifests that can supply a data contract, optionally limited to a region. */
export function manifestsFor(contract: DataContract, region?: Region): ConnectorManifest[] {
  return REGISTRY.filter((m) => m.dataContracts.includes(contract) && (!region || m.regions.includes(region)));
}
