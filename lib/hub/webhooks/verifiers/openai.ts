import { badBody, badSignature, env, hmac, notConfigured, parseJson, safeEqual } from "@/lib/hub/webhooks/crypto";
import type { Verifier } from "@/lib/hub/webhooks/types";

const TOLERANCE_S = 300;

/** Standard Webhooks (what openai.webhooks.unwrap checks): v1 = base64 HMAC-SHA256(secret, `${id}.${ts}.${body}`). */
export function standardWebhookSignature(secret: string, id: string, ts: string, raw: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return hmac("sha256", key, `${id}.${ts}.${raw}`, "base64");
}

export const openaiVerifier: Verifier = {
  provider: "openai",
  verify({ raw, headers, now }) {
    const secret = env("OPENAI_WEBHOOK_SECRET");
    if (!secret) return notConfigured("OPENAI_WEBHOOK_SECRET");
    const id = headers.get("webhook-id");
    const ts = headers.get("webhook-timestamp");
    if (!id || !ts || Math.abs(now.getTime() / 1000 - Number(ts)) > TOLERANCE_S) return badSignature;
    const expected = standardWebhookSignature(secret, id, ts, raw);
    const sigs = (headers.get("webhook-signature") ?? "").split(" ").map((s) => s.split(",")[1]);
    if (!sigs.some((s) => safeEqual(s, expected))) return badSignature;
    const body = parseJson(raw);
    if (!body) return badBody;
    return { ok: true, events: [{ externalId: id, type: String(body.type ?? "unknown"), payload: body }] };
  },
};
