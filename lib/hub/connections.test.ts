import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const sent = vi.hoisted(() => [] as unknown[]);
vi.mock("@/inngest/client", () => ({ inngest: { send: async (e: unknown) => void sent.push(e) } }));

import { integrationPublic } from "@/lib/api/safe-integration";
import { importContracts } from "@/lib/hub/capabilities";
import { cardState, connectMethod } from "@/lib/hub/connections";
import { getManifest } from "@/lib/hub/manifest";
import { tallyCapabilities } from "@/lib/hub/ops";

describe("connections view (pure)", () => {
  it("card state: the integration row wins, otherwise flag + configured decide", () => {
    expect(cardState({ status: "REAUTH", enabled: false, configured: false })).toBe("REAUTH");
    expect(cardState({ status: "DEGRADED", enabled: true, configured: true })).toBe("DEGRADED");
    expect(cardState({ status: "DISCONNECTED", enabled: true, configured: true })).toBe("AVAILABLE");
    expect(cardState({ status: null, enabled: true, configured: false })).toBe("COMING_SOON");
    expect(cardState({ status: null, enabled: false, configured: true })).toBe("COMING_SOON");
  });

  it("connect method: OAuth link only when the app is configured; key forms list labels, never values", () => {
    const sq = getManifest("SQUARE")!;
    vi.stubEnv(sq.auth.clientIdEnv!, "");
    expect(connectMethod(sq, "r1")).toEqual({ kind: "none" });
    vi.stubEnv(sq.auth.clientIdEnv!, "id");
    vi.stubEnv(sq.auth.clientSecretEnv!, "secret");
    expect(connectMethod(sq, "r1")).toEqual({ kind: "oauth", href: "/api/integrations/SQUARE/connect?restaurantId=r1&returnTo=connections" });
    const epos = connectMethod(getManifest("EPOS_NOW")!, "r1");
    expect(epos.kind).toBe("keys");
    expect(epos.kind === "keys" && epos.fields.map((f) => f.secret)).toEqual([false, true]);
    vi.unstubAllEnvs();
  });

  it("imports supply contracts by kind; stored-only PDFs supply nothing", () => {
    expect(importContracts("DELIVEROO_CSV")).toEqual(["delivery_sales"]);
    expect(importContracts("GENERIC_SALES_CSV")).toEqual(["sales"]);
    expect(importContracts("GUESTS_CSV")).toEqual(["guests"]);
    expect(importContracts("BOOKINGS_CSV")).toEqual(["bookings"]);
    expect(importContracts("INVOICE_PDF")).toEqual([]);
    expect(importContracts("NOPE")).toEqual([]);
  });

  it("ops tally counts each feature's state across restaurants", () => {
    const t = tallyCapabilities([
      [{ feature: "menu_coach", state: "LIVE" }],
      [{ feature: "menu_coach", state: "OFF" }],
      [{ feature: "menu_coach", state: "LIVE" }],
    ]);
    expect(t.find((x) => x.feature === "menu_coach")).toMatchObject({ LIVE: 2, PARTIAL: 0, OFF: 1 });
    expect(t.find((x) => x.feature === "quiet_night")).toMatchObject({ LIVE: 0, PARTIAL: 0, OFF: 0 });
  });
});

