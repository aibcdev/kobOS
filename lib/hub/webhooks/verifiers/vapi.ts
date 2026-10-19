import { createHash } from "node:crypto";
import { badBody, badSignature, env, notConfigured, parseJson, safeEqual } from "@/lib/hub/webhooks/crypto";
import type { Verifier } from "@/lib/hub/webhooks/types";

/** Vapi server URL secret: every request carries x-vapi-secret = the configured secret. */
export const vapiVerifier: Verifier = {
  provider: "vapi",
  verify({ raw, headers }) {
    const secret = env("VAPI_SERVER_SECRET");
    if (!secret) return notConfigured("VAPI_SERVER_SECRET");
    if (!safeEqual(headers.get("x-vapi-secret"), secret)) return badSignature;
    const body = parseJson(raw);
    if (!body) return badBody;
    const message = (body.message ?? {}) as { type?: string; call?: { id?: string }; timestamp?: number };
    const type = String(message.type ?? "unknown");
    const id = message.call?.id ? `${message.call.id}:${type}:${message.timestamp ?? ""}` : createHash("sha256").update(raw).digest("hex");
    return { ok: true, events: [{ externalId: id, type, payload: body }] };
  },
};
