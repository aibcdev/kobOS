import { NextResponse } from "next/server";
import { z } from "zod";
import { loadActionForUser } from "@/lib/agent/access";
import { viewWithAssist } from "@/lib/agent/assist";
import { editProposalText, EDITABLE_FIELD, LedgerTransitionError } from "@/lib/agent/ledger";
import { requireApiUser } from "@/lib/auth/api-session";
import { bannedWordsIn } from "@/lib/copy/banned-words";
import { isSameOrigin } from "@/lib/security/same-origin";

const body = z.object({ text: z.string().trim().min(2).max(1500) });

/** The owner edits the drafted words before approving. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
  const found = await loadActionForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!EDITABLE_FIELD[found.action.actionType]) return NextResponse.json({ error: "This one can't be edited." }, { status: 422 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write between 2 and 1,500 characters." }, { status: 422 });
  // The owner's own words are theirs; only flag, don't block.
  const flagged = bannedWordsIn(parsed.data.text);
  try {
    const row = await editProposalText(found.action.id, session.userId, parsed.data.text);
    return NextResponse.json({ action: await viewWithAssist(row), flagged });
  } catch (e) {
    if (e instanceof LedgerTransitionError) return NextResponse.json({ error: "It's already approved, so it can't be edited." }, { status: 409 });
    throw e;
  }
}
