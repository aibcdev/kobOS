import { IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { canManageConnections } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { oauthUrls, providerRegion } from "@/lib/hub/auth/oauth-urls";
import { getManifest } from "@/lib/hub/manifest";
import { newNonce, pkceChallenge, pkceVerifier, setBindingCookie } from "@/lib/integrations/oauth-binding";
import { buildOAuthUrl, isOAuthConfigured } from "@/lib/integrations/oauth-config";
import { encodeOAuthState } from "@/lib/integrations/oauth-state";

const PROVIDERS = new Set(Object.values(IntegrationProvider));

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const { provider: providerRaw } = await ctx.params;
  const restaurantId = new URL(req.url).searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  if (!PROVIDERS.has(providerRaw as IntegrationProvider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const access = await canManageConnections(session.userId, restaurantId);
  if (access === "not_member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (access === "forbidden") return NextResponse.json({ error: "Only owners and admins can connect accounts" }, { status: 403 });

  const provider = providerRaw as IntegrationProvider;
  const returnTo = new URL(req.url).searchParams.get("returnTo") === "connections" ? "connections" : undefined;

  if (!isOAuthConfigured(provider)) {
    const fallback = returnTo ? "/app/settings/connections" : "/dashboard/settings";
    return NextResponse.redirect(
      `${new URL(req.url).origin}${fallback}?r=${encodeURIComponent(restaurantId)}`,
    );
  }

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/integrations/${provider}/callback`;
  const nonce = newNonce();
  let state: string;
  try {
    state = encodeOAuthState({ restaurantId, provider, userId: session.userId, returnTo, nonce });
  } catch {
    return NextResponse.json({ error: "OAuth state signing unavailable" }, { status: 503 });
  }
  const manifest = getManifest(provider);
  let authUrl: string | undefined;
  if (manifest?.auth.regionOrigins) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { countryCode: true } });
    authUrl = oauthUrls(manifest, providerRegion(manifest, restaurant?.countryCode)).authorizeUrl;
  }
  const challenge = manifest?.auth.pkce ? pkceChallenge(pkceVerifier(nonce)) : undefined;
  const target = buildOAuthUrl(provider, state, redirectUri, authUrl, challenge);
  if (!target) return NextResponse.json({ error: "OAuth URL build failed" }, { status: 503 });

  const res = NextResponse.redirect(target);
  setBindingCookie(res, state, url.protocol === "https:");
  return res;
}
