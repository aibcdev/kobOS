import { afterEach, describe, expect, it, vi } from "vitest";
import { isPiiHash, legacyHashIfUpgraded, legacyPiiHash, minimisePayload, piiHash } from "./minimise";

describe("PII hashing", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses a keyed HMAC when PII_HASH_KEY is set, so the same number hashes differently per key", () => {
    vi.stubEnv("PII_HASH_KEY", "key-a");
    const a = piiHash(" Sam@Example.com ");
    expect(a).toMatch(/^hmac:[0-9a-f]{64}$/);
    expect(piiHash("sam@example.com")).toBe(a);
    expect(a).not.toBe(legacyPiiHash("sam@example.com"));
    vi.stubEnv("PII_HASH_KEY", "key-b");
    expect(piiHash("sam@example.com")).not.toBe(a);
  });

  it("falls back to the unkeyed hash without a key, and only reports a legacy hash when upgrading", () => {
    vi.stubEnv("PII_HASH_KEY", "");
    expect(piiHash("+447700900123")).toBe(legacyPiiHash("+447700900123"));
    expect(legacyHashIfUpgraded("+447700900123")).toBeNull();
    vi.stubEnv("PII_HASH_KEY", "k");
    expect(legacyHashIfUpgraded("+447700900123")).toBe(legacyPiiHash("+447700900123"));
    expect(legacyHashIfUpgraded(piiHash("+447700900123"))).toBeNull();
  });

  it("hashes PII fields in payloads once, leaving existing hashes and other fields alone", () => {
    vi.stubEnv("PII_HASH_KEY", "k");
    const old = legacyPiiHash("a@b.co");
    const out = minimisePayload({ id: "c1", email: "a@b.co", nested: { phone_number: "+15550001111", amount: 300 }, previous: { email: old } }) as Record<string, Record<string, unknown>>;
    expect(out.id).toBe("c1");
    expect(out.email).toBe(piiHash("a@b.co"));
    expect(out.nested).toEqual({ phone_number: piiHash("+15550001111"), amount: 300 });
    expect(out.previous.email).toBe(old);
    expect(isPiiHash(String(out.email))).toBe(true);
  });
});
