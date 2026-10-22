import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture, whReq } from "@/tests/helpers/webhooks";
import { cloverVerifier } from "./clover";

const raw = fixture("clover-orders.json");

describe("clover verifier", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts X-Clover-Auth and splits merchant updates", async () => {
    vi.stubEnv("CLOVER_WEBHOOK_AUTH_CODE", "clover-auth");
    const out = await cloverVerifier.verify(whReq(raw, { "x-clover-auth": "clover-auth" }));
    expect(out).toMatchObject({
      ok: true,
      events: [
        { externalId: "MERCH123TEST:O:Z3T7EXAMPLE:UPDATE:1760436000000", type: "O.UPDATE", accountId: "MERCH123TEST" },
        { type: "I.DELETE", accountId: "MERCH123TEST" },
      ],
    });
  });

  it("rejects a wrong auth code", async () => {
    vi.stubEnv("CLOVER_WEBHOOK_AUTH_CODE", "clover-auth");
    expect(await cloverVerifier.verify(whReq(raw, { "x-clover-auth": "guess" }))).toMatchObject({ ok: false, status: 401 });
    expect(await cloverVerifier.verify(whReq(raw))).toMatchObject({ ok: false, status: 401 });
  });

  it("stores the one-off verification code without auth", async () => {
    vi.stubEnv("CLOVER_WEBHOOK_AUTH_CODE", "");
    expect(await cloverVerifier.verify(whReq('{"verificationCode":"abc-123"}'))).toMatchObject({ ok: true, events: [{ externalId: "verification:abc-123", type: "verification" }] });
  });
});
