export type ReadinessChecks = {
  dataReliable: boolean;
  endToEnd: boolean;
  failureStates: boolean;
  permissions: boolean;
  executes: boolean;
  verifies: boolean;
  audit: boolean;
  voice: boolean;
  monitoring: boolean;
  acceptance: boolean;
};

export type CapabilityLabel = "LIVE" | "BETA" | "PREDICTION" | "INSIGHT" | "COMING_SOON";

export function capabilityLabel(c: ReadinessChecks, fallback: CapabilityLabel = "COMING_SOON"): CapabilityLabel {
  const live =
    c.dataReliable &&
    c.endToEnd &&
    c.failureStates &&
    c.permissions &&
    c.executes &&
    c.verifies &&
    c.audit &&
    c.voice &&
    c.monitoring &&
    c.acceptance;
  if (live) return "LIVE";
  return fallback;
}

/**
 * The only source of owner-facing action status text. "Done" appears here and nowhere else, and only for VERIFIED
 * (tests/ui/done-source.test.ts enforces it).
 */
export function ownerFacingStatus(status: string, failureCode?: string | null): string {
  if (status === "VERIFIED") return "Done";
  if (status === "EXECUTED" || status === "VERIFYING") return "Sent — waiting for confirmation.";
  if (status === "FAILED") {
    if (!failureCode || failureCode === "AUTH" || failureCode === "DENIED_NEEDS_CONNECTION") return "Needs reconnect.";
    if (failureCode === "VERIFY_MISMATCH") return "Didn't stick — check it.";
    if (failureCode === "VERIFY_TIMEOUT") return "Not confirmed yet — check it.";
    if (failureCode === "EXPIRED") return "Expired.";
    if (failureCode.startsWith("DENIED_")) return "Not allowed.";
    return "Couldn't finish.";
  }
  if (status === "AWAITING_APPROVAL" || status === "PROPOSED") return "Draft only — needs your yes.";
  if (status === "APPROVED" || status === "EXECUTING") return "On it…";
  if (status === "REJECTED") return "Skipped.";
  if (status === "ROLLED_BACK") return "Undone.";
  if (status === "DRAFT") return "Draft only.";
  return status;
}
