import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const b64 = process.env.INTEGRATION_ENC_KEY;
  if (!b64) {
    throw new Error("INTEGRATION_ENC_KEY is required (32-byte key, base64-encoded).");
  }
  const buf = Buffer.from(b64, "base64");
  if (buf.length !== KEY_LEN) {
    throw new Error("INTEGRATION_ENC_KEY must decode to exactly 32 bytes.");
  }
  return buf;
}

/** AES-256-GCM; returns base64(iv || tag || ciphertext). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, "base64url");
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
