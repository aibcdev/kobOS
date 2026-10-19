import type { OsAction } from "@prisma/client";
import { sendActionApproved } from "@/lib/agent/events";
import { approve, createProposal, fail, type ProposalInput } from "@/lib/agent/ledger";
import { evaluatePolicy, type PolicyDeps, type PolicyResult } from "@/lib/agent/policy";

/**
 * The one entry point for proposing an external change: write the proposal, run policy, then either leave it
 * for the owner (ASK), auto-approve and hand it to the executor (AUTO), or close it (DENY).
 */
export async function proposeAction(
  input: ProposalInput,
  deps: PolicyDeps = {},
): Promise<{ action: OsAction; policy: PolicyResult | null }> {
  const proposed = await createProposal(input);
  // A duplicate that has already moved on keeps its state.
  if (proposed.status !== "AWAITING_APPROVAL") return { action: proposed, policy: null };

  const policy = await evaluatePolicy(proposed, deps);
  if (policy.decision === "DENY") {
    return { action: await fail(proposed.id, `DENIED_${policy.reason.toUpperCase()}`, policy.reason), policy };
  }
  if (policy.decision === "AUTO") {
    const approved = await approve(proposed.id, "policy");
    await sendActionApproved(approved);
    return { action: approved, policy };
  }
  return { action: proposed, policy };
}
