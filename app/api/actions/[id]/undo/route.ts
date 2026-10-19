import { NextResponse } from "next/server";
import { actionView, loadActionForUser } from "@/lib/agent/access";
import { sendActionApproved } from "@/lib/agent/events";
import { approve, createProposal } from "@/lib/agent/ledger";
import { requireApiUser } from "@/lib/auth/api-session";
import { osRoleFor, roleAllows } from "@/lib/os/permissions";
import { isSameOrigin } from "@/lib/security/same-origin";

/**
 * Undo = an inverse action built from `rollbackPayload`, run through the same pipeline. The executor marks the
 * original ROLLED_BACK once the inverse verifies (it carries `rollback.of` evidence).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireApiUser();
  if (!session.ok) return NextResponse.json({ error: session.message }, { status: session.status });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });

  const found = await loadActionForUser(session.userId, (await ctx.params).id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { action, member } = found;

  if (action.status !== "VERIFIED" || !action.undoUntil || action.undoUntil < new Date()) {
    return NextResponse.json({ error: "Undo is no longer available" }, { status: 409 });
  }
  if (!action.rollbackPayload) {
    return NextResponse.json({ error: "This one has to be undone by hand", code: "manual_undo" }, { status: 409 });
  }
  if (!roleAllows(osRoleFor(member.role), action.actionType)) {
    return NextResponse.json({ error: "Your role can't undo this" }, { status: 403 });
  }

  const inverse = await createProposal({
    restaurantId: action.restaurantId,
    locationId: action.locationId,
    title: `Undo: ${action.title}`.slice(0, 90),
    payload: action.rollbackPayload,
    taskKey: action.taskKey,
    channelOrigin: "WEB",
    requestedByUserId: session.userId,
    evidence: [{ type: "rollback.of", source: "ledger", sourceId: action.id }],
    window: `undo:${action.id}`,
  });
  const approved = inverse.approvedAt ? inverse : await approve(inverse.id, session.userId);
  await sendActionApproved(approved);
  return NextResponse.json({ action: actionView(approved), undoOf: action.id });
}
