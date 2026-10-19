import { coreEntitlements, hasAddon, type Addon, type Entitlements } from "@/lib/billing/entitlements";
import { prisma } from "@/lib/db/prisma";
import { flag, FLAGS, type FlagName } from "@/lib/flags";
import { importSource } from "@/lib/hub/imports/sources";
import { allManifests, getManifest, REGIONS, type DataContract, type Region } from "@/lib/hub/manifest";

/**
 * Spec 2 §1.1 "Connected or off": each feature has a data contract; a restaurant's state per feature is LIVE,
 * PARTIAL (works, but connecting more adds data) or OFF. The UI and the agent read this; nothing guesses.
 */
export type CapabilityState = "LIVE" | "PARTIAL" | "OFF";

type Need = { contract: DataContract; core: boolean; label: string };
type FeatureSpec = { label: string; addon?: Addon; needs: Need[] };

export const FEATURES = {
  direct_ordering: {
    label: "Direct ordering",
    addon: "DIRECT_ORDERING",
    needs: [{ contract: "payments", core: true, label: "online payments" }],
  },
  delivery_savings: {
    label: "Delivery-app savings",
    addon: "DIRECT_ORDERING",
    needs: [
      { contract: "delivery_sales", core: true, label: "delivery-app sales" },
      { contract: "sales", core: false, label: "in-store sales" },
    ],
  },
  phone_host: {
    label: "Phone host",
    addon: "PHONE_HOST",
    needs: [
      { contract: "calls", core: true, label: "a phone line" },
      { contract: "bookings", core: false, label: "bookings" },
    ],
  },
  guest_crm: {
    label: "Guest CRM and win-back",
    addon: "GROWTH",
    needs: [
      { contract: "guests", core: true, label: "guest records" },
      { contract: "messaging", core: false, label: "a way to message guests" },
      { contract: "wifi_guests", core: false, label: "Wi-Fi sign-ups" },
    ],
  },
  reviews_revenue: {
    label: "Reviews to revenue",
    needs: [
      { contract: "reviews", core: true, label: "your reviews" },
      { contract: "review_replies", core: false, label: "review replies" },
    ],
  },
  social_autopilot: {
    label: "Social autopilot",
    needs: [{ contract: "social_publish", core: true, label: "a social account to post to" }],
  },
  supplier_watchdog: {
    label: "Supplier price watchdog",
    needs: [{ contract: "supplier_bills", core: true, label: "supplier invoices" }],
  },
  menu_coach: {
    label: "Menu profit coach",
    needs: [
      { contract: "menu", core: true, label: "your menu" },
      { contract: "sales", core: true, label: "item sales" },
    ],
  },
  quiet_night: {
    label: "Quiet-night filler",
    addon: "GROWTH",
    needs: [
      { contract: "weather", core: true, label: "weather" },
      { contract: "sales", core: true, label: "sales history" },
      { contract: "events", core: false, label: "local events" },
      { contract: "bookings", core: false, label: "bookings" },
    ],
  },
  competitor_watch: {
    label: "Competitor watch",
    needs: [{ contract: "places", core: true, label: "nearby restaurants" }],
  },
  rota_labour: {
    label: "Rota and labour cost",
    addon: "TEAM",
    needs: [
      { contract: "shifts", core: true, label: "shifts" },
      { contract: "sales", core: false, label: "sales to compare against" },
    ],
  },
  roi_report: {
    label: "Weekly ROI report",
    needs: [
      { contract: "sales", core: false, label: "sales" },
      { contract: "reviews", core: false, label: "reviews" },
      { contract: "calls", core: false, label: "calls" },
    ],
  },
} as const satisfies Record<string, FeatureSpec>;

export type FeatureKey = keyof typeof FEATURES;

