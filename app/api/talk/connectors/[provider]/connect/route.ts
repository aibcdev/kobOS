import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { talkAccess } from "@/lib/kob/talk/access";
import { connectorConfigured } from "@/lib/kob/talk/connectors";
import { isTalkProvider } from "@/lib/kob/talk/types";
import { buildOAuthUrl } from "@/lib/integrations/oauth-config";
import { encodeOAuthState } from "@/lib/integrations/oauth-state";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const url = new URL(req.url);
  const restaurantId = url.searchParams.get("restaurantId") ?? "";
  const back = new URL(
    `/app?r=${encodeURIComponent(restaurantId)}`,
    url.origin,
  );
  try {
    const { provider } = await ctx.params;
    if (!isTalkProvider(provider))
      return NextResponse.json(
        { error: "Unknown connection." },
        { status: 404 },
      );
    const access = await talkAccess(restaurantId);
    if (!access.ok) {
      back.searchParams.set(
        "connectionError",
        "Sign in to connect your account.",
      );
      return NextResponse.redirect(back);
    }
    if (!connectorConfigured(provider)) {
      back.searchParams.set(
        "connectionError",
        "This connection isn't configured yet.",
      );
      return NextResponse.redirect(back);
    }
    const state = encodeOAuthState({
      restaurantId,
      userId: access.userId,
      provider,
      returnTo: "talk",
      nonce: randomUUID(),
    });
    const target = buildOAuthUrl(
      provider,
      state,
      `${url.origin}/api/integrations/${provider}/callback`,
    )!;
    const response = NextResponse.redirect(target);
    response.cookies.set(
      "kob-talk-oauth",
      createHash("sha256").update(state).digest("hex"),
      {
        httpOnly: true,
        secure: url.protocol === "https:",
        sameSite: "lax",
        maxAge: 1800,
        path: "/api/integrations",
      },
    );
    return response;
  } catch {
    back.searchParams.set(
      "connectionError",
      "Couldn't start the connection. Please retry.",
    );
    return NextResponse.redirect(back);
  }
}
