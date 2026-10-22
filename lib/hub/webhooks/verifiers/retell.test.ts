import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture, whReq } from "@/tests/helpers/webhooks";
import { retellSignature, retellVerifier } from "./retell";

const raw = fixture("retell-call-ended.json");

describe("retell verifier", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts v=<ts>,d=<hmac> and dedupes on call id + event", async () => {
    vi.stubEnv("RETELL_WEBHOOK_SECRET", "retell-key");
    const now = new Date();
    const sig = retellSignature("retell-key", raw, String(now.getTime()));
    expect(await retellVerifier.verify(whReq(raw, { "x-retell-signature": sig }, { now }))).toMatchObject({
      ok: true,
      events: [{ externalId: "call_a1b2c3d4e5:call_ended", type: "call_ended" }],
    });
  });

  it("rejects bad digests and stale timestamps", async () => {
    vi.stubEnv("RETELL_WEBHOOK_SECRET", "retell-key");
    const now = new Date();
    expect(await retellVerifier.verify(whReq(raw, { "x-retell-signature": retellSignature("other", raw, String(now.getTime())) }, { now }))).toMatchObject({ ok: false });
    const old = String(now.getTime() - 10 * 60_000);
    expect(await retellVerifier.verify(whReq(raw, { "x-retell-signature": retellSignature("retell-key", raw, old) }, { now }))).toMatchObject({ ok: false });
  });
});
