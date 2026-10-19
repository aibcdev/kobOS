import { badBody, badSignature, env, notConfigured, parseJson, safeEqual } from "@/lib/hub/webhooks/crypto";
import type { ParsedEvent, Verifier } from "@/lib/hub/webhooks/types";

/**
 * Clover sends a one-off `{verificationCode}` when the webhook URL is saved (stored so the code can be pasted into the
 * dashboard), then every delivery carries X-Clover-Auth = that auth code. Payload: {appId, merchants: {mId: [updates]}}.
 */
export const cloverVerifier: Verifier = {
  provider: "clover",
  integrationProvider: "CLOVER",
  verify({ raw, headers, now }) {
    const body = parseJson(raw);
    if (!body) return badBody;
    if (typeof body.verificationCode === "string" && !headers.get("x-clover-auth")) {
      return { ok: true, events: [{ externalId: `verification:${body.verificationCode}`, type: "verification", payload: { at: now.toISOString() } }] };
    }
    const code = env("CLOVER_WEBHOOK_AUTH_CODE");
    if (!code) return notConfigured("CLOVER_WEBHOOK_AUTH_CODE");
    if (!safeEqual(headers.get("x-clover-auth"), code)) return badSignature;
    const events: ParsedEvent[] = [];
    for (const [merchantId, updates] of Object.entries((body.merchants ?? {}) as Record<string, unknown>)) {
      for (const u of Array.isArray(updates) ? (updates as { objectId?: string; type?: string; ts?: number }[]) : []) {
        if (!u.objectId) continue;
        events.push({ externalId: `${merchantId}:${u.objectId}:${u.type ?? ""}:${u.ts ?? ""}`, type: `${u.objectId.split(":")[0]}.${u.type ?? "UPDATE"}`, accountId: merchantId, payload: u });
      }
    }
    return { ok: true, events };
  },
};
