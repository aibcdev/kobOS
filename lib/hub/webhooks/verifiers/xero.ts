import { badBody, env, hmac, notConfigured, parseJson, safeEqual } from "@/lib/hub/webhooks/crypto";
import type { Verifier } from "@/lib/hub/webhooks/types";

type XeroEvent = { resourceId?: string; eventCategory?: string; eventType?: string; tenantId?: string; eventDateUtc?: string };

/**
 * x-xero-signature = base64 HMAC-SHA256(webhookKey, rawBody). "Intent to receive" checks send an empty event list
 * and require 200 with an empty body on a correct signature and 401 on an incorrect one.
 */
export const xeroVerifier: Verifier = {
  provider: "xero",
  integrationProvider: "XERO",
  verify({ raw, headers }) {
    const key = env("XERO_WEBHOOK_KEY");
    if (!key) return notConfigured("XERO_WEBHOOK_KEY");
    if (!safeEqual(hmac("sha256", key, raw, "base64"), headers.get("x-xero-signature"))) return { ok: false, status: 401, reason: "Invalid signature" };
    const body = parseJson(raw);
    if (!body) return badBody;
    const events = ((body.events ?? []) as XeroEvent[])
      .filter((e) => e.resourceId)
      .map((e) => ({
        externalId: `${e.tenantId}:${e.resourceId}:${e.eventType}:${e.eventDateUtc}`,
        type: `${String(e.eventCategory ?? "").toLowerCase()}.${String(e.eventType ?? "").toLowerCase()}`,
        accountId: e.tenantId ?? null,
        payload: e,
      }));
    return { ok: true, events, response: { status: 200, body: "" } };
  },
};
