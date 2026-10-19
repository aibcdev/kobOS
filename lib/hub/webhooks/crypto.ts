import { createHmac, timingSafeEqual } from "node:crypto";

export function hmac(alg: "sha1" | "sha256", key: string | Buffer, data: string, enc: "base64" | "hex"): string {
  return createHmac(alg, key).update(data, "utf8").digest(enc);
}

/** Constant-time string compare; false on length mismatch or missing input. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

export function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const notConfigured = (what: string) => ({ ok: false as const, status: 503 as const, reason: `${what} not configured` });
export const badSignature = { ok: false as const, status: 401 as const, reason: "Invalid signature" };
export const badBody = { ok: false as const, status: 400 as const, reason: "Unreadable body" };
