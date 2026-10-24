import type { PermissionMode } from "@/lib/os/permissions";
import { actionRisk, type RiskParts } from "@/lib/os/risk";

/** Spec 1 §5.9. Every external write the agent can propose. */
export const ACTION_TYPES = [
  "gbp.review.reply",
  "gbp.review.reply.update",
  "gbp.review.reply.delete",
  "gbp.hours.regular.update",
  "gbp.hours.special.set",
  "gbp.attribute.chat.set",
  "gbp.post.create",
  "gbp.profile.description.update",
  "ig.post.publish",
  "fb.post.publish",
  "email.send.supplier",
  "guest.reply.send",
  "pos.item.86",
  "pos.item.price.update",
  "calendar.event.create",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export type Connector =
  | "GBP"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "EMAIL"
  | "WHATSAPP"
  | "POS"
  | "GOOGLE_CALENDAR";

export type ActionTypeSpec = {
  connector: Connector;
  /** 0–100 per part; `riskFor()` turns them into the score. */
  risk: RiskParts;
  defaultMode: PermissionMode;
  /** "Always do this" is offered only when true. Limits are what the sheet asks for. */
  alwaysEligible: boolean;
  alwaysLimits?: Record<string, number>;
  verifyBy: string;
  /** Hours the proposal stays open before it expires. */
  expiresHours: number;
  /** Hours after VERIFIED that undo is offered; 0 = no undo. */
  undoHours: number;
};

const r = (financial: number, customer: number, reversibility: number, reputation: number, operational: number): RiskParts => ({
  financial,
  customer,
  reversibility,
  reputation,
  operational,
});

const REVIEW_LIMITS = { minRating: 4, excludeSeverityGte: 2, maxPerDay: 20 };

export const ACTION_TYPE_SPECS: Record<ActionType, ActionTypeSpec> = {
  "gbp.review.reply": {
    connector: "GBP",
    risk: r(0, 30, 20, 50, 0),
    defaultMode: "ASK",
    alwaysEligible: true,
    alwaysLimits: REVIEW_LIMITS,
    verifyBy: "GET review, compare reviewReply.comment",
    expiresHours: 7 * 24,
    undoHours: 24,
  },
  "gbp.review.reply.update": {
    connector: "GBP",
    risk: r(0, 30, 20, 50, 0),
    defaultMode: "ASK",
    alwaysEligible: true,
    alwaysLimits: REVIEW_LIMITS,
    verifyBy: "GET review, compare reviewReply.comment",
    expiresHours: 7 * 24,
    undoHours: 24,
  },
  "gbp.review.reply.delete": {
    connector: "GBP",
    risk: r(0, 20, 60, 40, 0),
    defaultMode: "ASK",
    alwaysEligible: false,
    verifyBy: "GET review, reviewReply absent",
    expiresHours: 72,
    undoHours: 0,
  },
  "gbp.hours.regular.update": {
    connector: "GBP",
    risk: r(20, 60, 30, 40, 50),
    defaultMode: "ASK",
    alwaysEligible: false,
    verifyBy: "GET location regularHours (may be pending Google)",
    expiresHours: 72,
    undoHours: 24,
  },
  "gbp.hours.special.set": {
    connector: "GBP",
    risk: r(20, 60, 30, 40, 50),
    defaultMode: "ASK",
    alwaysEligible: true,
    verifyBy: "GET specialHours",
    expiresHours: 72,
    undoHours: 24,
  },
  "gbp.attribute.chat.set": {
    connector: "GBP",
    risk: r(0, 30, 20, 20, 10),
    defaultMode: "ASK",
    alwaysEligible: false,
    verifyBy: "GET attributes",
    expiresHours: 72,
    undoHours: 24,
  },
  "gbp.post.create": {
    connector: "GBP",
    risk: r(0, 20, 20, 40, 0),
    defaultMode: "ASK",
    alwaysEligible: true,
    verifyBy: "GET localPost state=LIVE",
    expiresHours: 72,
    undoHours: 24,
  },
  "gbp.profile.description.update": {
    connector: "GBP",
    risk: r(0, 30, 20, 50, 0),
    defaultMode: "ASK",
    alwaysEligible: false,
    verifyBy: "GET location",
    expiresHours: 72,
    undoHours: 24,
  },
  "ig.post.publish": {
    connector: "INSTAGRAM",
    risk: r(0, 20, 70, 50, 0),
    defaultMode: "ASK",
    alwaysEligible: false,
    verifyBy: "GET /{media-id}?fields=permalink",
    expiresHours: 72,
    undoHours: 0,
  },
  "fb.post.publish": {
    connector: "FACEBOOK",
    risk: r(0, 20, 40, 50, 0),
    defaultMode: "ASK",
    alwaysEligible: false,
    verifyBy: "GET post",
    expiresHours: 72,
    undoHours: 24,
  },
  "email.send.supplier": {
    connector: "EMAIL",
    risk: r(30, 0, 100, 30, 30),
    defaultMode: "ASK",
    alwaysEligible: false,
    verifyBy: "Resend email.delivered webhook",
    expiresHours: 72,
    undoHours: 0,
  },
  "guest.reply.send": {
    connector: "WHATSAPP",
    risk: r(0, 40, 100, 40, 0),
    defaultMode: "ASK",
    alwaysEligible: true,
    verifyBy: "wamid delivered status",
    expiresHours: 24,
    undoHours: 0,
  },
  "pos.item.86": {
    connector: "POS",
    risk: r(50, 50, 30, 20, 60),
    defaultMode: "ASK",
    alwaysEligible: false,
    verifyBy: "GET catalog item",
    expiresHours: 12,
    undoHours: 24,
  },
  "pos.item.price.update": {
    connector: "POS",
    risk: r(50, 50, 30, 20, 60),
    defaultMode: "ASK",
    alwaysEligible: false,
    verifyBy: "GET catalog item",
    expiresHours: 72,
    undoHours: 24,
  },
  "calendar.event.create": {
    connector: "GOOGLE_CALENDAR",
    risk: r(0, 10, 20, 0, 20),
    defaultMode: "ASK",
    alwaysEligible: true,
    verifyBy: "GET event",
    expiresHours: 72,
    undoHours: 24,
  },
};

export function isActionType(value: string): value is ActionType {
  return (ACTION_TYPES as readonly string[]).includes(value);
}

export function actionTypeSpec(actionType: ActionType): ActionTypeSpec {
  return ACTION_TYPE_SPECS[actionType];
}

export function riskFor(actionType: ActionType): number {
  return Math.round(actionRisk(ACTION_TYPE_SPECS[actionType].risk));
}
