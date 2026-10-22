import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { fakeFetch, fixture } from "@/tests/helpers/fake-fetch";
import { cloverApiBase } from "@/lib/connectors/clover/connector";
import { cloverManifest } from "@/lib/connectors/clover/manifest";
import { channelOf, mapCloverCustomer, mapCloverItems, mapCloverOrder, type CloverItem, type CloverOrder } from "@/lib/connectors/clover/map";
import { oauthUrls, providerRegion } from "@/lib/hub/auth/oauth-urls";
import type { ConnectorCtx } from "@/lib/hub/connector";
import { buildOAuthUrl, getOAuthConfig } from "@/lib/integrations/oauth-config";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const orders = () => fixture<{ elements: CloverOrder[] }>("clover", "orders.json").elements;

describe("Clover mapping", () => {
  it("orders: tips from payments on top of the tax-inclusive total; failed payments ignored; refunds netted", () => {
    const [paid, open, refund] = orders().map((o) => mapCloverOrder(o, "USD")!);
    expect(paid).toMatchObject({
      source: { kind: "API", provider: "CLOVER", externalId: "ORDPAID1" },
      status: "COMPLETED",
      channel: "DINE_IN",
      currency: "USD",
      totalMinor: 2460,
      tipMinor: 300,
      taxMinor: 160,
      subtotalMinor: 2000,
      refundedMinor: 0,
      placedAt: new Date(1760461200000),
      closedAt: new Date(1760461500000),
      guest: { identities: [{ kind: "PROVIDER_CUSTOMER", provider: "CLOVER", value: "CUSTALICE" }] },
    });
    expect(paid.lines!.map((l) => [l.name, l.quantity, l.unitPriceMinor, l.totalMinor, l.catalogExternalId])).toEqual([
      ["Burger", 1, 1250, 1350, "ITEMBURGER"],
      ["Fries", 1, 450, 450, "ITEMFRIES"],
      ["Coffee beans", 0.15, 1000, 150, null],
    ]);
    expect(open).toMatchObject({ status: "OPEN", channel: "TAKEAWAY", closedAt: null, guest: null });
    expect(refund).toMatchObject({ status: "REFUNDED", channel: "DELIVERY", taxMinor: 100, totalMinor: 1350, refundedMinor: 500 });
  });

  it("fully refunded with no refund rows counts the whole order as refunded; no created time is skipped", () => {
    expect(mapCloverOrder({ id: "X", total: 900, paymentState: "REFUNDED", createdTime: 1 }, "CAD")).toMatchObject({
      status: "REFUNDED",
      currency: "CAD",
      refundedMinor: 900,
    });
    expect(mapCloverOrder({ id: "Y", total: 900 }, "USD")).toBeNull();
  });

  it("order types map to channels", () => {
    expect(["Dine In", "For Here", "Takeaway", "Pick Up", "Delivery", "Online order", "Bar tab", undefined].map((l) => channelOf(l))).toEqual([
      "DINE_IN",
      "DINE_IN",
      "TAKEAWAY",
      "TAKEAWAY",
      "DELIVERY",
      "ONLINE",
      "UNKNOWN",
      "UNKNOWN",
    ]);
  });

  it("items and customers", () => {
    const items = mapCloverItems(fixture<{ elements: CloverItem[] }>("clover", "items.json").elements, "USD");
    expect(items.map((i) => [i.externalId, i.name, i.category, i.priceMinor, i.active])).toEqual([
      ["ITEMBURGER", "Burger", "Mains", 1250, true],
      ["ITEMFRIES", "Fries", null, 450, false],
      ["ITEMSPECIAL", "Daily special", null, null, true],
    ]);
    expect(mapCloverCustomer({ id: "C1", firstName: "Al", emailAddresses: { elements: [{ emailAddress: "a@x.com" }] } })).toEqual({
      displayName: "Al",
      identities: [
        { kind: "PROVIDER_CUSTOMER", provider: "CLOVER", value: "C1" },
        { kind: "EMAIL", value: "a@x.com", provider: "CLOVER" },
      ],
    });
  });
});

