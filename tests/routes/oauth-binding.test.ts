import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

const h = vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  return { user: null as string | null, jar: {} as Record<string, string> };
});

vi.mock("@/lib/auth/api-session", () => ({
  requireApiUser: async () => (h.user ? { ok: true, userId: h.user } : { ok: false, status: 401, message: "Unauthorized" }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (n: string) => (h.jar[n] ? { name: n, value: h.jar[n] } : undefined) }) }));
vi.mock("@/inngest/client", () => ({ inngest: { send: async () => undefined } }));
vi.mock("@/lib/connectors", () => ({ registerAllConnectors: () => undefined, CONNECTORS: [] }));

describeDb("OAuth connect/callback binding (review H-2, H-3, H-4)", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let state: typeof import("@/lib/integrations/oauth-state");
  let binding: typeof import("@/lib/integrations/oauth-binding");
  let callback: typeof import("@/app/api/integrations/[provider]/callback/route").GET;
  let connect: typeof import("@/app/api/integrations/[provider]/connect/route").GET;
  const a = { restaurantId: "", owner: "", member: "" };
  const b = { restaurantId: "", owner: "" };

  beforeAll(async () => {
    vi.stubEnv("INTEGRATION_ENC_KEY", Buffer.alloc(32, 7).toString("base64"));
    vi.stubEnv("CLOVER_APP_ID", "clover-app");
    vi.stubEnv("CLOVER_APP_SECRET", "clover-secret");
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ access_token: "tok-A", refresh_token: "ref-A", expires_in: 3600 }), { status: 200 }));
    prisma = (await import("@/lib/db/prisma")).prisma;
    state = await import("@/lib/integrations/oauth-state");
    binding = await import("@/lib/integrations/oauth-binding");
    const { registerConnector } = await import("@/lib/hub/connector");
    const { cloverManifest } = await import("@/lib/connectors/clover/manifest");
    registerConnector({
      manifest: cloverManifest,
      validateCredentials: async (input: Record<string, string>) =>
        input.accessToken === "tok-A" && input.merchantId === "M_A" ? { ok: true, externalAccountId: "M_A" } : { ok: false, error: "401" },
    } as unknown as import("@/lib/hub/connector").Connector);
    callback = (await import("@/app/api/integrations/[provider]/callback/route")).GET;
    connect = (await import("@/app/api/integrations/[provider]/connect/route")).GET;

    const sa = await seedRestaurant(prisma);
    a.restaurantId = sa.restaurant.id;
    a.owner = sa.userId;
    a.member = randomUUID();
    await prisma.user.create({ data: { id: a.member, email: `member-${a.member.slice(0, 8)}@example.com` } });
    await prisma.teamMember.create({ data: { userId: a.member, restaurantId: a.restaurantId, role: "MEMBER" } });
    const sb = await seedRestaurant(prisma);
    b.restaurantId = sb.restaurant.id;
    b.owner = sb.userId;
  });

  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: { in: [a.restaurantId, b.restaurantId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [a.owner, a.member, b.owner] } } });
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    h.user = null;
    h.jar = {};
  });

  const start = (restaurantId: string, userId: string) => state.encodeOAuthState({ restaurantId, userId, provider: "CLOVER", returnTo: "connections", nonce: binding.newNonce() });
  const run = async (s: string, merchant = "M_A") => {
    const res = await callback(new Request(`http://localhost/api/integrations/CLOVER/callback?code=c&state=${encodeURIComponent(s)}&merchant_id=${merchant}`), {
      params: Promise.resolve({ provider: "CLOVER" }),
    });
    return new URL(res.headers.get("location")!);
  };

  it("refuses a callback completed in a browser that didn't start it", async () => {
    const s = start(a.restaurantId, a.owner);
    h.user = b.owner;
    expect((await run(s)).searchParams.get("connectionError")).toMatch(/Connection expired/);
    h.jar[binding.OAUTH_COOKIE] = binding.stateDigest(s);
    expect((await run(s)).searchParams.get("connectionError")).toMatch(/Sign in with the account that started/);
    expect(await prisma.integration.count({ where: { restaurantId: a.restaurantId } })).toBe(0);
  });

  it("rejects a Clover merchant id the token can't read", async () => {
    const s = start(a.restaurantId, a.owner);
    h.user = a.owner;
    h.jar[binding.OAUTH_COOKIE] = binding.stateDigest(s);
    expect((await run(s, "M_OTHER")).searchParams.get("connectionError")).toMatch(/couldn't confirm which account/);
    expect(await prisma.integration.count({ where: { restaurantId: a.restaurantId } })).toBe(0);
  });

  it("connects with the verified merchant and clears the binding cookie", async () => {
    const s = start(a.restaurantId, a.owner);
    h.user = a.owner;
    h.jar[binding.OAUTH_COOKIE] = binding.stateDigest(s);
    const res = await callback(new Request(`http://localhost/api/integrations/CLOVER/callback?code=c&state=${encodeURIComponent(s)}&merchant_id=M_A`), {
      params: Promise.resolve({ provider: "CLOVER" }),
    });
    expect(new URL(res.headers.get("location")!).searchParams.get("connected")).toBe("CLOVER");
    expect(res.headers.get("set-cookie")).toMatch(/kob-oauth=;/);
    const row = await prisma.integration.findFirstOrThrow({ where: { restaurantId: a.restaurantId, provider: "CLOVER" } });
    expect(row.externalAccountId).toBe("M_A");
  });

  it("won't attach the same merchant to a second restaurant", async () => {
    const s = start(b.restaurantId, b.owner);
    h.user = b.owner;
    h.jar[binding.OAUTH_COOKIE] = binding.stateDigest(s);
    expect((await run(s)).searchParams.get("connectionError")).toMatch(/already connected to another restaurant/);
    expect(await prisma.integration.count({ where: { restaurantId: b.restaurantId } })).toBe(0);
  });

  it("lets only owners and admins start a connect", async () => {
    h.user = a.member;
    const res = await connect(new Request(`http://localhost/api/integrations/CLOVER/connect?restaurantId=${a.restaurantId}&returnTo=connections`), {
      params: Promise.resolve({ provider: "CLOVER" }),
    });
    expect(res.status).toBe(403);
  });

  it("sends an S256 PKCE challenge whose verifier is derived from the nonce", () => {
    const v = binding.pkceVerifier("n1");
    expect(v).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(binding.pkceVerifier("n1")).toBe(v);
    expect(binding.pkceChallenge(v)).not.toBe(v);
  });
});
