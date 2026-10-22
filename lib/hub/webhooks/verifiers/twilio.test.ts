import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";
import { fixture, whReq } from "@/tests/helpers/webhooks";
import { createTwilioVerifier, subaccountToken, twilioSignature, twilioVerifier } from "./twilio";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.INTEGRATION_ENC_KEY ??= Buffer.alloc(32, 7).toString("base64");
});

const raw = fixture("twilio-call-completed.txt");
const URL_ = "https://trykob.com/api/webhooks/twilio";

describe("twilio verifier", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("matches Twilio's documented example signature", () => {
    // https://www.twilio.com/docs/usage/security#validating-requests
    const params = { CallSid: "CA1234567890ABCDE", Caller: "+12349013030", Digits: "1234", From: "+12349013030", To: "+18005551212" };
    expect(twilioSignature("12345", "https://mycompany.com/myapp.php?foo=1&bar=2", params)).toBe("0/KCTR6DLpKmkAf8muzZqo1nDgQ=");
  });

  it("accepts a valid signature; dedupe key is sid + status", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tw-token");
    const sig = twilioSignature("tw-token", URL_, Object.fromEntries(new URLSearchParams(raw)));
    expect(await twilioVerifier.verify(whReq(raw, { "x-twilio-signature": sig }, { urls: [URL_] }))).toMatchObject({
      ok: true,
      events: [{ externalId: "CA1234567890abcdef1234567890abcdef:completed", type: "call.completed", accountId: "ACtest0000000000000000000000000000" }],
    });
  });

  it("rejects a bad signature or tampered param", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tw-token");
    const sig = twilioSignature("tw-token", URL_, Object.fromEntries(new URLSearchParams(raw)));
    expect(await twilioVerifier.verify(whReq(raw, { "x-twilio-signature": "nope" }, { urls: [URL_] }))).toMatchObject({ ok: false, status: 401 });
    expect(await twilioVerifier.verify(whReq(raw.replace("CallDuration=74", "CallDuration=7"), { "x-twilio-signature": sig }, { urls: [URL_] }))).toMatchObject({ ok: false });
  });

  it("checks the subaccount's token first, then the master token", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "master-token");
    const params = Object.fromEntries(new URLSearchParams(raw));
    const lookup = vi.fn(async (sid: string) => (sid === "ACtest0000000000000000000000000000" ? "sub-token" : null));
    const verifier = createTwilioVerifier(lookup);
    const signedBy = (token: string) => whReq(raw, { "x-twilio-signature": twilioSignature(token, URL_, params) }, { urls: [URL_] });

    expect(await verifier.verify(signedBy("sub-token"))).toMatchObject({ ok: true });
    expect(lookup).toHaveBeenCalledWith("ACtest0000000000000000000000000000");
    expect(await verifier.verify(signedBy("master-token"))).toMatchObject({ ok: true });
    expect(await verifier.verify(signedBy("someone-else"))).toMatchObject({ ok: false, status: 401 });
    expect(await createTwilioVerifier(async () => { throw new Error("db down"); }).verify(signedBy("master-token"))).toMatchObject({ ok: true });
  });

  it("is not configured with neither a subaccount nor a master token", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    expect(await createTwilioVerifier(async () => null).verify(whReq(raw, { "x-twilio-signature": "x" }, { urls: [URL_] }))).toMatchObject({ ok: false, status: 503 });
  });

  it("routes events to the restaurant that owns the subaccount", () => {
    expect(twilioVerifier.integrationProvider).toBe("TWILIO");
  });
});

describeDb("twilio subaccount tokens on Postgres", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let restaurantId: string;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    restaurantId = (await seedRestaurant(prisma)).restaurant.id;
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  it("reads the auth token of a live subaccount by AccountSid", async () => {
    const { encryptKeyFields } = await import("@/lib/hub/auth/api-key");
    const sid = `AC${restaurantId.slice(0, 32).padEnd(32, "0")}`;
    const row = await prisma.integration.create({
      data: { restaurantId, provider: "TWILIO", authKind: "API_KEY", externalAccountId: sid, encryptedApiKey: encryptKeyFields({ authToken: "sub-secret" }) },
    });
    expect(await subaccountToken(sid)).toBe("sub-secret");
    expect(await subaccountToken("ACnobody")).toBeNull();
    await prisma.integration.update({ where: { id: row.id }, data: { status: "DISCONNECTED" } });
    expect(await subaccountToken(sid)).toBeNull();
  });
});
