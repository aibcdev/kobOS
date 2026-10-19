import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { hmac } from "@/lib/hub/webhooks/crypto";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { fixture } from "@/tests/helpers/webhooks";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const sent = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/inngest/client", () => ({ inngest: { send: sent.send } }));

const SITE = "https://trykob.com";

describeDb("webhook router on Postgres", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let router: typeof import("@/lib/hub/webhooks/router");
  let POST: typeof import("@/app/api/webhooks/[provider]/route").POST;
  let POST_KEY: typeof import("@/app/api/webhooks/[provider]/[key]/route").POST;
  let restaurantId: string;
  let integrationId: string;
  const merchant = `MLX9-${Date.now()}`;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    router = await import("@/lib/hub/webhooks/router");
    POST = (await import("@/app/api/webhooks/[provider]/route")).POST;
    POST_KEY = (await import("@/app/api/webhooks/[provider]/[key]/route")).POST;
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
    integrationId = (await prisma.integration.create({ data: { restaurantId, provider: "SQUARE", externalAccountId: merchant } })).id;
  });
  afterAll(async () => {
    await prisma.connectorEvent.deleteMany({ where: { OR: [{ restaurantId }, { externalId: { contains: merchant } }, { provider: { in: ["square", "xero", "purple"] }, restaurantId: null }] } });
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
    vi.stubEnv("SQUARE_WEBHOOK_SIGNATURE_KEY", "sq-key");
    sent.send.mockReset();
  });

  const squareReq = (eventId: string, merchantId = merchant) => {
    const raw = fixture("square-order-updated.json").replace("5a6b0f2e-9b1f-3c4d-8e9f-0a1b2c3d4e5f", eventId).replace("MLX9TEST", merchantId);
    const url = `${SITE}/api/webhooks/square`;
    return new Request("http://127.0.0.1:3000/api/webhooks/square", {
      method: "POST",
      headers: { "x-square-hmacsha256-signature": hmac("sha256", "sq-key", url + raw, "base64") },
      body: raw,
    });
  };
  const params = (provider: string) => ({ params: Promise.resolve({ provider }) });

  it("stores, resolves the tenant, enqueues and acks in under a second", async () => {
    const id = `evt-${merchant}-1`;
    const started = performance.now();
    const res = await POST(squareReq(id), params("square"));
    expect(performance.now() - started).toBeLessThan(1000);
    expect(res.status).toBe(200);
    const row = await prisma.connectorEvent.findUniqueOrThrow({ where: { provider_externalId: { provider: "square", externalId: id } } });
    expect(row).toMatchObject({ restaurantId, integrationId, status: "RECEIVED", type: "order.updated" });
    expect(sent.send).toHaveBeenCalledWith([{ name: "hub/webhook.received", data: { eventId: row.id } }]);
  });

  it("ignores duplicate deliveries", async () => {
    const id = `evt-${merchant}-dup`;
    expect((await POST(squareReq(id), params("square"))).status).toBe(200);
    expect((await POST(squareReq(id), params("square"))).status).toBe(200);
    expect(await prisma.connectorEvent.count({ where: { provider: "square", externalId: id } })).toBe(1);
    expect(sent.send).toHaveBeenCalledTimes(1);
  });

  it("keeps unknown-tenant events as IGNORED and doesn't enqueue them", async () => {
    const id = `evt-${merchant}-orphan`;
    expect((await POST(squareReq(id, "UNKNOWN-MERCHANT"), params("square"))).status).toBe(200);
    expect(await prisma.connectorEvent.findUniqueOrThrow({ where: { provider_externalId: { provider: "square", externalId: id } } })).toMatchObject({
      status: "IGNORED",
      error: "no_tenant",
      restaurantId: null,
    });
    expect(sent.send).not.toHaveBeenCalled();
  });

  it("401 on a bad signature (nothing stored), 404 on unknown providers", async () => {
    const bad = new Request(`${SITE}/api/webhooks/square`, { method: "POST", headers: { "x-square-hmacsha256-signature": "x" }, body: "{}" });
    expect((await POST(bad, params("square"))).status).toBe(401);
    expect((await POST(new Request(`${SITE}/api/webhooks/nope`, { method: "POST", body: "{}" }), params("nope"))).status).toBe(404);
  });

  it("still acks when the enqueue fails (the sweep re-sends)", async () => {
    sent.send.mockRejectedValueOnce(new Error("inngest down"));
    const id = `evt-${merchant}-enqueue-fail`;
    expect((await POST(squareReq(id), params("square"))).status).toBe(200);
    const { staleEventIds } = await import("@/lib/hub/webhooks/process");
    const row = await prisma.connectorEvent.findUniqueOrThrow({ where: { provider_externalId: { provider: "square", externalId: id } } });
    expect(await staleEventIds(new Date(Date.now() + 10 * 60_000))).toContain(row.id);
  });

  it("xero intent-to-receive answers 200 with an empty body", async () => {
    vi.stubEnv("XERO_WEBHOOK_KEY", "xero-key");
    const raw = fixture("xero-intent.json");
    const res = await POST(new Request(`${SITE}/api/webhooks/xero`, { method: "POST", headers: { "x-xero-signature": hmac("sha256", "xero-key", raw, "base64") }, body: raw }), params("xero"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
    const bad = await POST(new Request(`${SITE}/api/webhooks/xero`, { method: "POST", headers: { "x-xero-signature": "nope" }, body: raw }), params("xero"));
    expect(bad.status).toBe(401);
  });

  it("purple: per-venue key path, listener header, PII hashed in the stored payload", async () => {
    vi.stubEnv("PURPLE_WEBHOOK_SALT", "salt");
    const { purpleListenerKey } = await import("@/lib/hub/webhooks/verifiers/purple");
    const raw = fixture("purple-visit.json").replace("88123", `${Date.now()}`);
    const res = await POST_KEY(new Request(`${SITE}/api/webhooks/purple/x`, { method: "POST", body: raw }), {
      params: Promise.resolve({ provider: "purple", key: purpleListenerKey(restaurantId) }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("wifiWebhookListener")).toBe("1");
    const row = await prisma.connectorEvent.findFirstOrThrow({ where: { provider: "purple", restaurantId }, orderBy: { receivedAt: "desc" } });
    const stored = JSON.stringify(row.payloadJson);
    expect(stored).not.toContain("guest@example.com");
    expect(stored).not.toContain("+447700900123");
    expect((row.payloadJson as { visitor: { email: string } }).visitor.email).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("signedUrlCandidates prefers the public site URL", () => {
    const req = new Request("http://10.0.0.1:3000/api/webhooks/twilio?x=1", { headers: { "x-forwarded-host": "trykob.com", "x-forwarded-proto": "https" } });
    expect(router.signedUrlCandidates(req, "twilio")[0]).toBe("https://trykob.com/api/webhooks/twilio?x=1");
  });

  it("processing without a connector handler marks the event IGNORED (no_handler)", async () => {
    const id = `evt-${merchant}-process`;
    await POST(squareReq(id), params("square"));
    const row = await prisma.connectorEvent.findUniqueOrThrow({ where: { provider_externalId: { provider: "square", externalId: id } } });
    const { processConnectorEvent } = await import("@/lib/hub/webhooks/process");
    expect(await processConnectorEvent(row.id)).toBe("ignored");
    expect(await prisma.connectorEvent.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({ status: "IGNORED", error: "no_handler" });
    expect(await processConnectorEvent(row.id)).toBe("skipped");
  });

  it("processing runs the registered connector's handleWebhook once", async () => {
    const { registerConnector, clearConnectors } = await import("@/lib/hub/connector");
    const { getManifest } = await import("@/lib/hub/manifest");
    const handled: string[] = [];
    registerConnector({
      manifest: getManifest("SQUARE")!,
      validateCredentials: async () => ({ ok: true }),
      sync: async () => ({ rows: 0, nextCursor: null, done: true }),
      handleWebhook: async (ctx, event) => {
        handled.push(`${ctx.restaurantId}:${event.type}`);
      },
    });
    const id = `evt-${merchant}-handled`;
    await POST(squareReq(id), params("square"));
    const row = await prisma.connectorEvent.findUniqueOrThrow({ where: { provider_externalId: { provider: "square", externalId: id } } });
    const { processConnectorEvent } = await import("@/lib/hub/webhooks/process");
    expect(await processConnectorEvent(row.id)).toBe("processed");
    expect(await processConnectorEvent(row.id)).toBe("skipped");
    expect(handled).toEqual([`${restaurantId}:order.updated`]);
    clearConnectors();
  });
});

it("minimisePayload hashes email/phone keys and keeps the rest", async () => {
  const { minimisePayload } = await import("@/lib/hub/webhooks/minimise");
  const out = minimisePayload({ id: "x", amount: 12, customer: { email_address: "A@B.com", phone_number: "+44 7700", name: "Sam" }, From: "+447700900123", To: "+442071234567" }) as { id: string; amount: number; From: string; To: string; customer: Record<string, string> };
  expect(out.id).toBe("x");
  expect(out.amount).toBe(12);
  expect(out.customer.name).toBe("Sam");
  expect(out.customer.email_address).toMatch(/^sha256:/);
  expect(out.customer.phone_number).toMatch(/^sha256:/);
  expect(out.From).toMatch(/^sha256:/);
  expect(out.To).toBe("+442071234567");
});
