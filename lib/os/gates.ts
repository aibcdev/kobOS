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

export function ownerFacingStatus(status: string): string {
  if (status === "VERIFIED") return "Done";
  if (status === "EXECUTED" || status === "VERIFYING") return "Sent — waiting for confirmation.";
  if (status === "FAILED") return "Needs reconnect.";
  if (status === "AWAITING_APPROVAL") return "Draft only — needs your yes.";
  if (status === "DRAFT") return "Draft only.";
  return status;
}