/** Spec 2 §4: what to suggest connecting, per region, when a contract is missing (first = recommended). */
const RECOMMENDED: Partial<Record<DataContract, Partial<Record<Region, string[]>> & { default: string[] }>> = {
  sales: { default: ["SQUARE"], US: ["SQUARE", "TOAST", "CLOVER"], CA: ["SQUARE", "TOAST", "CLOVER"], GB: ["SQUARE", "EPOS_NOW", "ZETTLE"], IE: ["SQUARE", "EPOS_NOW", "ZETTLE"] },
  menu: { default: ["SQUARE"], US: ["SQUARE", "TOAST", "CLOVER"], GB: ["SQUARE", "EPOS_NOW", "ZETTLE"] },
  guests: { default: ["SQUARE"] },
  payments: { default: ["SQUARE", "STRIPE_CONNECT"], NZ: ["STRIPE_CONNECT"] },
  delivery_sales: { default: ["DELIVERY_CSV"] },
  bookings: { default: ["SQUARE"], GB: ["SQUARE", "RESDIARY"], IE: ["SQUARE", "RESDIARY"], AU: ["RESDIARY", "SQUARE"], NZ: ["RESDIARY"] },
  reviews: { default: ["GBP", "TRIPADVISOR"], US: ["GBP", "YELP", "TRIPADVISOR"] },
  review_replies: { default: ["GBP"] },
  social_publish: { default: ["INSTAGRAM", "GBP"] },
  messaging: { default: ["WHATSAPP"] },
  supplier_bills: { default: ["INVOICE_EMAIL", "XERO", "QUICKBOOKS"], US: ["INVOICE_EMAIL", "QUICKBOOKS", "XERO"] },
  shifts: { default: ["DEPUTY", "SQUARE"], GB: ["DEPUTY", "PLANDAY", "SQUARE"], US: ["SEVENSHIFTS", "DEPUTY", "SQUARE"] },
  calls: { default: ["KOB_PHONE"] },
  weather: { default: ["OPEN_METEO"], GB: ["METOFFICE"] },
  events: { default: ["TICKETMASTER"] },
  places: { default: ["GOOGLE_PLACES"] },
  wifi_guests: { default: ["PURPLE_WIFI"] },
};

export function recommendedFor(contract: DataContract, region: Region): string[] {
  const r = RECOMMENDED[contract];
  return r ? (r[region] ?? r.default) : [];
}

/** Something that supplies data now: a healthy integration, a completed import, or a KOB platform key. */
export type DataSource = { provider: string; contracts: readonly DataContract[] };

export type MissingNeed = { contract: DataContract; label: string; core: boolean; connect: string[] };

export type Capability = {
  feature: FeatureKey;
  label: string;
  state: CapabilityState;
  /** Why OFF/PARTIAL, for the UI and the agent's context pack. */
  reason: "not_in_plan" | "missing_data" | null;
  addon: Addon | null;
  /** Providers currently feeding the feature. */
  sources: string[];
  missing: MissingNeed[];
};

/** Pure: evaluates every feature from what's connected. Tested as a matrix in capabilities.test.ts. */
export function evaluateCapabilities(input: { region: Region; sources: DataSource[]; entitlements: Entitlements }): Capability[] {
  return (Object.keys(FEATURES) as FeatureKey[]).map((feature) => {
    const spec: FeatureSpec = FEATURES[feature];
    const addon = spec.addon ?? null;
    const met = new Map<DataContract, string[]>();
    for (const need of spec.needs) {
      const providers = input.sources.filter((s) => s.contracts.includes(need.contract)).map((s) => s.provider);
      if (providers.length) met.set(need.contract, providers);
    }
    const missing: MissingNeed[] = spec.needs
      .filter((n) => !met.has(n.contract))
      .map((n) => ({ contract: n.contract, label: n.label, core: n.core, connect: recommendedFor(n.contract, input.region) }));
    const sources = [...new Set([...met.values()].flat())];

    if (!hasAddon(input.entitlements, addon)) {
      return { feature, label: spec.label, state: "OFF", reason: "not_in_plan", addon, sources, missing };
    }
    const hasCore = spec.needs.some((n) => n.core);
    const coreMissing = missing.some((m) => m.core);
    let state: CapabilityState;
    if (hasCore ? coreMissing : met.size === 0) state = "OFF";
    else state = missing.length ? "PARTIAL" : "LIVE";
    return { feature, label: spec.label, state, reason: state === "LIVE" ? null : "missing_data", addon, sources, missing };
  });
}

/** "Connect Square to add in-store sales" — the PARTIAL/OFF hint shown on cards and in the context pack. */
export function capabilityHint(c: Capability, displayName: (provider: string) => string = providerName): string | null {
  if (c.reason === "not_in_plan") return `${c.label} isn't in your plan yet.`;
  const next = c.missing.find((m) => m.core) ?? c.missing[0];
  if (!next) return null;
  const who = next.connect[0] ? displayName(next.connect[0]) : "a source";
  return `Connect ${who} to add ${next.label}.`;
}

