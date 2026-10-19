import { NextResponse } from "next/server";
import { actionView, loadActionForUser } from "@/lib/agent/access";
import { requireApiUser } from "@/lib/auth/api-session";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });

  const found = await loadActionForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ action: actionView(found.action) });
}
