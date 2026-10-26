import type { OsAction, OsPermissionGrant, Prisma } from "@prisma/client";
import { ACTION_TYPE_SPECS, isActionType, type ActionType, type Connector } from "@/lib/agent/action-types";
import { prisma } from "@/lib/db/prisma";
import { isAssisted, publishMode } from "@/lib/agent/publish-mode";
import { flag } from "@/lib/flags";
import { utcOffsetMinutesAt } from "@/lib/geo/timezone";
import { LEGACY_ACTION_KEY, osRoleFor, roleAllows } from "@/lib/os/permissions";
import { autonomyFromReliability, type AutonomyBand } from "@/lib/os/reliability";
import { riskRequiresApproval } from "@/lib/os/risk";

export type PolicyDecision = "AUTO" | "ASK" | "DENY";

export type PolicyResult = {
  decision: PolicyDecision;
  reason:
    | "needs_connection"
    | "role"
    | "rule"
    | "safety"
    | "high_risk"
    | "risk_floor"
    | "reliability"
    | "cost_cap"
    | "grant"
    | "no_grant"
    | "assisted";
  risk: number;
  grantId?: string;
  /** `web` = must be confirmed in the web app (risk ≥ 76). */
  confirm?: "web";
};

/** What the review (or message) is about. Severity ≥ 2 or a safety topic always asks. */
export type PolicySubject = { rating?: number; severity?: number; safety?: boolean };

export type GrantView = Pick<
  OsPermissionGrant,
  "id" | "actionType" | "scope" | "taskKey" | "limitsJson" | "expiresAt" | "revokedAt"
>;

export type PolicyContext = {
  actionType: ActionType;
  risk: number;
  connectorHealthy: boolean;
  teamRole: string;
  neverRule: boolean;
  subject: PolicySubject;
  grants: GrantView[];
  taskKey?: string | null;
  /** Actions of this type already approved/run today (local day), for `maxPerDay`. */
  todayCount: number;
  reliability: { score: number; sampleN: number } | null;
  costCapReached: boolean;
  now: Date;
  /** Assisted mode: the owner posts it on Google by hand, so it always waits for them and needs no connection. */
  assisted?: boolean;
};

/** New workflows stay at `suggest` until they have this many verified runs. */
export const MIN_RELIABILITY_SAMPLES = 5;

export function reliabilityBand(r: PolicyContext["reliability"]): AutonomyBand {
  if (!r || r.sampleN < MIN_RELIABILITY_SAMPLES) return "suggest";
  return autonomyFromReliability(r.score);
}

type Limits = { minRating?: number; maxPerDay?: number; excludeSeverityGte?: number };

function limitsOk(limits: Limits, ctx: PolicyContext): boolean {
  if (limits.minRating != null && (ctx.subject.rating == null || ctx.subject.rating < limits.minRating)) return false;
  if (limits.excludeSeverityGte != null && (ctx.subject.severity ?? 0) >= limits.excludeSeverityGte) return false;
  if (limits.maxPerDay != null && ctx.todayCount >= limits.maxPerDay) return false;
  return true;
}

export function matchingGrant(ctx: PolicyContext): GrantView | null {
  const live = ctx.grants.filter(
    (g) => g.actionType === ctx.actionType && !g.revokedAt && (!g.expiresAt || g.expiresAt > ctx.now),
  );
  const task = live.find((g) => g.scope === "TASK" && !!ctx.taskKey && g.taskKey === ctx.taskKey);
  if (task) return task;
  if (!ACTION_TYPE_SPECS[ctx.actionType].alwaysEligible) return null;
  return live.find((g) => g.scope === "ALWAYS" && limitsOk((g.limitsJson ?? {}) as Limits, ctx)) ?? null;
}

/** Spec 1 §7.7 steps 1–9. First match wins. Pure: everything it needs is in `ctx`. */
export function decide(ctx: PolicyContext): PolicyResult {
  const { risk } = ctx;
  if (!ctx.connectorHealthy && !ctx.assisted) return { decision: "DENY", reason: "needs_connection", risk };
  if (!roleAllows(osRoleFor(ctx.teamRole), ctx.actionType)) return { decision: "DENY", reason: "role", risk };
  if (ctx.neverRule) return { decision: "DENY", reason: "rule", risk };
  // Nothing goes out by itself when the owner is the one who posts it.
  if (ctx.assisted) return { decision: "ASK", reason: "assisted", risk };
  if ((ctx.subject.severity ?? 0) >= 2 || ctx.subject.safety) return { decision: "ASK", reason: "safety", risk };
  if (risk >= 76) return { decision: "ASK", reason: "high_risk", risk, confirm: "web" };

  const grant = matchingGrant(ctx);
  if (!grant) return { decision: "ASK", reason: "no_grant", risk };
  // A grant lowers friction only below the risk floor; it never overrides it.
  if (riskRequiresApproval(risk, "AUTO_WITH_LIMITS")) return { decision: "ASK", reason: "risk_floor", risk, grantId: grant.id };

  const band = reliabilityBand(ctx.reliability);
  if (band === "insight" || band === "suggest") return { decision: "ASK", reason: "reliability", risk, grantId: grant.id };
  if (ctx.costCapReached) return { decision: "ASK", reason: "cost_cap", risk, grantId: grant.id };
  return { decision: "AUTO", reason: "grant", risk, grantId: grant.id };
}