const NAMES: Record<string, string> = {
  KOB: "KOB",
  GBP: "Google Business Profile",
  DELIVERY_CSV: "a delivery-app statement",
  INVOICE_EMAIL: "invoice forwarding",
  KOB_PHONE: "the KOB phone line",
  EPOS_NOW: "Epos Now",
  STRIPE_CONNECT: "Stripe",
  QUICKBOOKS: "QuickBooks",
  SEVENSHIFTS: "7shifts",
  PURPLE_WIFI: "Purple Wi-Fi",
  OPEN_METEO: "Open-Meteo",
  METOFFICE: "the Met Office",
  GOOGLE_PLACES: "Google Places",
  UBER_EATS: "Uber Eats",
  JUST_EAT: "Just Eat",
  DOORDASH: "DoorDash",
  OPENTABLE: "OpenTable",
  SEVENROOMS: "SevenRooms",
  RESDIARY: "ResDiary",
  TRIPADVISOR: "Tripadvisor",
};

export function providerName(provider: string): string {
  return getManifest(provider)?.displayName ?? NAMES[provider] ?? provider.charAt(0) + provider.slice(1).toLowerCase().replace(/_/g, " ");
}

export function regionFor(countryCode: string | null | undefined): Region {
  const c = (countryCode ?? "").toUpperCase();
  if (c === "UK") return "GB";
  return (REGIONS as readonly string[]).includes(c) ? (c as Region) : "GB";
}

function isFlagName(name: string): name is FlagName {
  return (FLAGS as readonly string[]).includes(name);
}

/** What a completed import supplies. Stored-only files (invoice/menu PDFs) feed nothing until a parser lands. */
export function importContracts(source: string): DataContract[] {
  const spec = importSource(source);
  if (!spec) return [];
  if (spec.kind === "SALES") return spec.channel === "DELIVERY" ? ["delivery_sales"] : ["sales"];
  if (spec.kind === "GUESTS") return ["guests"];
  if (spec.kind === "BOOKINGS") return ["bookings"];
  return [];
}

export async function importSources(restaurantId: string): Promise<DataSource[]> {
  const rows = await prisma.importJob.groupBy({ by: ["source"], where: { restaurantId, status: "IMPORTED", rowsImported: { gt: 0 } } });
  return rows.flatMap((r) => {
    const contracts = importContracts(r.source);
    return contracts.length ? [{ provider: r.source, contracts }] : [];
  });
}

/** Integration statuses that still supply data. */
const SUPPLYING = new Set(["CONNECTED", "DEGRADED"]);

/**
 * What feeds a restaurant now. A connector counts only when its manifest exists, its rollout flag is on and the
 * integration is supplying data; completed imports count for what they contain; KOB platform keys count when their
 * env is set.
 */
export async function dataSourcesFor(restaurantId: string): Promise<{ region: Region; sources: DataSource[] }> {
  const [restaurant, integrations, imports] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { countryCode: true } }),
    prisma.integration.findMany({ where: { restaurantId } }),
    importSources(restaurantId),
  ]);
  const sources: DataSource[] = [...imports];
  for (const row of integrations) {
    const manifest = getManifest(row.provider);
    if (!manifest) continue;
    if (!SUPPLYING.has(row.status)) continue;
    if (!isFlagName(manifest.approval.flag) || !(await flag(manifest.approval.flag, restaurantId))) continue;
    sources.push({ provider: manifest.provider, contracts: manifest.dataContracts });
  }
  for (const m of allManifests()) {
    if (m.auth.kind !== "PLATFORM_KEY") continue;
    if ((m.auth.platformEnv ?? []).every((k) => process.env[k])) sources.push({ provider: m.provider, contracts: m.dataContracts });
  }
  return { region: regionFor(restaurant?.countryCode), sources };
}

/** Evaluates a restaurant's features. Exported for the agent context pack (wired in with the Spec 1 agent runtime). */
export async function capabilitiesFor(
  restaurantId: string,
  opts: { entitlements?: Entitlements; extraSources?: DataSource[] } = {},
): Promise<Capability[]> {
  const { region, sources } = await dataSourcesFor(restaurantId);
  return evaluateCapabilities({
    region,
    sources: [...sources, ...(opts.extraSources ?? [])],
    entitlements: opts.entitlements ?? coreEntitlements(),
  });
}
