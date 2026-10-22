import { NextResponse } from "next/server";
import { connectWithKeys, disconnectIntegration } from "@/lib/hub/connections";
import { authorizeConnectionChange as authorize } from "@/lib/hub/connection-auth";
import { getManifest } from "@/lib/hub/manifest";

export const runtime = "nodejs";

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