describeDb("connections on Postgres (T-85)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let connections: typeof import("@/lib/hub/connections");
  let restaurantId: string;
  let userId: string;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    connections = await import("@/lib/hub/connections");
    const seeded = await seedRestaurant(prisma);
    restaurantId = seeded.restaurant.id;
    userId = seeded.userId;
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { countryCode: "GB" } });
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    sent.length = 0;
    vi.stubEnv("INTEGRATION_ENC_KEY", Buffer.alloc(32, 7).toString("base64"));
    await prisma.integration.deleteMany({ where: { restaurantId } });
    await prisma.importJob.deleteMany({ where: { restaurantId } });
    await prisma.featureFlagOverride.deleteMany({ where: { restaurantId } });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const enable = (name: string) => prisma.featureFlagOverride.create({ data: { restaurantId, name, enabled: true } });
  const eposOk = () => vi.stubGlobal("fetch", vi.fn(async () => new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } })));

  it("refuses while the rollout flag is off, and when fields are missing", async () => {
    eposOk();
    const off = await connections.connectWithKeys({ restaurantId, provider: "EPOS_NOW", userId, fields: { apiKey: "k", apiSecret: "s" } });
    expect(off).toMatchObject({ ok: false, status: 403 });
    await enable("EPOS_NOW_LIVE");
    const missing = await connections.connectWithKeys({ restaurantId, provider: "EPOS_NOW", userId, fields: { apiKey: "k" } });
    expect(missing).toMatchObject({ ok: false, status: 400 });
    expect(await connections.connectWithKeys({ restaurantId, provider: "SQUARE", userId, fields: {} })).toMatchObject({ ok: false, status: 400 });
  });

  it("validates, stores keys encrypted, starts the backfill; rejected keys save nothing", async () => {
    await enable("EPOS_NOW_LIVE");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    const bad = await connections.connectWithKeys({ restaurantId, provider: "EPOS_NOW", userId, fields: { apiKey: "k", apiSecret: "wrong" } });
    expect(bad).toMatchObject({ ok: false, status: 422, error: "Epos Now rejected that key and secret" });
    expect(await prisma.integration.count({ where: { restaurantId } })).toBe(0);

    eposOk();
    const good = await connections.connectWithKeys({ restaurantId, provider: "EPOS_NOW", userId, fields: { apiKey: " key ", apiSecret: "sekret" } });
    expect(good.ok).toBe(true);
    const row = await prisma.integration.findFirstOrThrow({ where: { restaurantId } });
    expect(row).toMatchObject({ provider: "EPOS_NOW", authKind: "BASIC_KEY_SECRET", status: "CONNECTED", connectedByUserId: userId });
    expect(row.encryptedApiKey).not.toContain("sekret");
    const { decryptKeyFields } = await import("@/lib/hub/auth/api-key");
    expect(decryptKeyFields(row.encryptedApiKey!)).toEqual({ apiKey: "key", apiSecret: "sekret" });
    expect(sent).toEqual([{ name: "hub/integration.connected", data: { integrationId: row.id } }]);

    const pub = integrationPublic(row) as Record<string, unknown>;
    expect(pub).not.toHaveProperty("encryptedApiKey");
    expect(pub.hasApiKey).toBe(true);
  });

  it("disconnect drops credentials and cursors, keeps the row, and the card offers connect again", async () => {
    await enable("EPOS_NOW_LIVE");
    eposOk();
    await connections.connectWithKeys({ restaurantId, provider: "EPOS_NOW", userId, fields: { apiKey: "k", apiSecret: "s" } });
    const row = await prisma.integration.findFirstOrThrow({ where: { restaurantId } });
    await prisma.syncCursor.create({ data: { integrationId: row.id, stream: "orders" } });

    let view = await connections.connectionsView(restaurantId);
    expect(view.cards.find((c) => c.provider === "EPOS_NOW")).toMatchObject({ state: "CONNECTED", inRegion: true });

    expect(await connections.disconnectIntegration(restaurantId, "EPOS_NOW")).toBe(true);
    expect(await connections.disconnectIntegration(restaurantId, "EPOS_NOW")).toBe(false);
    const after = await prisma.integration.findUniqueOrThrow({ where: { id: row.id } });
    expect(after).toMatchObject({ status: "DISCONNECTED", encryptedApiKey: null, encryptedAccessToken: null });
    expect(after.disconnectedAt).toBeInstanceOf(Date);
    expect(await prisma.syncCursor.count({ where: { integrationId: row.id } })).toBe(0);

    view = await connections.connectionsView(restaurantId);
    const card = view.cards.find((c) => c.provider === "EPOS_NOW")!;
    expect(card.state).toBe("AVAILABLE");
    expect(card.connect.kind).toBe("keys");
    expect(view.cards.find((c) => c.provider === "TOAST")).toMatchObject({ state: "COMING_SOON", inRegion: true, connect: { kind: "none" } });
  });

  it("a completed delivery import makes delivery savings PARTIAL with a hint to add in-store sales", async () => {
    const base = { restaurantId, origin: "UPLOAD", storagePath: "x", status: "IMPORTED", rowsImported: 3 };
    await prisma.importJob.create({ data: { ...base, source: "DELIVEROO_CSV", fileSha256: "a" } });
    await prisma.importJob.create({ data: { ...base, source: "INVOICE_PDF", fileSha256: "b", status: "STORED", rowsImported: 0 } });
    const { capabilities } = await connections.connectionsView(restaurantId);
    const { capabilitiesFor } = await import("@/lib/hub/capabilities");
    const { coreEntitlements } = await import("@/lib/billing/entitlements");
    const growth = { core: true as const, addons: { ...coreEntitlements().addons, DIRECT_ORDERING: true } };
    const withAddon = (await capabilitiesFor(restaurantId, { entitlements: growth })).find((c) => c.feature === "delivery_savings")!;
    expect(withAddon).toMatchObject({ state: "PARTIAL", sources: ["DELIVEROO_CSV"] });
    expect(capabilities.find((c) => c.feature === "supplier_watchdog")).toMatchObject({ state: "OFF" });
    const ds = capabilities.find((c) => c.feature === "delivery_savings")!;
    expect(ds.reason).toBe("not_in_plan");
  });
});
