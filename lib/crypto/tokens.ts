import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
const VERSION = "v1:";

function parseKey(name: "INTEGRATION_ENC_KEY" | "INTEGRATION_ENC_KEY_PREVIOUS", b64: string): Buffer {
  const buf = Buffer.from(b64, "base64");
  if (buf.length !== KEY_LEN) {
    throw new Error(`${name} must decode to exactly 32 bytes.`);
  }
  return buf;
}

function currentKey(): Buffer {
  const b64 = process.env.INTEGRATION_ENC_KEY;
  if (!b64) {
    throw new Error("INTEGRATION_ENC_KEY is required (32-byte key, base64-encoded).");
  }
  return parseKey("INTEGRATION_ENC_KEY", b64);
}

/** Set during rotation so ciphertexts written under the old key still decrypt. */
function previousKey(): Buffer | null {
  const b64 = process.env.INTEGRATION_ENC_KEY_PREVIOUS?.trim();
  return b64 ? parseKey("INTEGRATION_ENC_KEY_PREVIOUS", b64) : null;
}

function decryptWith(key: Buffer, raw: Buffer): string {
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** AES-256-GCM with the current key; returns `v1:` + base64url(iv || tag || ciphertext). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", currentKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return VERSION + Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

/** Decrypts `v1:` and legacy unprefixed payloads, trying the current key then `INTEGRATION_ENC_KEY_PREVIOUS`. */
export function decryptSecret(payload: string): string {
  return decryptSecretDetailed(payload).plaintext;
}

export function decryptSecretDetailed(payload: string): { plaintext: string; needsReencrypt: boolean } {
  const versioned = payload.startsWith(VERSION);
  const raw = Buffer.from(versioned ? payload.slice(VERSION.length) : payload, "base64url");
  try {
    return { plaintext: decryptWith(currentKey(), raw), needsReencrypt: !versioned };
  } catch (err) {
    const previous = previousKey();
    if (!previous) throw err;
    return { plaintext: decryptWith(previous, raw), needsReencrypt: true };
  }
}
