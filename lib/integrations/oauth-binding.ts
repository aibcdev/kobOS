import { createHash, createHmac, randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";

/**
 * Binds an OAuth round trip to the browser and account that started it. The signed state carries a nonce; the
 * starting response sets an httpOnly cookie holding sha256(state), and the callback refuses any state whose cookie
 * isn't present, so a link started by one person can't be completed in someone else's browser. The PKCE verifier is
 * derived from the nonce with a server key, so nothing extra is stored.
 */

export const OAUTH_COOKIE = "kob-oauth";
const COOKIE_PATH = "/api/integrations";

export function newNonce(): string {
  return randomUUID();
}

export function stateDigest(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export function setBindingCookie(res: NextResponse, state: string, secure: boolean): void {
  res.cookies.set(OAUTH_COOKIE, stateDigest(state), { httpOnly: true, secure, sameSite: "lax", maxAge: 1800, path: COOKIE_PATH });
}

export function clearBindingCookie(res: NextResponse): void {
  res.cookies.set(OAUTH_COOKIE, "", { maxAge: 0, path: COOKIE_PATH });
}

export function bindingMatches(state: string, cookieValue: string | undefined): boolean {
  return Boolean(cookieValue) && cookieValue === stateDigest(state);
}

function pkceKey(): string {
  const key = process.env.INTEGRATION_ENC_KEY?.trim() || process.env.CRON_SECRET?.trim();
  if (!key) throw new Error("PKCE requires INTEGRATION_ENC_KEY or CRON_SECRET");
  return key;
}

/** RFC 7636 S256. 43 base64url chars from a 32-byte HMAC. */
export function pkceVerifier(nonce: string): string {
  return createHmac("sha256", pkceKey()).update(`pkce:${nonce}`).digest("base64url");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
