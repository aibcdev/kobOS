import { decryptSecret, encryptSecret } from "@/lib/crypto/tokens";
import type { KeyField } from "@/lib/hub/manifest";

/** API_KEY / BASIC_KEY_SECRET connectors keep every key field in one encrypted JSON blob (Integration.encryptedApiKey). */
export function encryptKeyFields(fields: Record<string, string>): string {
  return encryptSecret(JSON.stringify(fields));
}

export function decryptKeyFields(payload: string): Record<string, string> {
  const parsed: unknown = JSON.parse(decryptSecret(payload));
  if (!parsed || typeof parsed !== "object") throw new Error("Stored API key is not an object");
  return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)]));
}

/** Trims input and checks every manifest field is present; returns the cleaned fields or the missing labels. */
export function readKeyFields(
  spec: readonly KeyField[],
  input: Record<string, unknown>,
): { ok: true; fields: Record<string, string> } | { ok: false; missing: string[] } {
  const fields: Record<string, string> = {};
  const missing: string[] = [];
  for (const f of spec) {
    const v = typeof input[f.name] === "string" ? (input[f.name] as string).trim() : "";
    if (!v) missing.push(f.label);
    else fields[f.name] = v;
  }
  return missing.length ? { ok: false, missing } : { ok: true, fields };
}

/** For logs and the UI: never more than the last 4 characters of a secret. */
export function maskSecret(value: string): string {
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}
