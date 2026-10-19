import { IntegrationProvider, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canManageConnections } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { registerAllConnectors } from "@/lib/connectors";
import { encryptSecret } from "@/lib/crypto/tokens";
import { inngest } from "@/inngest/client";
import { exchangeCode, tokenSetFrom } from "@/lib/hub/auth/oauth2";
import { oauthUrls, providerRegion } from "@/lib/hub/auth/oauth-urls";
import { connectorFor } from "@/lib/hub/connector";
import { getManifest } from "@/lib/hub/manifest";
import { bindingMatches, clearBindingCookie, OAUTH_COOKIE, pkceVerifier } from "@/lib/integrations/oauth-binding";
import { getOAuthConfig } from "@/lib/integrations/oauth-config";
import { decodeOAuthState } from "@/lib/integrations/oauth-state";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider: providerRaw } = await ctx.params;
  const url = new URL(req.url);
  const stateRaw = url.searchParams.get("state") ?? "";
  const state = decodeOAuthState(stateRaw);
  const talk = state?.returnTo === "talk";
  const connections = state?.returnTo === "connections";
  const back = new URL(talk ? "/app" : connections ? "/app/settings/connections" : "/dashboard/workspace", url.origin);
  if (state) back.searchParams.set("r", state.restaurantId);
  const redirect = (error?: string) => {
    if (error) back.searchParams.set(talk || connections ? "connectionError" : "error", error);
    else back.searchParams.set("connected", providerRaw);
    const response = NextResponse.redirect(back);
    clearBindingCookie(response);
    return response;
  };
  if (!state || state.provider !== providerRaw)
    return redirect("Invalid or expired connection. Please try again.");
  const code = url.searchParams.get("code");
  if (!code)
    return redirect("Connection cancelled. Your account was not connected.");
  try {
    if (!state.nonce || !bindingMatches(stateRaw, (await cookies()).get(OAUTH_COOKIE)?.value))
      return redirect(talk ? "Connection expired. Start again from Talk." : "Connection expired. Start again from this browser.");
    const session = await requireApiUser();
    if (!session.ok || session.userId !== state.userId)
      return redirect("Sign in with the account that started this connection.");
    const access = await canManageConnections(state.userId, state.restaurantId);
    if (access === "not_member") return redirect("Restaurant access is no longer available.");
    if (access === "forbidden") return redirect("Only owners and admins can connect accounts.");
    const provider = providerRaw as IntegrationProvider;
    const cfg = getOAuthConfig(provider);
    if (!cfg) return redirect("Unsupported connection.");
    const clientId = process.env[cfg.clientIdEnv];
    const clientSecret = process.env[cfg.clientSecretEnv];
    if (!clientId || !clientSecret)
      return redirect("This connection isn't configured yet.");
    const manifest = getManifest(provider);
    const redirectUri = `${url.origin}/api/integrations/${provider}/callback`;
    let tokenJson: Record<string, unknown>;
    let region: string | null = null;
    if (manifest) {
      if (manifest.auth.regionOrigins) {
        const r = await prisma.restaurant.findUnique({ where: { id: state.restaurantId }, select: { countryCode: true } });
        region = providerRegion(manifest, r?.countryCode);
      }
      try {
        tokenJson = (
          await exchangeCode(
            {
              tokenUrl: oauthUrls(manifest, region).tokenUrl ?? cfg.tokenUrl,
              clientId,
              clientSecret,
              body: manifest.auth.tokenBody,
              clientAuth: manifest.auth.clientAuth,
            },
            code,
            redirectUri,
            manifest.auth.pkce ? pkceVerifier(state.nonce) : undefined,
          )
        ).raw;
      } catch {
        return redirect(`${manifest.displayName} couldn't complete the connection. Please retry.`);
      }
    } else {
      const tokenRes = await fetch(cfg.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!tokenRes.ok)
        return redirect("Google couldn't complete the connection. Please retry.");
      tokenJson = (await tokenRes.json()) as Record<string, unknown>;
    }
    const tokens = tokenJson as {
      access_token?: string;
      refresh_token?: string;
      scope?: string;
    };
    if (!tokens.access_token)
      return redirect("No account access was granted. Please retry.");
    if (
      talk &&
      tokens.scope &&
      !cfg.scopes.every((scope) => tokens.scope!.split(" ").includes(scope))
    )
      return redirect(
        "Read access wasn't granted. Please reconnect and allow the requested access.",
      );
    const existing = await prisma.integration.findUnique({
      where: {
        restaurantId_provider: { restaurantId: state.restaurantId, provider },
      },
    });
    const metadata = {
      ...((existing?.metadata ?? {}) as Record<string, unknown>),
      ...(talk ? { talkStatus: "unverified", talkCheckedAt: null } : {}),
    } as Prisma.InputJsonValue;
    const granted = tokenSetFrom(tokenJson);
    let externalAccountId: string | null = null;
    if (manifest) {
      const verified = await verifiedAccountId(provider, tokens.access_token, url.searchParams.get("merchant_id"), region);
      if (!verified.ok) return redirect(`${manifest.displayName} couldn't confirm which account you connected. Please retry.`);
      externalAccountId = verified.id;
    }
    const hub = {
      authKind: "OAUTH2_CODE",
      status: "CONNECTED",
      accessTokenExpiresAt: granted.expiresAt ?? null,
      scopesGranted: granted.scopes ?? cfg.scopes,
      connectedByUserId: state.userId,
      disconnectedAt: null,
      lastErrorCode: null,
      ...(region ? { region } : {}),
      ...(externalAccountId ? { externalAccountId } : {}),
    };
    const integration = await prisma.integration.upsert({
      where: {
        restaurantId_provider: { restaurantId: state.restaurantId, provider },
      },
      create: {
        restaurantId: state.restaurantId,
        provider,
        encryptedAccessToken: encryptSecret(tokens.access_token),
        encryptedRefreshToken: tokens.refresh_token
          ? encryptSecret(tokens.refresh_token)
          : null,
        metadata,
        ...hub,
      },
      update: {
        encryptedAccessToken: encryptSecret(tokens.access_token),
        ...(tokens.refresh_token
          ? { encryptedRefreshToken: encryptSecret(tokens.refresh_token) }
          : {}),
        metadata,
        ...hub,
      },
    });
    if (manifest) {
      await inngest
        .send({ name: "hub/integration.connected", data: { integrationId: integration.id } })
        .catch(() => undefined);
    }
    if (!talk) {
      try {
        if (provider === "GOOGLE_CALENDAR") {
          const { syncGoogleCalendarEvents } =
            await import("@/lib/integrations/providers/google-calendar");
          await syncGoogleCalendarEvents(state.restaurantId, integration);
        } else if (provider === "GMAIL") {
          const { syncGmailSnapshot } =
            await import("@/lib/integrations/providers/gmail");
          await syncGmailSnapshot(state.restaurantId, integration);
        }
      } catch {
        /* Existing dashboard sync can retry later. */
      }
    }
    return redirect();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
      return redirect("That account is already connected to another restaurant in KOB. Disconnect it there first.");
    return redirect("Couldn't save the connection. Please retry.");
  }
}

/**
 * The account id comes from the provider's API, never from the redirect URL. Clover tokens are merchant-scoped, so
 * reading /v3/merchants/{id} with the new token proves the merchant in the query string is the one that authorised.
 */
async function verifiedAccountId(provider: string, accessToken: string, merchantParam: string | null, region: string | null): Promise<{ ok: true; id: string | null } | { ok: false }> {
  registerAllConnectors();
  const connector = connectorFor(provider);
  if (!connector) return { ok: true, id: null };
  const check = await connector.validateCredentials({ accessToken, ...(merchantParam ? { merchantId: merchantParam } : {}) }, { region }).catch(() => ({ ok: false as const }));
  if (!check.ok) return { ok: false };
  const id = "externalAccountId" in check ? (check.externalAccountId ?? null) : null;
  if (merchantParam && id && id !== merchantParam) return { ok: false };
  return { ok: true, id };
}
