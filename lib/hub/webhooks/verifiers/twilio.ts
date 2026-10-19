import { badSignature, env, hmac, notConfigured, safeEqual } from "@/lib/hub/webhooks/crypto";
import type { Verifier } from "@/lib/hub/webhooks/types";

/** X-Twilio-Signature = base64 HMAC-SHA1(authToken, url + concat(sorted POST key+value)). Same algorithm as twilio.validateRequest. */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  return hmac("sha1", authToken, data, "base64");
}

export const twilioVerifier: Verifier = {
  provider: "twilio",
  verify({ raw, headers, urls }) {
    const token = env("TWILIO_AUTH_TOKEN");
    if (!token) return notConfigured("TWILIO_AUTH_TOKEN");
    const params = Object.fromEntries(new URLSearchParams(raw));
    const sig = headers.get("x-twilio-signature");
    if (!urls.some((u) => safeEqual(twilioSignature(token, u, params), sig))) return badSignature;
    const sid = params.CallSid ?? params.MessageSid ?? params.SmsSid;
    if (!sid) return { ok: true, events: [] };
    const status = params.CallStatus ?? params.MessageStatus ?? params.SmsStatus ?? "received";
    return {
      ok: true,
      events: [{ externalId: `${sid}:${status}`, type: params.CallSid ? `call.${status}` : `message.${status}`, accountId: params.AccountSid ?? null, payload: params }],
    };
  },
};
