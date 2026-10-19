import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.INTEGRATION_ENC_KEY ??= Buffer.alloc(32, 7).toString("base64");
  process.env.SQUARE_APPLICATION_ID = "sq-app";
  process.env.SQUARE_APPLICATION_SECRET = "sq-secret";
  process.env.GOOGLE_OAUTH_CLIENT_ID = "g-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "g-secret";
});

const DAY = 86_400_000;

function tokenEndpoint(opts: { delayMs?: number; status?: number; body?: Record<string, unknown> } = {}) {
  let n = 0;
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    n += 1;
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    const body = opts.body ?? { access_token: `new-access-${n}`, refresh_token: `new-refresh-${n}`, expires_at: new Date(Date.now() + 30 * DAY).toISOString() };
    return Response.json(body, { status: opts.status ?? 200 });
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

describeDb("hub token service on Postgres", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let tokens: typeof import("@/lib/hub/tokens");
  let crypto: typeof import("@/lib/crypto/tokens");
  let restaurantId: string;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    tokens = await import("@/lib/hub/tokens");
    crypto = await import("@/lib/crypto/tokens");
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await prisma.integration.deleteMany({ where: { restaurantId } });
  });

  const square = (expiresInMs: number, extra: Record<string, unknown> = {}) =>
    prisma.integration.create({
      data: {
        restaurantId,
        provider: "SQUARE",
        encryptedAccessToken: crypto.encryptSecret("old-access"),
        encryptedRefreshToken: crypto.encryptSecret("old-refresh"),
        accessTokenExpiresAt: new Date(Date.now() + expiresInMs),
        ...extra,
      },
    });

  it("returns a fresh token without calling the provider", async () => {
    const row = await square(25 * DAY);
    const ep = tokenEndpoint();
    expect(await tokens.getAccessToken(row.id, { fetch: ep.fetch })).toBe("old-access");
    expect(ep.calls).toHaveLength(0);
  });

  it("Square refreshes from day 7 (23 days left) and persists the rotated refresh token", async () => {
    const row = await square(23 * DAY - 60_000);
    const ep = tokenEndpoint();
    expect(await tokens.getAccessToken(row.id, { fetch: ep.fetch })).toBe("new-access-1");
    expect(ep.calls[0].url).toBe("https://connect.squareup.com/oauth2/token");
    expect(JSON.parse(String(ep.calls[0].init.body))).toEqual({
      grant_type: "refresh_token",
      refresh_token: "old-refresh",
      client_id: "sq-app",
      client_secret: "sq-secret",
    });
    const after = await prisma.integration.findUniqueOrThrow({ where: { id: row.id } });
    expect(tokens.decryptTokens(after)).toEqual({ accessToken: "new-access-1", refreshToken: "new-refresh-1" });
    expect(after.accessTokenExpiresAt!.getTime()).toBeGreaterThan(Date.now() + 29 * DAY);
  });

  it("concurrent callers trigger exactly one refresh (advisory lock)", async () => {
    const row = await square(-1000);
    const ep = tokenEndpoint({ delayMs: 400 });
    const results = await Promise.all(Array.from({ length: 6 }, () => tokens.getAccessToken(row.id, { fetch: ep.fetch, pollMs: 50 })));
    expect(ep.calls).toHaveLength(1);
    expect(new Set(results)).toEqual(new Set(["new-access-1"]));
  });

  it("invalid_grant sets REAUTH and stops further refresh attempts", async () => {
    const row = await square(-1000);
    const ep = tokenEndpoint({ status: 400, body: { error: "invalid_grant" } });
    await expect(tokens.getAccessToken(row.id, { fetch: ep.fetch })).rejects.toMatchObject({ code: "reauth_required" });
    const after = await prisma.integration.findUniqueOrThrow({ where: { id: row.id } });
    expect(after).toMatchObject({ status: "REAUTH", lastErrorCode: "invalid_grant" });
    await expect(tokens.getAccessToken(row.id, { fetch: ep.fetch })).rejects.toMatchObject({ code: "reauth_required" });
    expect(ep.calls).toHaveLength(1);
  });

  it("a provider 5xx is retryable and leaves the integration connected", async () => {
    const row = await square(-1000);
    const ep = tokenEndpoint({ status: 503, body: {} });
    await expect(tokens.getAccessToken(row.id, { fetch: ep.fetch })).rejects.toMatchObject({ code: "refresh_failed" });
    expect(await prisma.integration.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({ status: "CONNECTED", lastErrorCode: "refresh_failed" });
  });

  it("after a 401, forces one refresh unless the rejected token was already replaced", async () => {
    const row = await square(20 * DAY);
    const ep = tokenEndpoint();
    expect(await tokens.refreshAccessToken(row.id, { fetch: ep.fetch, rejectedAccessToken: "old-access" })).toBe("new-access-1");
    expect(await tokens.refreshAccessToken(row.id, { fetch: ep.fetch, rejectedAccessToken: "old-access" })).toBe("new-access-1");
    expect(ep.calls).toHaveLength(1);
  });

  it("legacy providers refresh with their oauth-config (Google, form body, expires_in)", async () => {
    const row = await prisma.integration.create({
      data: {
        restaurantId,
        provider: "GOOGLE_ANALYTICS",
        encryptedAccessToken: crypto.encryptSecret("g-old"),
        encryptedRefreshToken: crypto.encryptSecret("g-refresh"),
        accessTokenExpiresAt: new Date(Date.now() + 60_000),
      },
    });
    const ep = tokenEndpoint({ body: { access_token: "g-new", expires_in: 3599, scope: "a b" } });
    expect(await tokens.getAccessToken(row.id, { fetch: ep.fetch })).toBe("g-new");
    expect(String(ep.calls[0].init.body)).toContain("grant_type=refresh_token");
    const after = await prisma.integration.findUniqueOrThrow({ where: { id: row.id } });
    expect(tokens.decryptTokens(after).refreshToken).toBe("g-refresh");
    expect(after.scopesGranted).toEqual(["a", "b"]);
  });

  it("dueForRefresh lists tokens entering their window", async () => {
    const due = await square(23 * DAY + 3_600_000);
    const notDue = await prisma.integration.create({
      data: { restaurantId, provider: "GMAIL", encryptedAccessToken: crypto.encryptSecret("x"), accessTokenExpiresAt: new Date(Date.now() + 3 * DAY) },
    });
    const ids = (await tokens.dueForRefresh(new Date(), DAY)).map((r) => r.id);
    expect(ids).toContain(due.id);
    expect(ids).not.toContain(notDue.id);
  });
});