describe("Clover regions and OAuth", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("picks the data centre from the restaurant's country, and sandbox overrides everything", () => {
    expect(providerRegion(cloverManifest, "US")).toBe("NA");
    expect(providerRegion(cloverManifest, "uk")).toBe("EU");
    expect(providerRegion(cloverManifest, "IE")).toBe("EU");
    expect(providerRegion(cloverManifest, null)).toBe("NA");
    expect(oauthUrls(cloverManifest, "EU")).toEqual({
      authorizeUrl: "https://eu.clover.com/oauth/v2/authorize",
      tokenUrl: "https://eu.clover.com/oauth/v2/token",
      refreshUrl: "https://eu.clover.com/oauth/v2/refresh",
    });
    expect(cloverApiBase("EU")).toBe("https://api.eu.clover.com");
    expect(cloverApiBase(null)).toBe("https://api.clover.com");
    vi.stubEnv("CLOVER_ENV", "sandbox");
    expect(oauthUrls(cloverManifest, "EU").tokenUrl).toBe("https://sandbox.dev.clover.com/oauth/v2/token");
    expect(cloverApiBase("EU")).toBe("https://apisandbox.dev.clover.com");
  });

  it("OAuth config is generated from the manifest; no scope parameter when the app defines permissions", () => {
    expect(getOAuthConfig("CLOVER")).toMatchObject({ tokenUrl: cloverManifest.auth.tokenUrl, clientIdEnv: "CLOVER_APP_ID", scopes: [] });
    vi.stubEnv("CLOVER_APP_ID", "cl-app");
    const url = new URL(buildOAuthUrl("CLOVER", "st", "https://trykob.com/api/integrations/CLOVER/callback", "https://eu.clover.com/oauth/v2/authorize")!);
    expect(url.origin + url.pathname).toBe("https://eu.clover.com/oauth/v2/authorize");
    expect(url.searchParams.get("client_id")).toBe("cl-app");
    expect(url.searchParams.has("scope")).toBe(false);
  });
});

