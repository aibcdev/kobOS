import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture, whReq } from "@/tests/helpers/webhooks";
import { vapiVerifier } from "./vapi";

const raw = fixture("vapi-end-of-call.json");

describe("vapi verifier", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts x-vapi-secret", async () => {
    vi.stubEnv("VAPI_SERVER_SECRET", "vapi-secret");
    expect(await vapiVerifier.verify(whReq(raw, { "x-vapi-secret": "vapi-secret" }))).toMatchObject({
      ok: true,
      events: [{ externalId: "vapi-call-1:end-of-call-report:1760436000000", type: "end-of-call-report" }],
    });
  });

  it("rejects a wrong or missing secret", async () => {
    vi.stubEnv("VAPI_SERVER_SECRET", "vapi-secret");
    expect(await vapiVerifier.verify(whReq(raw, { "x-vapi-secret": "vapi-secreT" }))).toMatchObject({ ok: false, status: 401 });
    expect(await vapiVerifier.verify(whReq(raw))).toMatchObject({ ok: false, status: 401 });
  });
});
