import { badBody, badSignature, env, hmac, notConfigured, parseJson, safeEqual } from "@/lib/hub/webhooks/crypto";
import type { Verifier } from "@/lib/hub/webhooks/types";

/** x-square-hmacsha256-signature = base64 HMAC-SHA256(signatureKey, notificationUrl + rawBody). */
export const squareVerifier: Verifier = {
  provider: "square",
  integrationProvider: "SQUARE",
  verify({ raw, headers, urls }) {
    const key = env("SQUARE_WEBHOOK_SIGNATURE_KEY");
    if (!key) return notConfigured("SQUARE_WEBHOOK_SIGNATURE_KEY");
    const sig = headers.get("x-square-hmacsha256-signature");
    if (!urls.some((u) => safeEqual(hmac("sha256", key, u + raw, "base64"), sig))) return badSignature;
    const body = parseJson(raw);
    if (!body || typeof body.event_id !== "string") return badBody;
    return {
      ok: true,
      events: [{ externalId: body.event_id, type: String(body.type ?? "unknown"), accountId: (body.merchant_id as string) ?? null, payload: body }],
    };
  },
};
