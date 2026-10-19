import { createHmac } from "node:crypto";
import { tokenSetFrom, TokenError, type TokenSet } from "@/lib/hub/auth/oauth2";

/**
 * RFC 7523 assertion grant. Zettle: the merchant's API key is the assertion, exchanged for a 2 h access token
 * (POST https://oauth.zettle.com/token, client_id = KOB's self-hosted app id).
 */
export async function jwtBearerGrant(opts: {
  tokenUrl: string;
  clientId: string;
  assertion: string;
  fetch?: typeof fetch;
  now?: () => Date;
}): Promise<TokenSet> {
  const res = await (opts.fetch ?? fetch)(opts.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      client_id: opts.clientId,
      assertion: opts.assertion,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 400 || res.status === 401) throw new TokenError("invalid_grant", "API key rejected", res.status);
    throw new TokenError("refresh_failed", `Token endpoint returned ${res.status}`, res.status);
  }
  return tokenSetFrom(body, opts.now?.() ?? new Date());
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

/** HS256 JWT for providers that want a self-signed token per request (DoorDash Drive: header dd-ver DD-JWT-V1). */
export function signHs256(payload: Record<string, unknown>, secret: Buffer, extraHeader: Record<string, unknown> = {}): string {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT", ...extraHeader }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
