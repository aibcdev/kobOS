import { createHash } from "node:crypto";
import { badBody, badSignature, env, hmac, notConfigured, parseJson, safeEqual } from "@/lib/hub/webhooks/crypto";
import type { Verifier } from "@/lib/hub/webhooks/types";

/** Per-venue listener path: /api/webhooks/purple/<restaurantId>.<sig>, sig = HMAC(PURPLE_WEBHOOK_SALT, restaurantId). */
export function purpleListenerKey(restaurantId: string, salt = env("PURPLE_WEBHOOK_SALT")): string {
  if (!salt) throw new Error("PURPLE_WEBHOOK_SALT not configured");
  return `${restaurantId}.${hmac("sha256", salt, `purple:${restaurantId}`, "hex").slice(0, 32)}`;
}

/** Purple requires a 200 with header `wifiWebhookListener: 1`. Payloads have no event id, so the body hash dedupes. */
export const purpleVerifier: Verifier = {
  provider: "purple",
  integrationProvider: "PURPLE_WIFI",
  verify({ raw, key }) {
    const salt = env("PURPLE_WEBHOOK_SALT");
    if (!salt) return notConfigured("PURPLE_WEBHOOK_SALT");
    const restaurantId = key?.split(".")[0];
    if (!restaurantId || !safeEqual(key, purpleListenerKey(restaurantId, salt))) return badSignature;
    const body = parseJson(raw);
    if (!body) return badBody;
    const id = typeof body.id === "string" || typeof body.id === "number" ? String(body.id) : createHash("sha256").update(raw).digest("hex");
    return {
      ok: true,
      events: [{ externalId: `${restaurantId}:${id}`, type: String(body.event ?? body.type ?? "visit"), restaurantId, payload: body }],
      response: { headers: { wifiWebhookListener: "1" } },
    };
  },
};
