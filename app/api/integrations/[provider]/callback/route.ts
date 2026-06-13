import { IntegrationProvider, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto/tokens";
import { getOAuthConfig } from "@/lib/integrations/oauth-config";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: providerRaw } = await ctx.params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  if (!code || !stateRaw) {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?error=oauth`);
  }

  let state: { restaurantId: string; provider: string };
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8")) as {
      restaurantId: string;
      provider: string;
    };
  } catch {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?error=state`);
  }

  const provider = providerRaw as IntegrationProvider;
  const cfg = getOAuthConfig(provider);
  if (!cfg) return NextResponse.redirect(`${url.origin}/dashboard/settings?error=provider`);

  const clientId = process.env[cfg.clientIdEnv];
  const clientSecret = process.env[cfg.clientSecretEnv];
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?error=config`);
  }

  const redirectUri = `${url.origin}/api/integrations/${provider}/callback`;
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
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${url.origin}/dashboard/workspace?r=${state.restaurantId}&error=token`);
  }

  const tokens = (await tokenRes.json()) as { access_token?: string; refresh_token?: string };
  if (!tokens.access_token) {
    return NextResponse.redirect(`${url.origin}/dashboard/workspace?r=${state.restaurantId}&error=token`);
  }

  const integration = await prisma.integration.upsert({
    where: {
      restaurantId_provider: { restaurantId: state.restaurantId, provider },
    },
    create: {
      restaurantId: state.restaurantId,
      provider,
      encryptedAccessToken: encryptSecret(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
      metadata: {} as Prisma.InputJsonValue,
    },
    update: {
      encryptedAccessToken: encryptSecret(tokens.access_token),
      ...(tokens.refresh_token ? { encryptedRefreshToken: encryptSecret(tokens.refresh_token) } : {}),
    },
  });

  // First sync now so the greeting and Need-to-know reflect the connection immediately.
  try {
    if (provider === "GOOGLE_CALENDAR") {
      const { syncGoogleCalendarEvents } = await import("@/lib/integrations/providers/google-calendar");
      await syncGoogleCalendarEvents(state.restaurantId, integration);
    } else if (provider === "GMAIL") {
      const { syncGmailSnapshot } = await import("@/lib/integrations/providers/gmail");
      await syncGmailSnapshot(state.restaurantId, integration);
    }
  } catch {
    /* daily sync will pick it up */
  }

  return NextResponse.redirect(`${url.origin}/dashboard/workspace?r=${state.restaurantId}&connected=${provider}`);
}
