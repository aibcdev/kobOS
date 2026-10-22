import { afterEach, describe, expect, it, vi } from "vitest";
import { hmac } from "@/lib/hub/webhooks/crypto";
import { fixture, whReq } from "@/tests/helpers/webhooks";
import { xeroVerifier } from "./xero";

describe("xero verifier", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("intent to receive: 200 with an empty body on a correct signature, 401 on an incorrect one", async () => {
    vi.stubEnv("XERO_WEBHOOK_KEY", "xero-key");
    const raw = fixture("xero-intent.json");
    expect(await xeroVerifier.verify(whReq(raw, { "x-xero-signature": hmac("sha256", "xero-key", raw, "base64") }))).toEqual({
      ok: true,
      events: [],
      response: { status: 200, body: "" },
    });
    expect(await xeroVerifier.verify(whReq(raw, { "x-xero-signature": hmac("sha256", "other", raw, "base64") }))).toMatchObject({ ok: false, status: 401 });
  });

  it("reads tenant and resource from events", async () => {
    vi.stubEnv("XERO_WEBHOOK_KEY", "xero-key");
    const raw = fixture("xero-invoice-update.json");
    expect(await xeroVerifier.verify(whReq(raw, { "x-xero-signature": hmac("sha256", "xero-key", raw, "base64") }))).toMatchObject({
      ok: true,
      events: [{ type: "invoice.update", accountId: "c2cc9b6e-0000-4000-8000-0000000000aa" }],
    });
  });
});
