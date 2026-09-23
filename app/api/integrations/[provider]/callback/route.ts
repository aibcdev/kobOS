import { createHash } from "node:crypto";
import { IntegrationProvider, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto/tokens";
import { getOAuthConfig } from "@/lib/integrations/oauth-config";
import { decodeOAuthState } from "@/lib/integrations/oauth-state";
import { prisma } from "@/lib/db/prisma";
import { talkAccess } from "@/lib/kob/talk/access";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider: providerRaw } = await ctx.params;
  const url = new URL(req.url);
  const stateRaw = url.searchParams.get("state") ?? "";
  const state = decodeOAuthState(stateRaw);
  const talk = state?.returnTo === "talk";
  const back = new URL(talk ? "/app" : "/dashboard/workspace", url.origin);
  if (state) back.searchParams.set("r", state.restaurantId);
  const redirect = (error?: string) => {
    if (error) back.searchParams.set(talk ? "connectionError" : "error", error);
    else back.searchParams.set("connected", providerRaw);
    const response = NextResponse.redirect(back);
    if (talk)
      response.cookies.set("kob-talk-oauth", "", {
        maxAge: 0,
        path: "/api/integrations",
      });
    return response;
  };
  if (!state || state.provider !== providerRaw)
    return redirect("Invalid or expired connection. Please try again.");
  const code = url.searchParams.get("code");
  if (!code)
    return redirect("Connection cancelled. Your account was not connected.");
  try {
    if (talk) {
      const cookie = (await cookies()).get("kob-talk-oauth")?.value;
      if (
        !state.nonce ||
        cookie !== createHash("sha256").update(stateRaw).digest("hex")
      )
        return redirect("Connection expired. Start again from Talk.");
      const access = await talkAccess(state.restaurantId);
      if (!access.ok || access.userId !== state.userId)
        return redirect(
          "Sign in with the account that started this connection.",
        );
    }
    const member = await prisma.teamMember.findUnique({
      where: {
        userId_restaurantId: {
          userId: state.userId,
          restaurantId: state.restaurantId,
        },
      },
      select: { id: true },
    });
    if (!member) return redirect("Restaurant access is no longer available.");
    const provider = providerRaw as IntegrationProvider;
    const cfg = getOAuthConfig(provider);
    if (!cfg) return redirect("Unsupported connection.");
    const clientId = process.env[cfg.clientIdEnv];
    const clientSecret = process.env[cfg.clientSecretEnv];
    if (!clientId || !clientSecret)
      return redirect("This connection isn't configured yet.");
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${url.origin}/api/integrations/${provider}/callback`,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!tokenRes.ok)
      return redirect("Google couldn't complete the connection. Please retry.");
    const tokens = (await tokenRes.json()) as {
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
      },
      update: {
        encryptedAccessToken: encryptSecret(tokens.access_token),
        ...(tokens.refresh_token
          ? { encryptedRefreshToken: encryptSecret(tokens.refresh_token) }
          : {}),
        metadata,
      },
    });
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
  } catch {
    return redirect("Couldn't save the connection. Please retry.");
  }
}
