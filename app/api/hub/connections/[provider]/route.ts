import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-session";
import { assertRestaurantMembership } from "@/lib/api/restaurant-access";
import { prisma } from "@/lib/db/prisma";
import { connectMethod, connectWithKeys, disconnectIntegration } from "@/lib/hub/connections";
import { authorizeConnectionChange as authorize } from "@/lib/hub/connection-auth";
import { getManifest } from "@/lib/hub/manifest";

export const runtime = "nodejs";

/** One provider's state for this restaurant and how to connect it (e.g. the Today "Connect your Google listing" card). */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const manifest = getManifest(provider);
  if (!manifest) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  const restaurantId = new URL(req.url).searchParams.get("restaurantId") ?? "";
  if (!restaurantId || !(await assertRestaurantMembership(session.userId, restaurantId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const row = await prisma.integration.findFirst({
    where: { restaurantId, provider: manifest.provider as never },
    select: { status: true, externalAccountId: true },
  });
  const state = !row || row.status === "DISCONNECTED" ? "not_connected" : row.status === "PENDING_SETUP" || !row.externalAccountId ? "pick_location" : row.status === "REAUTH" ? "reconnect" : "connected";
  return NextResponse.json({ provider: manifest.provider, state, connect: connectMethod(manifest, restaurantId) }, { headers: { "Cache-Control": "no-store" } });
}

/** Connect an API-key / key-and-secret provider (Toast, Epos Now, Zettle). OAuth providers use /api/integrations/[provider]/connect. */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!getManifest(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { restaurantId?: unknown; fields?: unknown } | null;
  const auth = await authorize(req, body?.restaurantId);
  if (!auth.ok) return auth.res;
  const fields = body?.fields && typeof body.fields === "object" ? (body.fields as Record<string, unknown>) : {};
  const result = await connectWithKeys({ restaurantId: auth.restaurantId, provider, userId: auth.userId, fields });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ connected: true, status: result.integration.status });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!getManifest(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  const url = new URL(req.url);
  const auth = await authorize(req, url.searchParams.get("restaurantId"));
  if (!auth.ok) return auth.res;
  const mode = url.searchParams.get("data") === "delete" ? "DELETE_ALL" : "KEEP_TOTALS";
  const done = await disconnectIntegration(auth.restaurantId, provider, mode);
  return NextResponse.json({ disconnected: done });
}