describeDb("Clover connector on Postgres (T-89)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let clover: typeof import("@/lib/connectors/clover/connector").cloverConnector;
  let restaurantId: string;

  const ctxFor = (fetch: typeof globalThis.fetch): ConnectorCtx => ({
    restaurantId,
    integrationId: `int-${restaurantId}`,
    externalAccountId: "MERCH123TEST",
    region: "NA",
    getAccessToken: async () => "tok",
    fetch,
    now: () => new Date("2026-10-16T00:00:00Z"),
  });
  const event = (objectId: string, type: string) => ({
    id: "e",
    provider: "CLOVER",
    externalId: `${objectId}:${type}`,
    type: `${objectId.split(":")[0]}.${type}`,
    payloadJson: { objectId, type, ts: 1 },
    restaurantId,
    integrationId: null,
  });

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    clover = (await import("@/lib/connectors/clover/connector")).cloverConnector;
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { timezone: "America/Chicago", countryCode: "US" } });
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    for (const t of ["order", "guest", "menuItemLink", "salesSnapshot"] as const) {
      await (prisma[t] as unknown as { deleteMany(a: unknown): Promise<unknown> }).deleteMany({ where: { restaurantId } });
    }
  });

  it("catalog, orders, customers, then order webhooks (update, delete, gone)", async () => {
    const { fetch, calls } = fakeFetch([
      { match: /\/items\?/, reply: { json: fixture("clover", "items.json") } },
      { match: /\/orders\?/, reply: { json: fixture("clover", "orders.json") } },
      { match: /\/customers\?/, reply: { json: fixture("clover", "customers.json") } },
      { match: /\/orders\/ORDOPEN2\?/, reply: { json: { ...orders()[1], paymentState: "PAID", total: 450, modifiedTime: 1760466000000 } } },
      { match: /\/orders\/ORDGONE\?/, reply: { status: 404, json: { message: "Not found" } } },
    ]);
    const ctx = ctxFor(fetch);

    expect(await clover.sync(ctx, "catalog", null)).toEqual({ rows: 3, nextCursor: null, done: true });
    expect(calls[0].url).toBe("https://api.clover.com/v3/merchants/MERCH123TEST/items?expand=categories&limit=1000&offset=0");
    expect(calls[0].headers.authorization).toBe("Bearer tok");

    const page = await clover.sync(ctx, "orders", null);
    expect(page).toEqual({ rows: 3, done: true, nextCursor: JSON.stringify({ since: new Date(1760472000000).toISOString() }) });
    const q = new URL(calls[1].url).searchParams;
    expect(q.get("filter")).toBe(`modifiedTime>=${Date.parse("2025-09-11T00:00:00.000Z")}`);
    expect(q.get("expand")).toContain("lineItems");

    expect(await clover.sync(ctx, "customers", null)).toEqual({ rows: 2, nextCursor: null, done: true });
    const alice = await prisma.guest.findFirstOrThrow({ where: { restaurantId, displayName: "Alice Example" }, include: { identities: true } });
    expect(alice.identities.map((i) => i.kind).sort()).toEqual(["EMAIL", "PHONE", "PROVIDER_CUSTOMER"]);

    const snaps = async () =>
      (await prisma.salesSnapshot.findMany({ where: { restaurantId } })).map((s) => [s.date.toISOString().slice(0, 10), s.source, s.revenueCents, s.orderCount]);
    expect(await snaps()).toEqual([["2025-10-14", "CLOVER", 2460 + 850, 2]]);
    const paid = await prisma.order.findFirstOrThrow({ where: { restaurantId, sourceExternalId: "ORDPAID1" }, include: { lines: true } });
    expect(paid.guestId).toBe(alice.id);
    expect(paid.lines.find((l) => l.name === "Burger")?.menuItemLinkId).toBeTruthy();

    await clover.handleWebhook!(ctx, event("O:ORDOPEN2", "UPDATE"));
    expect(await snaps()).toEqual([["2025-10-14", "CLOVER", 2460 + 850 + 450, 3]]);

    await clover.handleWebhook!(ctx, event("O:ORDPAID1", "DELETE"));
    expect((await prisma.order.findFirstOrThrow({ where: { restaurantId, sourceExternalId: "ORDPAID1" } })).status).toBe("CANCELLED");
    expect(await snaps()).toEqual([["2025-10-14", "CLOVER", 850 + 450, 2]]);

    await clover.handleWebhook!(ctx, event("O:ORDGONE", "UPDATE"));
    await clover.handleWebhook!(ctx, event("I:ITEMBURGER", "UPDATE"));
    expect(calls.filter((c) => c.url.includes("/items/"))).toHaveLength(0);
  });

  it("pages orders by offset and keeps the watermark until the run ends", async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ ...orders()[0], id: `BULK${i}`, modifiedTime: 1760461500000 + i }));
    let n = 0;
    const { fetch, calls } = fakeFetch([{ match: /\/orders\?/, reply: () => ({ json: { elements: ++n === 1 ? full : [] } }) }]);
    const ctx = ctxFor(fetch);
    const p1 = await clover.sync(ctx, "orders", JSON.stringify({ since: "2025-10-01T00:00:00.000Z" }));
    expect(p1.done).toBe(false);
    expect(JSON.parse(p1.nextCursor!)).toEqual({ since: "2025-10-01T00:00:00.000Z", page: "100", maxSeen: new Date(1760461500099).toISOString() });
    const p2 = await clover.sync(ctx, "orders", p1.nextCursor);
    expect(new URL(calls[1].url).searchParams.get("offset")).toBe("100");
    expect(p2).toEqual({ rows: 0, done: true, nextCursor: JSON.stringify({ since: new Date(1760461500099).toISOString() }) });
  });

  it("refuses to sync without a merchant id", async () => {
    const { fetch } = fakeFetch([]);
    await expect(clover.sync({ ...ctxFor(fetch), externalAccountId: null }, "orders", null)).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
