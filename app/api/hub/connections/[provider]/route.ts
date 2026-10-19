import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { connectWithKeys, disconnectIntegration } from "@/lib/hub/connections";
import { getManifest } from "@/lib/hub/manifest";
import { isSameOrigin } from "@/lib/security/same-origin";

export const runtime = "nodejs";

/** Owners and admins manage connections; 404 (not 403) for restaurants the user isn't on. */
async function authorize(req: Request, restaurantId: unknown): Promise<{ ok: true; userId: string; restaurantId: string } | { ok: false; res: NextResponse }> {
  const session = await requireApiUser();
  if (!session.ok) return { ok: false, res: NextResponse.json({ error: session.message }, { status: session.status }) };
  if (!isSameOrigin(req)) return { ok: false, res: NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 }) };
  if (typeof restaurantId !== "string" || !restaurantId) return { ok: false, res: NextResponse.json({ error: "restaurantId required" }, { status: 400 }) };
  const member = await prisma.teamMember.findUnique({ where: { userId_restaurantId: { userId: session.userId, restaurantId } } });
  if (!member) return { ok: false, res: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (member.role !== "OWNER" && member.role !== "ADMIN") {
    return { ok: false, res: NextResponse.json({ error: "Only owners and admins can change connections" }, { status: 403 }) };
  }
  return { ok: true, userId: session.userId, restaurantId };
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
  const auth = await authorize(req, new URL(req.url).searchParams.get("restaurantId"));
  if (!auth.ok) return auth.res;
  const done = await disconnectIntegration(auth.restaurantId, provider);
  return NextResponse.json({ disconnected: done });
}
