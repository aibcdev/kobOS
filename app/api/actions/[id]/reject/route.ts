import { NextResponse } from "next/server";
import { z } from "zod";
import { actionView, loadActionForUser } from "@/lib/agent/access";
import { LedgerTransitionError, reject } from "@/lib/agent/ledger";
import { requireApiUser } from "@/lib/auth/api-session";
import { isSameOrigin } from "@/lib/security/same-origin";

/** Reason chips on the card: wrong tone, wrong facts, not now, don't do this — or free text. */
const body = z.object({ reason: z.string().trim().min(1).max(200) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });

  const found = await loadActionForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "A reason is required" }, { status: 422 });

  if (found.action.status === "REJECTED") return NextResponse.json({ action: actionView(found.action) });
  try {
    const rejected = await reject(found.action.id, session.userId, parsed.data.reason);
    return NextResponse.json({ action: actionView(rejected) });
  } catch (e) {
    if (e instanceof LedgerTransitionError) {
      return NextResponse.json({ error: "Already running — too late to skip", action: actionView(found.action) }, { status: 409 });
    }
    throw e;
  }
}
