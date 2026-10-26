import { NextResponse } from "next/server";
import { z } from "zod";
import { actionView, loadActionForUser, SLIDE_RISK } from "@/lib/agent/access";
import { viewWithAssist } from "@/lib/agent/assist";
import { isAssisted, publishMode } from "@/lib/agent/publish-mode";
import { sendActionApproved } from "@/lib/agent/events";
import { assertGrantable, GrantError, grantFromApproval } from "@/lib/agent/grants";
import { approve, fail, getAction, LedgerTransitionError } from "@/lib/agent/ledger";
import { requireApiUser } from "@/lib/auth/api-session";
import { canAct } from "@/lib/billing/trial";
import { osRoleFor, roleAllows } from "@/lib/os/permissions";
import { isSameOrigin } from "@/lib/security/same-origin";

const body = z.object({
  scope: z.enum(["ONCE", "TASK", "ALWAYS"]).default("ONCE"),
  limits: z.record(z.string(), z.number()).optional(),
  confirm: z.literal("slide").optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });

  const found = await loadActionForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { action, member } = found;

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 422 });
  const { scope, limits, confirm } = parsed.data;

  // Already approved (or further along): approving again changes nothing.
  if (action.approvedAt && action.status !== "AWAITING_APPROVAL" && action.status !== "PROPOSED") {
    return NextResponse.json({ action: actionView(action), alreadyApproved: true });
  }
  if (action.status !== "AWAITING_APPROVAL" && action.status !== "PROPOSED") {
    return NextResponse.json({ error: "This can no longer be approved", action: actionView(action) }, { status: 409 });
  }
  // After a trial ends without a card KOB is read-only: nothing new goes out until a card is added.
  const billing = await canAct(action.restaurantId);
  if (!billing.ok) return NextResponse.json({ error: billing.message, code: billing.code, nextHref: "/dashboard/billing" }, { status: 402 });
  if (!roleAllows(osRoleFor(member.role), action.actionType)) {
    return NextResponse.json({ error: "Your role can't approve this" }, { status: 403 });
  }
  if (action.riskScore >= SLIDE_RISK && confirm !== "slide") {
    return NextResponse.json({ error: "Slide to confirm", code: "slide_required" }, { status: 422 });
  }
  if (action.expiresAt && action.expiresAt < new Date()) {
    const expired = await fail(action.id, "EXPIRED", "Proposal expired before approval");
    return NextResponse.json({ error: "This proposal expired", action: actionView(expired) }, { status: 410 });
  }
  try {
    assertGrantable(action, scope);
  } catch (e) {
    if (e instanceof GrantError) return NextResponse.json({ error: e.code }, { status: 422 });
    throw e;
  }

  let approved;
  try {
    approved = await approve(action.id, session.userId);
  } catch (e) {
    const now = e instanceof LedgerTransitionError ? await getAction(action.id) : null;
    if (now?.approvedAt) return NextResponse.json({ action: actionView(now), alreadyApproved: true });
    throw e;
  }
  await grantFromApproval(approved, session.userId, scope, limits);
  // Assisted mode: the owner posts it on Google themselves, so nothing is handed to the executor.
  const mode = await publishMode(approved.restaurantId);
  if (!isAssisted(approved, mode)) await sendActionApproved(approved);
  return NextResponse.json({ action: await viewWithAssist(approved) });
}
