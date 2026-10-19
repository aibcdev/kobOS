import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { fakeFetch, fixture } from "@/tests/helpers/fake-fetch";
import type { ConnectorCtx } from "@/lib/hub/connector";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

describeDb("POS read connectors on Postgres (T-88)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let restaurantId: string;

  const ctxFor = (fetch: typeof globalThis.fetch, over: Partial<ConnectorCtx> = {}): ConnectorCtx => ({
    restaurantId,
    integrationId: `int-${restaurantId}`,
    getAccessToken: async () => "tok",
    fetch,
    now: () => new Date("2026-10-16T00:00:00Z"),
    ...over,
  });
  const orders = () =>
    prisma.order.findMany({ where: { restaurantId }, orderBy: { placedAt: "asc" }, include: { lines: { orderBy: { totalMinor: "desc" } } } });
  const snapshots = async () =>
    (await prisma.salesSnapshot.findMany({ where: { restaurantId }, orderBy: { date: "asc" } })).map((s) => [s.date.toISOString().slice(0, 10), s.source, s.revenueCents, s.orderCount]);

  const setRestaurant = (timezone: string, countryCode: string) => prisma.restaurant.update({ where: { id: restaurantId }, data: { timezone, countryCode } });

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    await prisma.order.deleteMany({ where: { restaurantId } });
    await prisma.guest.deleteMany({ where: { restaurantId } });
    await prisma.menuItemLink.deleteMany({ where: { restaurantId } });
    await prisma.salesSnapshot.deleteMany({ where: { restaurantId } });
    await prisma.integration.deleteMany({ where: { restaurantId } });
    await setRestaurant("Europe/London", "GB");
  });

  it("Square: catalog, two order pages, customers, and an order webhook", async () => {
    const { squareConnector } = await import("@/lib/connectors/square/connector");
    let page = 0;
    const { fetch, calls } = fakeFetch([
      { match: /\/v2\/locations$/, reply: { json: fixture("square", "locations.json") } },
      { match: /\/v2\/catalog\/list/, reply: { json: fixture("square", "catalog-list.json") } },
      { method: "POST", match: /\/v2\/orders\/search$/, reply: () => ({ json: fixture("square", ++page === 1 ? "orders-search-page1.json" : "orders-search-page2.json") }) },
      { method: "POST", match: /\/v2\/customers\/search$/, reply: { json: fixture("square", "customers-search.json") } },
      { match: /\/v2\/orders\/tKqcPnGmDXAMPLE$/, reply: { json: fixture("square", "order-retrieve.json") } },
    ]);
    const integration = await prisma.integration.create({ data: { restaurantId, provider: "SQUARE" } });
    const ctx = ctxFor(fetch, { integrationId: integration.id });

    expect(await squareConnector.sync(ctx, "catalog", null)).toEqual({ rows: 3, nextCursor: null, done: true });
    const links = await prisma.menuItemLink.findMany({ where: { restaurantId }, orderBy: { externalId: "asc" } });
    expect(links.map((l) => [l.externalId, l.externalName, l.category, l.priceMinor, l.active])).toEqual([
      ["VAR_BANANA", "Banana bread (Slice)", null, 300, true],
      ["VAR_BANANA_LOAF", "Banana bread (Loaf)", null, 1200, false],
      ["VAR_FLATWHITE", "Flat white", "Coffee", 350, true],
    ]);

    const p1 = await squareConnector.sync(ctx, "orders", null);
    expect(p1).toMatchObject({ rows: 1, done: false });
    expect(JSON.parse(p1.nextCursor!)).toEqual({ since: "2025-09-11T00:00:00.000Z", page: "SQ_PAGE_2", maxSeen: "2026-10-14T19:00:00.000Z" });
    const search = calls.find((c) => c.url.endsWith("/v2/orders/search"))!;
    expect(search.headers.authorization).toBe("Bearer tok");
    expect(search.headers["square-version"]).toBeTruthy();
    expect(search.body).toMatchObject({ location_ids: ["L8EXAMPLE"], query: { filter: { date_time_filter: { updated_at: { start_at: "2025-09-11T00:00:00.000Z" } } } } });

    const p2 = await squareConnector.sync(ctx, "orders", p1.nextCursor);
    expect(p2).toEqual({ rows: 2, done: true, nextCursor: JSON.stringify({ since: "2026-10-16T09:00:00.000Z" }) });
    expect((calls.filter((c) => c.url.endsWith("/v2/orders/search"))[1].body as { cursor: string }).cursor).toBe("SQ_PAGE_2");

    const rows = await orders();
    expect(rows.map((o) => [o.sourceExternalId, o.status, o.channel, o.totalMinor, o.taxMinor, o.tipMinor, o.subtotalMinor, o.refundedMinor])).toEqual([
      ["sqOrderA1", "COMPLETED", "UNKNOWN", 1150, 167, 150, 833, 0],
      ["sqOrderB2", "REFUNDED", "TAKEAWAY", 350, 58, 0, 292, 350],
      ["sqOrderC3", "CANCELLED", "UNKNOWN", 900, 0, 0, 900, 0],
    ]);
    expect(rows[0].lines.map((l) => [l.name, Number(l.quantity), l.totalMinor, l.menuItemLinkId === links[2].id || l.menuItemLinkId === links[0].id])).toEqual([
      ["Flat white", 2, 700, true],
      ["Banana bread (Slice)", 1, 300, true],
    ]);
    expect(await snapshots()).toEqual([
      ["2026-10-14", "SQUARE", 1150, 1],
      ["2026-10-15", "SQUARE", 0, 1],
    ]);

    const cust = await squareConnector.sync(ctx, "customers", null);
    expect(cust).toMatchObject({ rows: 2, done: true });
    const guests = await prisma.guest.findMany({ where: { restaurantId }, include: { identities: true, orders: true }, orderBy: { createdAt: "asc" } });
    expect(guests.map((g) => [g.displayName, g.identities.map((i) => i.kind).sort().join(","), g.orders.length])).toEqual([
      ["Ada Lovelace", "EMAIL,PHONE,PROVIDER_CUSTOMER", 1],
      ["Bob", "PROVIDER_CUSTOMER", 0],
    ]);

    // One active location: picked automatically, and webhooks are filtered to it.
    expect((await prisma.integration.findUniqueOrThrow({ where: { id: integration.id } })).metadata).toMatchObject({ locationIds: ["L8EXAMPLE"] });
    await squareConnector.handleWebhook!({ ...ctx, locationIds: ["L8EXAMPLE"] }, {
      id: "evt",
      provider: "square",
      externalId: "evt",
      type: "order.updated",
      payloadJson: JSON.parse(JSON.stringify((await import("@/lib/hub/webhooks/fixtures/square-order-updated.json")).default)),
      restaurantId,
      integrationId: ctx.integrationId,
    });
    expect(await prisma.order.count({ where: { restaurantId, sourceExternalId: "tKqcPnGmDXAMPLE" } })).toBe(1);
  });

  it("Square runs end to end through the hub runner with a stored token", async () => {
    vi.stubEnv("INTEGRATION_ENC_KEY", Buffer.alloc(32, 3).toString("base64"));
    vi.stubEnv("SQUARE_LIVE", "1");
    const { encryptSecret } = await import("@/lib/crypto/tokens");
    const { registerAllConnectors } = await import("@/lib/connectors");
    const run = await import("@/lib/hub/sync/run");
    const scheduler = await import("@/lib/hub/sync/scheduler");
    registerAllConnectors();
    let page = 0;
    const { fetch, calls } = fakeFetch([
      { match: /\/v2\/locations$/, reply: { json: fixture("square", "locations.json") } },
      { method: "POST", match: /\/v2\/orders\/search$/, reply: () => ({ json: fixture("square", ++page === 1 ? "orders-search-page1.json" : "orders-search-page2.json") }) },
    ]);
    vi.stubGlobal("fetch", fetch);
    const integration = await prisma.integration.create({ data: { restaurantId, provider: "SQUARE", encryptedAccessToken: encryptSecret("stored-token") } });
    await scheduler.ensureCursors(integration.id);
    const step = { run: <T>(_id: string, fn: () => Promise<T>) => fn(), sleep: async () => {} };

    expect(await run.runStream(integration.id, "orders", step)).toEqual({ pages: 2, rows: 3, done: true });
    expect(calls.every((c) => !c.headers.authorization || c.headers.authorization === "Bearer stored-token")).toBe(true);
    const cursor = await prisma.syncCursor.findUniqueOrThrow({ where: { integrationId_stream: { integrationId: integration.id, stream: "orders" } } });
    expect(cursor).toMatchObject({ backfillDone: true, failureCount: 0, cursor: JSON.stringify({ since: "2026-10-16T09:00:00.000Z" }) });
    expect(await prisma.order.count({ where: { restaurantId } })).toBe(3);
  });

  it("Square with two locations waits for the owner's pick, then syncs only the picked venue (review H-8)", async () => {
    const { squareConnector } = await import("@/lib/connectors/square/connector");
    const twoLocations = {
      locations: [
        { id: "L8EXAMPLE", name: "Shoreditch", status: "ACTIVE" },
        { id: "LSOHO", name: "Soho", status: "ACTIVE" },
      ],
    };
    const { fetch, calls } = fakeFetch([
      { match: /\/v2\/locations$/, reply: { json: twoLocations } },
      { method: "POST", match: /\/v2\/orders\/search$/, reply: { json: fixture("square", "orders-search-page2.json") } },
      { match: /\/v2\/orders\/tKqcPnGmDXAMPLE$/, reply: { json: { order: { ...(fixture("square", "order-retrieve.json") as { order: object }).order, location_id: "LSOHO" } } } },
    ]);
    const integration = await prisma.integration.create({ data: { restaurantId, provider: "SQUARE" } });
    const ctx = ctxFor(fetch, { integrationId: integration.id });

    expect(await squareConnector.sync(ctx, "orders", null)).toEqual({ rows: 0, nextCursor: null, done: true });
    expect((await prisma.integration.findUniqueOrThrow({ where: { id: integration.id } })).status).toBe("PENDING_SETUP");
    expect(calls.some((c) => c.url.endsWith("/v2/orders/search"))).toBe(false);

    const { saveLocationChoice } = await import("@/lib/hub/locations");
    await saveLocationChoice(integration.id, ["L8EXAMPLE"]);
    const row = await prisma.integration.findUniqueOrThrow({ where: { id: integration.id } });
    expect(row.status).toBe("CONNECTED");
    const { connectorCtx } = await import("@/lib/hub/ctx");
    const picked = { ...ctx, locationIds: connectorCtx(row).locationIds };
    expect(picked.locationIds).toEqual(["L8EXAMPLE"]);

    await squareConnector.sync(picked, "orders", null);
    expect(calls.find((c) => c.url.endsWith("/v2/orders/search"))!.body).toMatchObject({ location_ids: ["L8EXAMPLE"] });

    // A Soho order arriving by webhook isn't this restaurant's.
    await squareConnector.handleWebhook!(picked, {
      id: "evt2",
      provider: "square",
      externalId: "evt2",
      type: "order.updated",
      payloadJson: JSON.parse(JSON.stringify((await import("@/lib/hub/webhooks/fixtures/square-order-updated.json")).default)),
      restaurantId,
      integrationId: integration.id,
    });
    expect(await prisma.order.count({ where: { restaurantId, sourceExternalId: "tKqcPnGmDXAMPLE" } })).toBe(0);
  });

  it("Square 401 surfaces as AUTH so the runner flags REAUTH", async () => {
    const { squareConnector } = await import("@/lib/connectors/square/connector");
    const { fetch } = fakeFetch([{ match: /\/v2\/locations$/, reply: { status: 401 } }]);
    await expect(squareConnector.sync(ctxFor(fetch), "orders", null)).rejects.toMatchObject({ code: "AUTH" });
  });

  it("Toast: logs in once, maps checks in the restaurant's currency, re-logs in after an expired token", async () => {
    await setRestaurant("America/New_York", "US");
    const { toastConnector, clearToastTokenCache } = await import("@/lib/connectors/toast/connector");
    clearToastTokenCache();
    let bulk = 0;
    const { fetch, calls } = fakeFetch([
      { method: "POST", match: /\/authentication\/v1\/authentication\/login$/, reply: { json: fixture("toast", "login.json") } },
      { match: /\/menus\/v2\/menus$/, reply: { json: fixture("toast", "menus.json") } },
      { match: /\/orders\/v2\/ordersBulk/, reply: () => (++bulk === 2 ? { status: 401 } : { json: fixture("toast", "orders-bulk.json") }) },
    ]);
    const ctx = ctxFor(fetch, { getCredentials: async () => ({ clientId: "cid", clientSecret: "csecret", restaurantGuid: "rest-guid-1" }) });

    expect(await toastConnector.sync(ctx, "catalog", null)).toEqual({ rows: 3, nextCursor: null, done: true });
    const links = await prisma.menuItemLink.findMany({ where: { restaurantId, provider: "TOAST" }, orderBy: { externalId: "asc" } });
    expect(links.map((l) => [l.externalId, l.category, l.priceMinor, l.currency])).toEqual([
      ["item-burger", "Mains", 1450, "USD"],
      ["item-soda", "Drinks", 300, "USD"],
      ["item-special", "Specials", null, "USD"],
    ]);

    const res = await toastConnector.sync(ctx, "orders", JSON.stringify({ since: "2026-10-14T00:00:00.000Z" }));
    expect(res).toEqual({ rows: 3, done: true, nextCursor: JSON.stringify({ since: "2026-10-15T23:50:00.000Z" }) });
    const bulkCall = calls.find((c) => c.url.includes("ordersBulk"))!;
    expect(bulkCall.url).toContain("startDate=2026-10-14T00%3A00%3A00.000%2B0000");
    expect(bulkCall.headers["toast-restaurant-external-id"]).toBe("rest-guid-1");
    expect(calls.filter((c) => c.url.endsWith("/login"))).toHaveLength(1);
    expect(calls.find((c) => c.url.endsWith("/login"))!.body).toEqual({ clientId: "cid", clientSecret: "csecret", userAccessType: "TOAST_MACHINE_CLIENT" });

    const rows = await orders();
    expect(rows.map((o) => [o.sourceExternalId, o.status, o.channel, o.currency, o.totalMinor, o.tipMinor, o.taxMinor, o.discountMinor, o.refundedMinor])).toEqual([
      ["toast-order-1", "COMPLETED", "UNKNOWN", "USD", 3750, 600, 250, 300, 0],
      ["toast-order-2", "REFUNDED", "DELIVERY", "USD", 2000, 0, 160, 0, 500],
      ["toast-order-void", "CANCELLED", "UNKNOWN", "USD", 0, 0, 0, 0, 0],
    ]);
    expect(rows[0].lines.map((l) => [l.name, Number(l.quantity), l.unitPriceMinor, l.totalMinor, l.menuItemLinkId === links[0].id])).toEqual([["Burger", 2, 1450, 2600, true]]);
    const grace = await prisma.guest.findFirstOrThrow({ where: { restaurantId }, include: { identities: true } });
    expect([grace.displayName, grace.identities.length, grace.totalSpendMinor]).toEqual(["Grace Hopper", 3, 3750]);
    expect(await snapshots()).toEqual([
      ["2026-10-14", "TOAST", 3750, 1],
      ["2026-10-15", "TOAST", 1500, 1],
    ]);

    // Second ordersBulk call gets a 401 for the cached token; the connector logs in again and retries once.
    await toastConnector.sync(ctx, "orders", JSON.stringify({ since: "2026-10-14T00:00:00.000Z" }));
    expect(calls.filter((c) => c.url.endsWith("/login"))).toHaveLength(2);
  });

  it("Toast walks backfill in 7-day windows", async () => {
    const { toastConnector, clearToastTokenCache } = await import("@/lib/connectors/toast/connector");
    clearToastTokenCache();
    const { fetch } = fakeFetch([
      { method: "POST", match: /\/login$/, reply: { json: fixture("toast", "login.json") } },
      { match: /\/orders\/v2\/ordersBulk/, reply: { json: [] } },
    ]);
    const ctx = ctxFor(fetch, { getCredentials: async () => ({ clientId: "c", clientSecret: "s", restaurantGuid: "g" }) });
    const res = await toastConnector.sync(ctx, "orders", null);
    expect(res).toEqual({ rows: 0, done: false, nextCursor: JSON.stringify({ since: "2026-07-25T00:00:00.000Z" }) });
  });

  it("Epos Now: walks local trading days, nets refund transactions, names lines from the catalog", async () => {
    const { eposNowConnector } = await import("@/lib/connectors/epos-now/connector");
    const { fetch, calls } = fakeFetch([
      { match: /\/api\/v4\/Product\?page=1$/, reply: { json: fixture("epos-now", "products.json") } },
      { match: /\/api\/v4\/Category\?page=1$/, reply: { json: fixture("epos-now", "categories.json") } },
      { match: /GetByDate\?startDate=2026-10-14/, reply: { json: fixture("epos-now", "transactions-day.json") } },
      { match: /GetByDate\?startDate=2026-10-15/, reply: { json: [] } },
      { match: /\/api\/v4\/Customer\?page=1$/, reply: { json: fixture("epos-now", "customers.json") } },
    ]);
    const ctx = ctxFor(fetch, { now: () => new Date("2026-10-15T10:00:00Z"), getCredentials: async () => ({ apiKey: "KEY", apiSecret: "SECRET" }) });

    expect(await eposNowConnector.sync(ctx, "catalog", null)).toEqual({ rows: 2, nextCursor: null, done: true });
    expect(calls[0].headers.authorization).toBe(`Basic ${Buffer.from("KEY:SECRET").toString("base64")}`);

    const d1 = await eposNowConnector.sync(ctx, "orders", JSON.stringify({ since: "2026-10-13T23:00:00.000Z" }));
    expect(d1).toEqual({ rows: 2, done: false, nextCursor: JSON.stringify({ since: "2026-10-14T23:00:00.000Z" }) });
    const d2 = await eposNowConnector.sync(ctx, "orders", d1.nextCursor);
    expect(d2).toEqual({ rows: 0, done: true, nextCursor: JSON.stringify({ since: "2026-10-14T23:00:00.000Z" }) });

    const rows = await orders();
    expect(rows.map((o) => [o.sourceExternalId, o.placedAt.toISOString(), o.status, o.totalMinor, o.refundedMinor, o.serviceChargeMinor])).toEqual([
      ["9002", "2026-10-14T11:00:00.000Z", "REFUNDED", 0, 980, 0],
      ["9001", "2026-10-14T22:30:00.000Z", "COMPLETED", 2460, 0, 200],
    ]);
    expect(rows[1].lines.map((l) => [l.name, l.totalMinor])).toEqual([
      ["Fish & chips", 1860],
      ["Item", 400],
    ]);
    expect(await snapshots()).toEqual([["2026-10-14", "EPOS_NOW", 1480, 1]]);

    expect(await eposNowConnector.sync(ctx, "customers", null)).toMatchObject({ rows: 2, done: true });
    const alan = await prisma.guest.findFirstOrThrow({ where: { restaurantId, displayName: "Alan Turing" }, include: { identities: true, orders: true } });
    expect([alan.identities.length, alan.orders.length]).toEqual([3, 1]);
  });

  it("Zettle: purchases with refunds and variant catalog links", async () => {
    const { zettleConnector, ZETTLE_PURCHASE_BASE } = await import("@/lib/connectors/zettle/connector");
    const { fetch, calls } = fakeFetch([
      { match: /purchases\/v2/, reply: { json: fixture("zettle", "purchases.json") } },
      { match: /products\/v2$/, reply: { json: fixture("zettle", "products.json") } },
    ]);
    const ctx = ctxFor(fetch, { getAccessToken: async () => "zt-token" });

    expect(await zettleConnector.sync(ctx, "catalog", null)).toEqual({ rows: 3, nextCursor: null, done: true });
    const res = await zettleConnector.sync(ctx, "orders", JSON.stringify({ since: "2026-10-14T00:00:00.000Z" }));
    expect(res).toEqual({ rows: 2, done: true, nextCursor: JSON.stringify({ since: "2026-10-14T11:00:00.000+0000" }) });
    const url = new URL(calls.find((c) => c.url.startsWith(ZETTLE_PURCHASE_BASE))!.url);
    expect(Object.fromEntries(url.searchParams)).toEqual({ startDate: "2026-10-14T00:00:00.000Z", limit: "1000", descending: "false" });
    expect(calls[0].headers.authorization).toBe("Bearer zt-token");

    const rows = await orders();
    expect(rows.map((o) => [o.sourceExternalId, o.status, o.totalMinor, o.taxMinor, o.tipMinor, o.discountMinor, o.subtotalMinor, o.refundedMinor])).toEqual([
      ["zt-p-1", "COMPLETED", 1250, 208, 100, 50, 942, 0],
      ["zt-p-2", "REFUNDED", 0, 0, 0, 0, 0, 400],
    ]);
    expect(rows[0].lines.map((l) => [l.name, l.totalMinor, l.menuItemLinkId !== null])).toEqual([
      ["Cake (Slice)", 800, true],
      ["Tea", 350, true],
    ]);
    expect(await snapshots()).toEqual([["2026-10-14", "ZETTLE", 850, 1]]);
  });

  it("every connector is registered under its manifest and behind its flag", async () => {
    const { CONNECTORS } = await import("@/lib/connectors");
    const { FLAGS } = await import("@/lib/flags");
    const { getManifest } = await import("@/lib/hub/manifest");
    for (const c of CONNECTORS) {
      expect(getManifest(c.manifest.provider)).toBe(c.manifest);
      expect(FLAGS).toContain(c.manifest.approval.flag);
      expect(c.manifest.actions).toEqual(c.manifest.provider === "SQUARE" ? ["pos.item.86", "pos.item.price.update"] : []);
    }
  });
});