describe("hub auth helpers", () => {
  it("tokenSetFrom reads expires_in, expires_at and scopes", async () => {
    const { tokenSetFrom } = await import("@/lib/hub/auth/oauth2");
    const now = new Date("2026-10-19T00:00:00Z");
    expect(tokenSetFrom({ access_token: "a", expires_in: 3600, scope: "x y" }, now)).toMatchObject({
      accessToken: "a",
      expiresAt: new Date("2026-10-19T01:00:00Z"),
      scopes: ["x", "y"],
    });
    expect(tokenSetFrom({ access_token: "a", expires_at: "2026-11-18T00:00:00Z" }).expiresAt).toEqual(new Date("2026-11-18T00:00:00Z"));
    expect(() => tokenSetFrom({})).toThrow();
  });

  it("client credentials with basic auth", async () => {
    const { clientCredentialsGrant } = await import("@/lib/hub/auth/oauth2");
    const ep = tokenEndpoint({ body: { access_token: "cc", expires_in: 1800 } });
    await clientCredentialsGrant({ tokenUrl: "https://id.example/token", clientId: "id", clientSecret: "secret", clientAuth: "basic", fetch: ep.fetch }, "consumer_api");
    const headers = ep.calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("id:secret").toString("base64")}`);
    expect(String(ep.calls[0].init.body)).toBe("grant_type=client_credentials&scope=consumer_api");
  });

  it("jwt-bearer exchange (Zettle) and HS256 signing", async () => {
    const { jwtBearerGrant, signHs256 } = await import("@/lib/hub/auth/jwt-bearer");
    const ep = tokenEndpoint({ body: { access_token: "z", expires_in: 7200 } });
    const set = await jwtBearerGrant({ tokenUrl: "https://oauth.zettle.com/token", clientId: "kob", assertion: "merchant-key", fetch: ep.fetch });
    expect(set.accessToken).toBe("z");
    expect(String(ep.calls[0].init.body)).toContain("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer");
    const secret = randomBytes(32);
    const jwt = signHs256({ aud: "doordash", iss: "dev" }, secret, { "dd-ver": "DD-JWT-V1" });
    const [head, body, sig] = jwt.split(".");
    expect(JSON.parse(Buffer.from(head, "base64url").toString())).toMatchObject({ alg: "HS256", "dd-ver": "DD-JWT-V1" });
    expect(JSON.parse(Buffer.from(body, "base64url").toString())).toEqual({ aud: "doordash", iss: "dev" });
    const { createHmac } = await import("node:crypto");
    expect(sig).toBe(createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url"));
  });

  it("api-key fields: required, trimmed, encrypted round trip, masked", async () => {
    vi.stubEnv("INTEGRATION_ENC_KEY", Buffer.alloc(32, 9).toString("base64"));
    const { readKeyFields, encryptKeyFields, decryptKeyFields, maskSecret } = await import("@/lib/hub/auth/api-key");
    const spec = [
      { name: "key", label: "API key", secret: false },
      { name: "secret", label: "API secret", secret: true },
    ];
    expect(readKeyFields(spec, { key: " k ", secret: "" })).toEqual({ ok: false, missing: ["API secret"] });
    const read = readKeyFields(spec, { key: " k ", secret: "s3cr3t" });
    expect(read).toEqual({ ok: true, fields: { key: "k", secret: "s3cr3t" } });
    const enc = encryptKeyFields({ key: "k", secret: "s3cr3t" });
    expect(enc).not.toContain("s3cr3t");
    expect(decryptKeyFields(enc)).toEqual({ key: "k", secret: "s3cr3t" });
    expect(maskSecret("abcdef123")).toBe("••••f123");
    vi.unstubAllEnvs();
  });
});
