import { NextResponse } from "next/server";
import { revokeGrant } from "@/lib/agent/grants";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { osRoleFor, roleAllows } from "@/lib/os/permissions";
import { isSameOrigin } from "@/lib/security/same-origin";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });

  const grant = await prisma.osPermissionGrant.findUnique({ where: { id: (await ctx.params).id } });
  const member = grant
    ? await prisma.teamMember.findUnique({ where: { userId_restaurantId: { userId: session.userId, restaurantId: grant.restaurantId } } })
    : null;
  if (!grant || !member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!roleAllows(osRoleFor(member.role), grant.actionType)) {
    return NextResponse.json({ error: "Your role can't change this" }, { status: 403 });
  }

  const revoked = await revokeGrant(grant.id, session.userId);
  return NextResponse.json({ grant: { id: revoked.id, revokedAt: revoked.revokedAt?.toISOString() ?? null } });
}
