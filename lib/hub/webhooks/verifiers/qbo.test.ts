import { afterEach, describe, expect, it, vi } from "vitest";
import { hmac } from "@/lib/hub/webhooks/crypto";
import { fixture, whReq } from "@/tests/helpers/webhooks";
import { qboVerifier } from "./qbo";

const raw = fixture("qbo-bill-create.json");

describe("qbo verifier", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts intuit-signature and yields one event per entity", async () => {
    vi.stubEnv("QBO_WEBHOOK_VERIFIER", "qbo-token");
    const out = await qboVerifier.verify(whReq(raw, { "intuit-signature": hmac("sha256", "qbo-token", raw, "base64") }));
    expect(out).toMatchObject({
      ok: true,
      events: [
        { type: "bill.create", accountId: "9341452000000000", externalId: "9341452000000000:Bill:145:Create:2026-10-14T10:01:12.000Z" },
        { type: "vendor.update" },
      ],
    });
  });

  it("rejects a bad signature", async () => {
    vi.stubEnv("QBO_WEBHOOK_VERIFIER", "qbo-token");
    expect(await qboVerifier.verify(whReq(raw, { "intuit-signature": hmac("sha256", "x", raw, "base64") }))).toMatchObject({ ok: false, status: 401 });
  });
});
