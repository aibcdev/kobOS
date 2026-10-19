import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture, whReq } from "@/tests/helpers/webhooks";
import { purpleListenerKey, purpleVerifier } from "./purple";

const raw = fixture("purple-visit.json");

describe("purple verifier", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts the per-venue key, resolves the restaurant and sets wifiWebhookListener", async () => {
    vi.stubEnv("PURPLE_WEBHOOK_SALT", "salt");
    const key = purpleListenerKey("rest_1");
    expect(await purpleVerifier.verify(whReq(raw, {}, { key }))).toMatchObject({
      ok: true,
      events: [{ externalId: "rest_1:88123", type: "visitor.connected", restaurantId: "rest_1" }],
      response: { headers: { wifiWebhookListener: "1" } },
    });
  });

  it("rejects a forged or other venue's key", async () => {
    vi.stubEnv("PURPLE_WEBHOOK_SALT", "salt");
    const other = purpleListenerKey("rest_2");
    expect(await purpleVerifier.verify(whReq(raw, {}, { key: `rest_1.${other.split(".")[1]}` }))).toMatchObject({ ok: false, status: 401 });
    expect(await purpleVerifier.verify(whReq(raw, {}, { key: undefined }))).toMatchObject({ ok: false, status: 401 });
  });
});
