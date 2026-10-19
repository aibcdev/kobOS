import { afterEach, describe, expect, it, vi } from "vitest";
import { hmac } from "@/lib/hub/webhooks/crypto";
import { fixture, whReq } from "@/tests/helpers/webhooks";
import { squareVerifier } from "./square";

const URL_ = "https://trykob.com/api/webhooks/square";
const raw = fixture("square-order-updated.json");

describe("square verifier", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts HMAC-SHA256(key, url + body) and reads merchant + event id", async () => {
    vi.stubEnv("SQUARE_WEBHOOK_SIGNATURE_KEY", "sq-key");
    const sig = hmac("sha256", "sq-key", URL_ + raw, "base64");
    const out = await squareVerifier.verify(whReq(raw, { "x-square-hmacsha256-signature": sig }, { urls: ["https://wrong.example/x", URL_] }));
    expect(out).toMatchObject({ ok: true, events: [{ externalId: "5a6b0f2e-9b1f-3c4d-8e9f-0a1b2c3d4e5f", type: "order.updated", accountId: "MLX9TEST" }] });
  });

  it("rejects a bad signature, a different URL and a tampered body", async () => {
    vi.stubEnv("SQUARE_WEBHOOK_SIGNATURE_KEY", "sq-key");
    const sig = hmac("sha256", "sq-key", URL_ + raw, "base64");
    expect(await squareVerifier.verify(whReq(raw, { "x-square-hmacsha256-signature": "bad" }, { urls: [URL_] }))).toMatchObject({ ok: false, status: 401 });
    expect(await squareVerifier.verify(whReq(raw, { "x-square-hmacsha256-signature": sig }, { urls: ["https://evil.example/api/webhooks/square"] }))).toMatchObject({ ok: false, status: 401 });
    expect(await squareVerifier.verify(whReq(raw.replace("COMPLETED", "OPEN"), { "x-square-hmacsha256-signature": sig }, { urls: [URL_] }))).toMatchObject({ ok: false });
  });

  it("503 when the key isn't configured", async () => {
    vi.stubEnv("SQUARE_WEBHOOK_SIGNATURE_KEY", "");
    expect(await squareVerifier.verify(whReq(raw))).toMatchObject({ ok: false, status: 503 });
  });
});
