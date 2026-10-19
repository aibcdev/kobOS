import { createHash, createHmac } from "node:crypto";

const PII_KEY = /(^|_)(e-?mail|phone|phone_?number|mobile)(_|$)|^(email|emailAddress|phoneNumber|mobileNumber|From|Caller|caller_number|from_number)$/i;

const normalise = (value: string) => value.trim().toLowerCase();
const hashKey = () => process.env.PII_HASH_KEY?.trim() || null;

let warned = false;

/** The pre-HMAC form. Still read so identities stored before PII_HASH_KEY existed keep matching until upgraded. */
export function legacyPiiHash(value: string): string {
  return `sha256:${createHash("sha256").update(normalise(value)).digest("hex")}`;
}

/** True for any value that is already one of our hashes rather than a raw email or phone number. */
export function isPiiHash(value: string): boolean {
  return value.startsWith("hmac:") || value.startsWith("sha256:");
}

/**
 * Keyed, so a leaked table can't be reversed by hashing every phone number. Without PII_HASH_KEY (local dev, tests)
 * it falls back to the legacy unkeyed hash.
 */
export function piiHash(value: string): string {
  const key = hashKey();
  if (!key) {
    if (process.env.NODE_ENV === "production" && !warned) {
      warned = true;
      console.warn("[pii] PII_HASH_KEY is not set; email/phone hashes are unkeyed");
    }
    return legacyPiiHash(value);
  }
  return `hmac:${createHmac("sha256", key).update(normalise(value)).digest("hex")}`;
}

/** The legacy hash of a raw value, when a keyed one is now being written instead (for lazy upgrades). */
export function legacyHashIfUpgraded(value: string): string | null {
  return hashKey() && !isPiiHash(value) ? legacyPiiHash(value) : null;
}

/** ConnectorEvent payloads keep ids and amounts; email/phone values become hashes (still joinable to Guest.*Hash). */
export function minimisePayload(value: unknown, depth = 0): unknown {
  if (depth > 12) return null;
  if (Array.isArray(value)) return value.map((v) => minimisePayload(v, depth + 1));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      typeof v === "string" && v && PII_KEY.test(k) && !isPiiHash(v) ? piiHash(v) : minimisePayload(v, depth + 1),
    ]),
  );
}
