import { NextResponse } from "next/server";
import { loadActionForUser } from "@/lib/agent/access";
import { viewWithAssist } from "@/lib/agent/assist";
import { LedgerTransitionError, markDoneByOwner } from "@/lib/agent/ledger";
import { requireApiUser } from "@/lib/auth/api-session";
import { isSameOrigin } from "@/lib/security/same-origin";

/** "I've posted it": the owner posted the approved change on Google themselves (assisted mode). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
  const found = await loadActionForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const view = await viewWithAssist(found.action);
  if (!view.assist) return NextResponse.json({ error: "KOB posts this one itself." }, { status: 409 });
  try {
    return NextResponse.json({ action: await viewWithAssist(await markDoneByOwner(found.action.id, session.userId)) });
  } catch (e) {
    if (e instanceof LedgerTransitionError) return NextResponse.json({ error: "Approve it first, then post it.", action: view }, { status: 409 });
    throw e;
  }
}
