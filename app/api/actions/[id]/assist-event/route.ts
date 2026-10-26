import { NextResponse } from "next/server";
import { z } from "zod";
import { loadActionForUser } from "@/lib/agent/access";
import { requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { isSameOrigin } from "@/lib/security/same-origin";

const body = z.object({ event: z.enum(["copied", "opened_google"]) });

/** Where owners drop off in the assisted flow: copied the words, opened Google (posting is recorded by /posted). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
  const found = await loadActionForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown event" }, { status: 422 });
  await prisma.osAuditEvent.create({
    data: { restaurantId: found.action.restaurantId, actionId: found.action.id, kind: `assist.${parsed.data.event}`, payload: { by: session.userId } },
  });
  return NextResponse.json({ ok: true });
}
