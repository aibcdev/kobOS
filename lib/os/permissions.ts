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

/** `TeamMember.role` (Prisma `Role`) → OS role. */
export function osRoleFor(teamRole: "OWNER" | "ADMIN" | "MEMBER" | string): Role {
  if (teamRole === "OWNER") return "OWNER";
  if (teamRole === "ADMIN") return "GENERAL_MANAGER";
  return "STAFF";
}

/** Dotted ledger action types → the legacy keys the role table below understands. */
export const LEGACY_ACTION_KEY: Record<string, string> = {
  "gbp.review.reply": "REVIEW_REPLY",
  "gbp.review.reply.update": "REVIEW_REPLY",
  "gbp.review.reply.delete": "REVIEW_REPLY",
  "gbp.hours.regular.update": "HOURS_UPDATE",
  "gbp.hours.special.set": "HOURS_UPDATE",
  "gbp.attribute.chat.set": "PROFILE_UPDATE",
  "gbp.profile.description.update": "PROFILE_UPDATE",
  "gbp.post.create": "SOCIAL_POST",
  "ig.post.publish": "SOCIAL_POST",
  "fb.post.publish": "SOCIAL_POST",
  "email.send.supplier": "SUPPLIER_EMAIL",
  "guest.reply.send": "GUEST_REPLY",
  "pos.item.86": "MENU_86",
  "pos.item.price.update": "PRICE_UPDATE",
  "calendar.event.create": "CALENDAR_EVENT",
};

export function roleAllows(role: Role, rawActionType: string): boolean {
  const actionType = LEGACY_ACTION_KEY[rawActionType] ?? rawActionType;
  if (role === "READ_ONLY") return false;
  if (role === "STAFF") return actionType === "REVIEW_THANK_YOU";
  if (role === "MARKETING") {
    return [
      "REVIEW_REPLY",
      "REVIEW_THANK_YOU",
      "HOURS_UPDATE",
      "TEMPORARY_CLOSURE",
      "SOCIAL_POST",
      "PROFILE_UPDATE",
      "GUEST_REPLY",
    ].includes(actionType);
  }
  if (role === "CHEF") {
    return ["PREP_ADJUST", "SUPPLIER_SUBSTITUTION", "INVOICE_FLAG", "MENU_86", "SUPPLIER_EMAIL"].includes(
      actionType,
    );
  }
  if (role === "FINANCE") {
    return ["INVOICE_FLAG", "SUPPLIER_SUBSTITUTION", "REFUND", "SUPPLIER_EMAIL"].includes(actionType);
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
    return { ok: true, requiresApproval: true, reason: "Within your limits: higher-risk changes still ask you." };
  }
  return {
    ok: true,
    requiresApproval: needAsk,
    reason: needAsk ? "Needs your yes." : "Policy and risk allow execute.",
  };
}
