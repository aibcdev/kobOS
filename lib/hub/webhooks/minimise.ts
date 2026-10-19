import { createHash } from "node:crypto";

const PII_KEY = /(^|_)(e-?mail|phone|phone_?number|mobile)(_|$)|^(email|emailAddress|phoneNumber|mobileNumber|From|Caller|caller_number|from_number)$/i;

export function piiHash(value: string): string {
  return `sha256:${createHash("sha256").update(value.trim().toLowerCase()).digest("hex")}`;
}

/** ConnectorEvent payloads keep ids and amounts; email/phone values become hashes (still joinable to Guest.*Hash). */
export function minimisePayload(value: unknown, depth = 0): unknown {
  if (depth > 12) return null;
  if (Array.isArray(value)) return value.map((v) => minimisePayload(v, depth + 1));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      typeof v === "string" && v && PII_KEY.test(k) ? piiHash(v) : minimisePayload(v, depth + 1),
    ]),
  );
}
