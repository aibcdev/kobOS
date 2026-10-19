import { describe, expect, it, vi } from "vitest";
import { coreEntitlements, type Entitlements } from "@/lib/billing/entitlements";
import { capabilityHint, evaluateCapabilities, FEATURES, regionFor, type Capability, type DataSource, type FeatureKey } from "@/lib/hub/capabilities";
import type { Region } from "@/lib/hub/manifest";

const SQUARE: DataSource = { provider: "SQUARE", contracts: ["sales", "menu", "guests", "payments"] };
const GBP: DataSource = { provider: "GBP", contracts: ["reviews", "review_replies", "social_publish"] };
const DELIVEROO: DataSource = { provider: "DELIVEROO_CSV", contracts: ["delivery_sales"] };
const PLACES: DataSource = { provider: "GOOGLE_PLACES", contracts: ["places"] };
const WEATHER: DataSource = { provider: "METOFFICE", contracts: ["weather"] };
const PHONE: DataSource = { provider: "KOB_PHONE", contracts: ["calls", "bookings"] };
const DEPUTY: DataSource = { provider: "DEPUTY", contracts: ["shifts"] };

const all = (e: Partial<Entitlements["addons"]> = {}): Entitlements => ({ core: true, addons: { ...coreEntitlements().addons, ...e } });
const allAddons = all({ PHONE_HOST: true, DIRECT_ORDERING: true, GROWTH: true, TEAM: true });

function run(sources: DataSource[], entitlements = allAddons, region: Region = "GB") {
  const caps = evaluateCapabilities({ region, sources, entitlements });
  return Object.fromEntries(caps.map((c) => [c.feature, c])) as Record<FeatureKey, Capability>;
}

describe("evaluateCapabilities matrix", () => {
  const rows: [string, DataSource[], Entitlements, FeatureKey, Capability["state"]][] = [
    ["nothing connected → menu coach OFF", [], allAddons, "menu_coach", "OFF"],
    ["Square → menu coach LIVE", [SQUARE], allAddons, "menu_coach", "LIVE"],
    ["Square → direct ordering LIVE with add-on", [SQUARE], allAddons, "direct_ordering", "LIVE"],
    ["Square → direct ordering OFF without add-on", [SQUARE], coreEntitlements(), "direct_ordering", "OFF"],
    ["CSV only → delivery savings PARTIAL (no in-store sales)", [DELIVEROO], allAddons, "delivery_savings", "PARTIAL"],
    ["CSV + Square → delivery savings LIVE", [DELIVEROO, SQUARE], allAddons, "delivery_savings", "LIVE"],
    ["Square only → delivery savings OFF (no delivery data)", [SQUARE], allAddons, "delivery_savings", "OFF"],
    ["GBP → reviews LIVE", [GBP], allAddons, "reviews_revenue", "LIVE"],
    ["read-only reviews → PARTIAL", [{ provider: "TRIPADVISOR", contracts: ["reviews"] }], allAddons, "reviews_revenue", "PARTIAL"],
    ["GBP → social LIVE", [GBP], allAddons, "social_autopilot", "LIVE"],
    ["nothing → supplier watchdog OFF", [], allAddons, "supplier_watchdog", "OFF"],
    ["Places key → competitor watch LIVE", [PLACES], coreEntitlements(), "competitor_watch", "LIVE"],
    ["weather + Square → quiet night PARTIAL (no events/bookings)", [WEATHER, SQUARE], allAddons, "quiet_night", "PARTIAL"],
    ["weather only → quiet night OFF (no sales)", [WEATHER], allAddons, "quiet_night", "OFF"],
    ["quiet night needs Growth", [WEATHER, SQUARE], coreEntitlements(), "quiet_night", "OFF"],
    ["phone line + bookings → phone host LIVE", [PHONE], allAddons, "phone_host", "LIVE"],
    ["phone host needs the add-on", [PHONE], coreEntitlements(), "phone_host", "OFF"],
    ["Square guests → CRM PARTIAL (no messaging)", [SQUARE], allAddons, "guest_crm", "PARTIAL"],
    ["Deputy → rota PARTIAL without sales", [DEPUTY], allAddons, "rota_labour", "PARTIAL"],
    ["Deputy + Square → rota LIVE", [DEPUTY, SQUARE], allAddons, "rota_labour", "LIVE"],
    ["ROI with nothing → OFF", [], coreEntitlements(), "roi_report", "OFF"],
    ["ROI with Square → PARTIAL", [SQUARE], coreEntitlements(), "roi_report", "PARTIAL"],
    ["ROI with Square + GBP + phone → LIVE", [SQUARE, GBP, PHONE], coreEntitlements(), "roi_report", "LIVE"],
  ];
  it.each(rows)("%s", (_name, sources, entitlements, feature, state) => {
    expect(run(sources, entitlements)[feature].state).toBe(state);
  });

  it("covers every feature", () => {
    expect(evaluateCapabilities({ region: "GB", sources: [], entitlements: coreEntitlements() }).map((c) => c.feature)).toEqual(Object.keys(FEATURES));
  });

  it("reports not_in_plan before missing data and keeps sources", () => {
    const c = run([SQUARE], coreEntitlements()).direct_ordering;
    expect(c).toMatchObject({ reason: "not_in_plan", addon: "DIRECT_ORDERING", sources: ["SQUARE"] });
    expect(capabilityHint(c)).toBe("Direct ordering isn't in your plan yet.");
  });

  it("names what to connect, by region", () => {
    expect(capabilityHint(run([DELIVEROO]).delivery_savings)).toBe("Connect Square to add in-store sales.");
    expect(run([], allAddons, "NZ").direct_ordering.missing[0].connect).toEqual(["STRIPE_CONNECT"]);
    expect(run([], allAddons, "US").reviews_revenue.missing[0].connect).toContain("YELP");
    expect(capabilityHint(run([]).supplier_watchdog)).toBe("Connect invoice forwarding to add supplier invoices.");
    expect(capabilityHint(run([SQUARE]).menu_coach)).toBeNull();
  });
});

describe("regionFor", () => {
  it.each([
    ["GB", "GB"],
    ["uk", "GB"],
    ["US", "US"],
    ["nz", "NZ"],
    ["FR", "GB"],
    [null, "GB"],
  ])("%s → %s", (code, region) => expect(regionFor(code)).toBe(region));
});

describe("capabilitiesFor", () => {
  it("counts a connector only when its manifest flag is on", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/prisma", () => ({
      prisma: {
        restaurant: { findUnique: async () => ({ countryCode: "GB" }) },
        integration: { findMany: async () => [{ provider: "SQUARE", status: "CONNECTED" }, { provider: "GMAIL", status: "CONNECTED" }] },
        featureFlagOverride: { findUnique: async () => null },
      },
    }));
    const { capabilitiesFor } = await import("@/lib/hub/capabilities");
    vi.stubEnv("SQUARE_LIVE", "");
    expect((await capabilitiesFor("r1")).find((c) => c.feature === "menu_coach")?.state).toBe("OFF");
    vi.stubEnv("SQUARE_LIVE", "1");
    const caps = await capabilitiesFor("r1");
    expect(caps.find((c) => c.feature === "menu_coach")?.state).toBe("LIVE");
    expect(caps.find((c) => c.feature === "menu_coach")?.sources).toEqual(["SQUARE"]);
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/db/prisma");
  });
});
