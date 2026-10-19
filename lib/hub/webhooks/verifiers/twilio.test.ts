import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture, whReq } from "@/tests/helpers/webhooks";
import { twilioSignature, twilioVerifier } from "./twilio";

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
});
