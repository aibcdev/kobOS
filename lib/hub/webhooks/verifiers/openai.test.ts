import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture, whReq } from "@/tests/helpers/webhooks";
import { openaiVerifier, standardWebhookSignature } from "./openai";

const raw = fixture("openai-call-incoming.json");
const SECRET = `whsec_${Buffer.from("openai-test-secret").toString("base64")}`;

describe("openai verifier (standard webhooks)", () => {
  afterEach(() => vi.unstubAllEnvs());

  const headers = (ts: number, secret = SECRET) => ({
    "webhook-id": "wh_123",
    "webhook-timestamp": String(ts),
    "webhook-signature": `v1,${standardWebhookSignature(secret, "wh_123", String(ts), raw)}`,
  });

  it("accepts a fresh signature", async () => {
    vi.stubEnv("OPENAI_WEBHOOK_SECRET", SECRET);
    const now = new Date();
    expect(await openaiVerifier.verify(whReq(raw, headers(Math.floor(now.getTime() / 1000)), { now }))).toMatchObject({
      ok: true,
      events: [{ externalId: "wh_123", type: "realtime.call.incoming" }],
    });
  });

  it("rejects a wrong secret or a replayed (old) timestamp", async () => {
    vi.stubEnv("OPENAI_WEBHOOK_SECRET", SECRET);
    const now = new Date();
    const other = `whsec_${Buffer.from("other").toString("base64")}`;
    expect(await openaiVerifier.verify(whReq(raw, headers(Math.floor(now.getTime() / 1000), other), { now }))).toMatchObject({ ok: false, status: 401 });
    expect(await openaiVerifier.verify(whReq(raw, headers(Math.floor(now.getTime() / 1000) - 3600), { now }))).toMatchObject({ ok: false, status: 401 });
  });
});
