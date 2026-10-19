import { badBody, badSignature, env, hmac, notConfigured, parseJson, safeEqual } from "@/lib/hub/webhooks/crypto";
import type { Verifier } from "@/lib/hub/webhooks/types";

const TOLERANCE_MS = 5 * 60_000;

/** x-retell-signature = "v=<ms>,d=<hex HMAC-SHA256(key, body + ms)>" (Retell.verify in retell-sdk). */
export function retellSignature(key: string, raw: string, ts: string): string {
  return `v=${ts},d=${hmac("sha256", key, raw + ts, "hex")}`;
}

export const retellVerifier: Verifier = {
  provider: "retell",
  verify({ raw, headers, now }) {
    const key = env("RETELL_WEBHOOK_SECRET") ?? env("RETELL_API_KEY");
    if (!key) return notConfigured("RETELL_WEBHOOK_SECRET");
    const m = /^v=(\d+),d=([0-9a-f]+)$/.exec(headers.get("x-retell-signature") ?? "");
    if (!m || Math.abs(now.getTime() - Number(m[1])) > TOLERANCE_MS) return badSignature;
    if (!safeEqual(hmac("sha256", key, raw + m[1], "hex"), m[2])) return badSignature;
    const body = parseJson(raw);
    if (!body) return badBody;
    const call = (body.call ?? {}) as { call_id?: string };
    const type = String(body.event ?? "unknown");
    return { ok: true, events: [{ externalId: `${call.call_id ?? m[1]}:${type}`, type, payload: body }] };
  },
};
