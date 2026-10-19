/** Generic OAuth 2 token calls (code exchange, refresh, client credentials). No storage here; see lib/hub/tokens.ts. */

export type TokenSet = {
  accessToken: string;
  /** Present when the provider issued (or rotated) one. */
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
  raw: Record<string, unknown>;
};

export type TokenEndpoint = {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  body?: "form" | "json";
  clientAuth?: "body" | "basic";
  fetch?: typeof fetch;
  now?: () => Date;
};

export type TokenErrorCode = "invalid_grant" | "reauth_required" | "refresh_failed" | "refresh_busy" | "not_configured" | "no_token";

export class TokenError extends Error {
  constructor(
    readonly code: TokenErrorCode,
    message: string = code,
    readonly status?: number,
  ) {
    super(message);
    this.name = "TokenError";
  }
}

export function basicAuth(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

export function tokenSetFrom(json: Record<string, unknown>, now = new Date()): TokenSet {
  const accessToken = typeof json.access_token === "string" ? json.access_token : "";
  if (!accessToken) throw new TokenError("refresh_failed", "Token response had no access_token");
  const expiresIn = Number(json.expires_in);
  // Square returns an absolute expires_at, Clover access_token_expiration (Unix seconds), instead of expires_in.
  const cloverExp = Number(json.access_token_expiration);
  const expiresAt =
    typeof json.expires_at === "string"
      ? new Date(json.expires_at)
      : Number.isFinite(cloverExp) && cloverExp > 0
        ? new Date(cloverExp * 1000)
        : Number.isFinite(expiresIn) && expiresIn > 0
          ? new Date(now.getTime() + expiresIn * 1000)
          : undefined;
  const scope = typeof json.scope === "string" ? json.scope : Array.isArray(json.scopes) ? (json.scopes as string[]).join(" ") : "";
  return {
    accessToken,
    refreshToken: typeof json.refresh_token === "string" && json.refresh_token ? json.refresh_token : undefined,
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : undefined,
    scopes: scope ? scope.split(/[\s,]+/).filter(Boolean) : undefined,
    raw: json,
  };
}

async function tokenCall(ep: TokenEndpoint, params: Record<string, string>): Promise<TokenSet> {
  const viaBasic = ep.clientAuth === "basic";
  const fields = viaBasic ? params : { ...params, client_id: ep.clientId, client_secret: ep.clientSecret };
  const json = ep.body === "json";
  const headers: Record<string, string> = {
    "Content-Type": json ? "application/json" : "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
  if (viaBasic) headers.Authorization = basicAuth(ep.clientId, ep.clientSecret);
  const res = await (ep.fetch ?? fetch)(ep.tokenUrl, {
    method: "POST",
    headers,
    body: json ? JSON.stringify(fields) : new URLSearchParams(fields),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = String(body.error ?? (body.errors as { code?: string }[] | undefined)?.[0]?.code ?? "");
    // invalid_grant (RFC 6749) or a 401 on the token endpoint: the grant is dead, the owner must reconnect.
    if (err.toLowerCase() === "invalid_grant" || res.status === 401) throw new TokenError("invalid_grant", "Refresh token rejected", res.status);
    throw new TokenError("refresh_failed", `Token endpoint returned ${res.status}`, res.status);
  }
  return tokenSetFrom(body, ep.now?.() ?? new Date());
}

export function exchangeCode(ep: TokenEndpoint, code: string, redirectUri: string): Promise<TokenSet> {
  return tokenCall(ep, { grant_type: "authorization_code", code, redirect_uri: redirectUri });
}

export function refreshGrant(ep: TokenEndpoint, refreshToken: string): Promise<TokenSet> {
  return tokenCall(ep, { grant_type: "refresh_token", refresh_token: refreshToken });
}

export function clientCredentialsGrant(ep: TokenEndpoint, scope?: string): Promise<TokenSet> {
  return tokenCall(ep, { grant_type: "client_credentials", ...(scope ? { scope } : {}) });
}
