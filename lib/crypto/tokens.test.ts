import { createCipheriv, randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, decryptSecretDetailed, encryptSecret } from "@/lib/crypto/tokens";

const keyA = randomBytes(32).toString("base64");
const keyB = randomBytes(32).toString("base64");

/** The pre-v1 format: base64url(iv || tag || ciphertext), no prefix. */
function legacyEncrypt(plaintext: string, keyB64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyB64, "base64"), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64url");
}

describe("token encryption", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips with a v1: prefix", () => {
    vi.stubEnv("INTEGRATION_ENC_KEY", keyA);
    const sealed = encryptSecret("ya29.secret-token");
    expect(sealed.startsWith("v1:")).toBe(true);
    expect(sealed).not.toContain("secret-token");
    expect(decryptSecretDetailed(sealed)).toEqual({ plaintext: "ya29.secret-token", needsReencrypt: false });
  });

  it("still decrypts legacy unprefixed ciphertexts and flags them for re-encryption", () => {
    vi.stubEnv("INTEGRATION_ENC_KEY", keyA);
    const legacy = legacyEncrypt("legacy-refresh", keyA);
    expect(decryptSecretDetailed(legacy)).toEqual({ plaintext: "legacy-refresh", needsReencrypt: true });
  });

  it("decrypts values from the previous key during rotation", () => {
    vi.stubEnv("INTEGRATION_ENC_KEY", keyA);
    const underOld = encryptSecret("old-key-token");
    const legacyUnderOld = legacyEncrypt("old-legacy", keyA);

    vi.stubEnv("INTEGRATION_ENC_KEY", keyB);
    vi.stubEnv("INTEGRATION_ENC_KEY_PREVIOUS", keyA);
    expect(decryptSecretDetailed(underOld)).toEqual({ plaintext: "old-key-token", needsReencrypt: true });
    expect(decryptSecret(legacyUnderOld)).toBe("old-legacy");
    expect(decryptSecretDetailed(encryptSecret("new")).needsReencrypt).toBe(false);
  });

  it("fails without the previous key once rotated", () => {
    vi.stubEnv("INTEGRATION_ENC_KEY", keyA);
    const underOld = encryptSecret("old");
    vi.stubEnv("INTEGRATION_ENC_KEY", keyB);
    expect(() => decryptSecret(underOld)).toThrow();
  });

  it("rejects malformed keys", () => {
    vi.stubEnv("INTEGRATION_ENC_KEY", Buffer.from("short").toString("base64"));
    expect(() => encryptSecret("x")).toThrow(/32 bytes/);
  });
});
