import { IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { requireApiUser } from "@/lib/auth/api-session";
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

  const allowed = await assertRestaurantMembership(session.userId, restaurantId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const provider = providerRaw as IntegrationProvider;

  if (!isOAuthConfigured(provider)) {
    return NextResponse.redirect(
      `${new URL(req.url).origin}/dashboard/settings?r=${encodeURIComponent(restaurantId)}`,
    );
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/integrations/${provider}/callback`;
  let state: string;
  try {
    state = encodeOAuthState({
      restaurantId,
      provider,
      userId: session.userId,
    });
  } catch {
    return NextResponse.json({ error: "OAuth state signing unavailable" }, { status: 503 });
  }
  const url = buildOAuthUrl(provider, state, redirectUri);
  if (!url) return NextResponse.json({ error: "OAuth URL build failed" }, { status: 503 });

  return NextResponse.redirect(url);
}