/** Local midnight for `timezone`, as a UTC instant. */
export function startOfLocalDay(timezone: string, now: Date): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const base = Date.parse(`${ymd}T00:00:00Z`);
  // Offset at midnight can differ from the offset now on DST-change days; two passes settle it.
  let t = base - utcOffsetMinutesAt(timezone, new Date(base)) * 60_000;
  t = base - utcOffsetMinutesAt(timezone, new Date(t)) * 60_000;
  return new Date(t);
}

/** Connector health until the Integration Hub (T-80) owns it: an Integration row or KOB-level config. */
export async function connectorHealthy(restaurantId: string, connector: Connector, payload: unknown): Promise<boolean> {
  const integration = (provider: Prisma.IntegrationWhereInput["provider"]) =>
    prisma.integration.count({ where: { restaurantId, provider } }).then((n) => n > 0);
  switch (connector) {
    case "EMAIL":
      return Boolean(process.env.RESEND_API_KEY?.trim());
    case "WHATSAPP":
      return flag("WHATSAPP_LIVE", restaurantId);
    case "GOOGLE_CALENDAR":
      return integration("GOOGLE_CALENDAR");
    case "INSTAGRAM":
      return (await flag("INSTAGRAM_PUBLISH_LIVE", restaurantId)) && integration("INSTAGRAM");
    case "POS": {
      const provider = (payload as { provider?: string } | null)?.provider;
      return provider === "SQUARE" || provider === "TOAST" ? integration(provider) : false;
    }
    case "GBP":
      // A listing must be picked (PENDING_SETUP otherwise) before anything can be posted to it.
      return (
        (await flag("GBP_LIVE", restaurantId)) &&
        (await prisma.integration.count({ where: { restaurantId, provider: "GBP", status: { in: ["CONNECTED", "DEGRADED"] }, externalAccountId: { not: null } } })) > 0
      );
    case "FACEBOOK":
      return false;
  }
}

export type PolicyDeps = {
  connectorHealthy?: typeof connectorHealthy;
  costCapReached?: (restaurantId: string) => Promise<boolean>;
  now?: Date;
};

/** Build the context for a stored action. `subject` comes from the `policy.subject` evidence row. */
export async function loadPolicyContext(action: OsAction, deps: PolicyDeps = {}): Promise<PolicyContext> {
  if (!isActionType(action.actionType)) throw new Error(`Unknown action type ${action.actionType}`);
  const actionType = action.actionType;
  const now = deps.now ?? new Date();
  const legacy = LEGACY_ACTION_KEY[actionType];

  const [restaurant, member, rules, grants, subjectRow, reliability] = await Promise.all([
    prisma.restaurant.findUniqueOrThrow({ where: { id: action.restaurantId }, select: { timezone: true } }),
    action.requestedByUserId
      ? prisma.teamMember.findUnique({
          where: { userId_restaurantId: { userId: action.requestedByUserId, restaurantId: action.restaurantId } },
          select: { role: true },
        })
      : null,
    prisma.osRestaurantRule.count({
      where: {
        restaurantId: action.restaurantId,
        active: true,
        permissionLevel: "NEVER",
        OR: [{ subjectType: { in: [actionType, legacy].filter(Boolean) } }, { ruleType: actionType }],
      },
    }),
    prisma.osPermissionGrant.findMany({
      where: { restaurantId: action.restaurantId, actionType, revokedAt: null },
    }),
    prisma.osDecisionEvidence.findFirst({ where: { actionId: action.id, evidenceType: "policy.subject" } }),
    prisma.osWorkflowReliability.findUnique({
      where: { restaurantId_workflowId: { restaurantId: action.restaurantId, workflowId: actionType } },
      select: { score: true, sampleN: true },
    }),
  ]);

  const todayCount = await prisma.osAction.count({
    where: {
      restaurantId: action.restaurantId,
      actionType,
      id: { not: action.id },
      approvedAt: { gte: startOfLocalDay(restaurant.timezone, now) },
      status: { notIn: ["REJECTED", "FAILED"] },
    },
  });

  return {
    actionType,
    risk: action.riskScore,
    connectorHealthy: await (deps.connectorHealthy ?? connectorHealthy)(
      action.restaurantId,
      ACTION_TYPE_SPECS[actionType].connector,
      action.proposedPayload,
    ),
    assisted: isAssisted(action, await publishMode(action.restaurantId)),
    // Scheduled / event-driven proposals act for the owner; requests from a person use their role.
    teamRole: member?.role ?? (action.requestedByUserId ? "MEMBER" : "OWNER"),
    neverRule: rules > 0,
    subject: (subjectRow?.valueJson ?? {}) as PolicySubject,
    grants,
    taskKey: action.taskKey,
    todayCount,
    reliability,
    costCapReached: deps.costCapReached ? await deps.costCapReached(action.restaurantId) : false,
    now,
  };
}

/** Decide for a stored action and write the `policy.decided` audit event. */
export async function evaluatePolicy(action: OsAction, deps: PolicyDeps = {}): Promise<PolicyResult> {
  const result = decide(await loadPolicyContext(action, deps));
  await prisma.osAuditEvent.create({
    data: {
      restaurantId: action.restaurantId,
      actionId: action.id,
      kind: "policy.decided",
      payload: { ...result },
    },
  });
  return result;
}
