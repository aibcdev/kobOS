import { badBody, badSignature, env, hmac, notConfigured, parseJson, safeEqual } from "@/lib/hub/webhooks/crypto";
import type { ParsedEvent, Verifier } from "@/lib/hub/webhooks/types";

type Entity = { name?: string; id?: string; operation?: string; lastUpdated?: string };

/** intuit-signature = base64 HMAC-SHA256(verifierToken, rawBody). Body: {eventNotifications:[{realmId, dataChangeEvent:{entities}}]}. */
export const qboVerifier: Verifier = {
  provider: "qbo",
  integrationProvider: "QUICKBOOKS",
  verify({ raw, headers }) {
    const token = env("QBO_WEBHOOK_VERIFIER");
    if (!token) return notConfigured("QBO_WEBHOOK_VERIFIER");
    if (!safeEqual(hmac("sha256", token, raw, "base64"), headers.get("intuit-signature"))) return badSignature;
    const body = parseJson(raw);
    if (!body) return badBody;
    const events: ParsedEvent[] = [];
    for (const n of (body.eventNotifications ?? []) as { realmId?: string; dataChangeEvent?: { entities?: Entity[] } }[]) {
      for (const e of n.dataChangeEvent?.entities ?? []) {
        if (!e.id) continue;
        events.push({
          externalId: `${n.realmId}:${e.name}:${e.id}:${e.operation}:${e.lastUpdated}`,
          type: `${String(e.name).toLowerCase()}.${String(e.operation).toLowerCase()}`,
          accountId: n.realmId ?? null,
          payload: e,
        });
      }
    }
    return { ok: true, events };
  },
};
