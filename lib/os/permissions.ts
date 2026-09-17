import { riskRequiresApproval } from "@/lib/os/risk";
import { autonomyFromReliability } from "@/lib/os/reliability";

export type PermissionMode = "NEVER" | "ASK" | "AUTO_WITH_LIMITS" | "AUTOPILOT";

export type Role =
  | "OWNER"
  | "GENERAL_MANAGER"
  | "CHEF"
  | "MARKETING"
  | "FINANCE"
  | "STAFF"
  | "READ_ONLY";

export function roleAllows(role: Role, actionType: string): boolean {
  if (role === "READ_ONLY") return false;
  if (role === "STAFF") return actionType === "REVIEW_THANK_YOU";
  if (role === "MARKETING") {
    return ["REVIEW_REPLY", "REVIEW_THANK_YOU", "HOURS_UPDATE", "TEMPORARY_CLOSURE"].includes(
      actionType,
    );
  }
  if (role === "CHEF") {
    return ["PREP_ADJUST", "SUPPLIER_SUBSTITUTION", "INVOICE_FLAG"].includes(actionType);
  }
  if (role === "FINANCE") {
    return ["INVOICE_FLAG", "SUPPLIER_SUBSTITUTION", "REFUND"].includes(actionType);
  }
  return true;
}

export function authorised(input: {
  mode: PermissionMode;
  role: Role;
  risk: number;
  reliability: number;
  actionType: string;
}): { ok: boolean; requiresApproval: boolean; reason: string } {
  if (input.mode === "NEVER") {
    return { ok: false, requiresApproval: true, reason: "Policy forbids this action." };
  }
  if (!roleAllows(input.role, input.actionType)) {
    return { ok: false, requiresApproval: true, reason: "Your role cannot run this." };
  }
  const band = autonomyFromReliability(input.reliability);
  if (band === "insight") {
    return { ok: true, requiresApproval: true, reason: "Reliability is insight-only." };
  }
  const needAsk = riskRequiresApproval(input.risk, input.mode) || band === "suggest";
  if (band === "limited_autopilot" && input.risk >= 51) {
    return { ok: true, requiresApproval: true, reason: "Limited autopilot: high risk still asks." };
  }
  return {
    ok: true,
    requiresApproval: needAsk,
    reason: needAsk ? "Needs your yes." : "Policy and risk allow execute.",
  };
}
