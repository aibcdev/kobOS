import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { isSameOrigin } from "@/lib/security/same-origin";

/** Owners and admins manage connections; 404 (not 403) for restaurants the user isn't on. */
export async function authorizeConnectionChange(
  req: Request,
  restaurantId: unknown,
  opts: { requireSameOrigin?: boolean } = {},
): Promise<{ ok: true; userId: string; restaurantId: string } | { ok: false; res: NextResponse }> {
  const session = await requireApiUser();
  if (!session.ok) return { ok: false, res: NextResponse.json({ error: session.message }, { status: session.status }) };
  if (opts.requireSameOrigin !== false && !isSameOrigin(req)) return { ok: false, res: NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 }) };
  if (typeof restaurantId !== "string" || !restaurantId) return { ok: false, res: NextResponse.json({ error: "restaurantId required" }, { status: 400 }) };
  const member = await prisma.teamMember.findUnique({ where: { userId_restaurantId: { userId: session.userId, restaurantId } } });
  if (!member) return { ok: false, res: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (member.role !== "OWNER" && member.role !== "ADMIN") {
    return { ok: false, res: NextResponse.json({ error: "Only owners and admins can change connections" }, { status: 403 }) };
  }
  return { ok: true, userId: session.userId, restaurantId };
}
