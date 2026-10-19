import type { Integration } from "@prisma/client";
import { decryptSecret, encryptSecret } from "@/lib/crypto/tokens";
import { prisma } from "@/lib/db/prisma";
import { decryptKeyFields } from "@/lib/hub/auth/api-key";
import { jwtBearerGrant } from "@/lib/hub/auth/jwt-bearer";
import { clientCredentialsGrant, refreshGrant, TokenError, type TokenEndpoint, type TokenSet } from "@/lib/hub/auth/oauth2";
import { getManifest } from "@/lib/hub/manifest";
import { getOAuthConfig } from "@/lib/integrations/oauth-config";

/** Spec 2 §3.8. The one place integration access tokens are read, refreshed and persisted. */

export const DEFAULT_REFRESH_AHEAD_S = 300;
const DEAD = new Set(["REAUTH", "DISCONNECTED"]);

export type TokenDeps = {
  fetch?: typeof fetch;
  now?: () => Date;
  /** Losers of the refresh lock poll the row this often, for at most `maxWaitMs`. */
  pollMs?: number;
  maxWaitMs?: number;
};

export function decryptTokens(row: Pick<Integration, "encryptedAccessToken" | "encryptedRefreshToken">): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  try {
    return {
      accessToken: row.encryptedAccessToken ? decryptSecret(row.encryptedAccessToken) : null,
      refreshToken: row.encryptedRefreshToken ? decryptSecret(row.encryptedRefreshToken) : null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

export function refreshAheadSeconds(provider: string): number {
  return getManifest(provider)?.auth.refreshAheadSeconds ?? DEFAULT_REFRESH_AHEAD_S;
}

/** True when the stored access token is usable for at least the provider's refresh-ahead window. */
export function isFresh(row: Pick<Integration, "provider" | "accessTokenExpiresAt" | "encryptedAccessToken">, now: Date): boolean {
  if (!row.encryptedAccessToken) return false;
  if (!row.accessTokenExpiresAt) return true;
  return row.accessTokenExpiresAt.getTime() - refreshAheadSeconds(row.provider) * 1000 > now.getTime();
}

function endpointFor(row: Integration, deps: TokenDeps): TokenEndpoint {
  const manifest = getManifest(row.provider);
  const legacy = getOAuthConfig(row.provider);
  const tokenUrl = manifest?.auth.tokenUrl ?? legacy?.tokenUrl;
  const idEnv = manifest?.auth.clientIdEnv ?? legacy?.clientIdEnv;
  const secretEnv = manifest?.auth.clientSecretEnv ?? legacy?.clientSecretEnv;
  const clientId = idEnv ? process.env[idEnv] : undefined;
  const clientSecret = secretEnv ? process.env[secretEnv] : undefined;
  if (!tokenUrl || !clientId || (!clientSecret && row.authKind !== "JWT_BEARER")) {
    throw new TokenError("not_configured", `${row.provider} OAuth is not configured`);
  }
  return {
    tokenUrl,
    clientId,
    clientSecret: clientSecret ?? "",
    body: manifest?.auth.tokenBody,
    clientAuth: manifest?.auth.clientAuth,
    fetch: deps.fetch,
    now: deps.now,
  };
}

async function requestNewToken(row: Integration, deps: TokenDeps): Promise<TokenSet> {
  const ep = endpointFor(row, deps);
  if (row.authKind === "JWT_BEARER") {
    if (!row.encryptedApiKey) throw new TokenError("invalid_grant", "No API key stored");
    const { apiKey } = decryptKeyFields(row.encryptedApiKey);
    return jwtBearerGrant({ tokenUrl: ep.tokenUrl, clientId: ep.clientId, assertion: apiKey, fetch: deps.fetch, now: deps.now });
  }
  if (row.authKind === "OAUTH2_CLIENT_CREDENTIALS") {
    return clientCredentialsGrant(ep, getManifest(row.provider)?.auth.scopes?.join(" "));
  }
  const { refreshToken } = decryptTokens(row);
  if (!refreshToken) throw new TokenError("invalid_grant", "No refresh token stored");
  return refreshGrant(ep, refreshToken);
}

/** Persisted fields after a successful refresh; rotating refresh tokens (Square, Xero, QBO, Clover) are kept. */
export function tokenUpdate(set: TokenSet) {
  return {
    encryptedAccessToken: encryptSecret(set.accessToken),
    ...(set.refreshToken ? { encryptedRefreshToken: encryptSecret(set.refreshToken) } : {}),
    accessTokenExpiresAt: set.expiresAt ?? null,
    ...(set.scopes ? { scopesGranted: set.scopes } : {}),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Returns a usable access token, refreshing when it is inside the refresh-ahead window. Throws TokenError:
 * `reauth_required` when the owner must reconnect (status REAUTH is set), `refresh_failed`/`refresh_busy` to retry.
 */
export async function getAccessToken(integrationId: string, deps: TokenDeps = {}): Promise<string> {
  const now = deps.now?.() ?? new Date();
  const row = await prisma.integration.findUnique({ where: { id: integrationId } });
  if (!row) throw new TokenError("no_token", "Integration not found");
  if (DEAD.has(row.status)) throw new TokenError("reauth_required", `${row.provider} needs reconnecting`);
  const { accessToken } = decryptTokens(row);
  if (accessToken && isFresh(row, now)) return accessToken;
  return refreshAccessToken(integrationId, deps);
}

/**
 * Single-flight refresh. The winner of `pg_try_advisory_xact_lock(hashtext(id))` calls the provider and writes the new
 * tokens before releasing the lock; everyone else waits for the row to turn fresh. Pass `rejectedAccessToken` after a
 * provider 401 to force a refresh unless someone already replaced that token.
 */
export async function refreshAccessToken(integrationId: string, deps: TokenDeps & { rejectedAccessToken?: string } = {}): Promise<string> {
  const nowFn = deps.now ?? (() => new Date());
  const usable = (row: Integration): string | null => {
    const { accessToken } = decryptTokens(row);
    if (!accessToken) return null;
    if (deps.rejectedAccessToken) return accessToken !== deps.rejectedAccessToken ? accessToken : null;
    return isFresh(row, nowFn()) ? accessToken : null;
  };

  const outcome = await prisma.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${integrationId})) AS locked`;
      if (!locked) return { kind: "busy" as const };
      const row = await tx.integration.findUniqueOrThrow({ where: { id: integrationId } });
      if (DEAD.has(row.status)) return { kind: "error" as const, error: new TokenError("reauth_required", `${row.provider} needs reconnecting`) };
      const current = usable(row);
      if (current) return { kind: "ok" as const, token: current };
      try {
        const set = await requestNewToken(row, deps);
        await tx.integration.update({ where: { id: row.id }, data: { ...tokenUpdate(set), lastErrorCode: null } });
        return { kind: "ok" as const, token: set.accessToken };
      } catch (e) {
        if (!(e instanceof TokenError)) throw e;
        const dead = e.code === "invalid_grant";
        await tx.integration.update({
          where: { id: row.id },
          data: { lastErrorCode: e.code, lastErrorAt: nowFn(), ...(dead ? { status: "REAUTH" } : {}) },
        });
        return { kind: "error" as const, error: dead ? new TokenError("reauth_required", `${row.provider} needs reconnecting`, e.status) : e };
      }
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
  if (outcome.kind === "ok") return outcome.token;
  if (outcome.kind === "error") throw outcome.error;

  const deadline = Date.now() + (deps.maxWaitMs ?? 15_000);
  while (Date.now() < deadline) {
    await sleep(deps.pollMs ?? 250);
    const row = await prisma.integration.findUnique({ where: { id: integrationId } });
    if (!row) throw new TokenError("no_token", "Integration not found");
    if (DEAD.has(row.status)) throw new TokenError("reauth_required", `${row.provider} needs reconnecting`);
    const token = usable(row);
    if (token) return token;
  }
  throw new TokenError("refresh_busy", "Another refresh is still running");
}

/** Decrypted key fields for API_KEY / BASIC_KEY_SECRET / JWT_BEARER connectors. */
export async function getCredentials(integrationId: string): Promise<Record<string, string>> {
  const row = await prisma.integration.findUnique({ where: { id: integrationId }, select: { encryptedApiKey: true, status: true, provider: true } });
  if (!row?.encryptedApiKey) throw new TokenError("no_token", "No credentials stored");
  if (DEAD.has(row.status)) throw new TokenError("reauth_required", `${row.provider} needs reconnecting`);
  return decryptKeyFields(row.encryptedApiKey);
}

/** Integrations whose token enters its refresh window before `horizon` (used by the daily hub-token-refresh cron). */
export async function dueForRefresh(now = new Date(), horizonMs = 86_400_000): Promise<Pick<Integration, "id" | "provider">[]> {
  const maxAhead = 30 * 86_400_000;
  const rows = await prisma.integration.findMany({
    where: {
      status: { in: ["CONNECTED", "DEGRADED"] },
      accessTokenExpiresAt: { not: null, lte: new Date(now.getTime() + maxAhead) },
    },
    select: { id: true, provider: true, accessTokenExpiresAt: true },
  });
  return rows
    .filter((r) => r.accessTokenExpiresAt!.getTime() - refreshAheadSeconds(r.provider) * 1000 <= now.getTime() + horizonMs)
    .map(({ id, provider }) => ({ id, provider }));
}
