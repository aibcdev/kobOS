import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { riskFor, type ActionType } from "@/lib/agent/action-types";
import { decide, startOfLocalDay, type GrantView, type PolicyContext, type PolicyResult } from "@/lib/agent/policy";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

const NOW = new Date("2026-10-19T12:00:00Z");
const HOUR = 3_600_000;

function grant(over: Partial<GrantView> = {}): GrantView {
  return {
    id: "g1",
    actionType: "gbp.review.reply",
    scope: "ALWAYS",
    taskKey: null,
    limitsJson: { minRating: 4, maxPerDay: 20, excludeSeverityGte: 2 },
    expiresAt: null,
    revokedAt: null,
    ...over,
  };
}

function ctx(over: Partial<PolicyContext> = {}): PolicyContext {
  const actionType: ActionType = over.actionType ?? "gbp.review.reply";
  return {
    actionType,
    risk: riskFor(actionType),
    connectorHealthy: true,
    teamRole: "OWNER",
    neverRule: false,
    subject: { rating: 5, severity: 0 },
    grants: [],
    taskKey: null,
    todayCount: 0,
    reliability: { score: 0.95, sampleN: 10 },
    costCapReached: false,
    now: NOW,
    ...over,
  };
}

const task = (taskKey: string, over: Partial<GrantView> = {}) =>
  grant({ scope: "TASK", taskKey, limitsJson: {}, expiresAt: new Date(NOW.getTime() + 20 * HOUR), ...over });

type Row = [name: string, context: PolicyContext, decision: PolicyResult["decision"], reason: PolicyResult["reason"]];

const rows: Row[] = [
  ["no grant asks", ctx(), "ASK", "no_grant"],
  ["disconnected connector denies", ctx({ connectorHealthy: false, grants: [grant()] }), "DENY", "needs_connection"],
  ["STAFF changing hours is denied", ctx({ actionType: "gbp.hours.regular.update", teamRole: "MEMBER" }), "DENY", "role"],
  ["STAFF replying to a review is denied", ctx({ teamRole: "MEMBER", grants: [grant()] }), "DENY", "role"],
  ["GM with an ALWAYS grant auto-runs", ctx({ teamRole: "ADMIN", grants: [grant()] }), "AUTO", "grant"],
  ["a NEVER rule denies even with a grant", ctx({ neverRule: true, grants: [grant()] }), "DENY", "rule"],
  ["severity ≥ 2 asks even with ALWAYS", ctx({ subject: { rating: 5, severity: 2 }, grants: [grant()] }), "ASK", "safety"],
  ["allergen/illness topic asks", ctx({ subject: { rating: 5, safety: true }, grants: [grant()] }), "ASK", "safety"],
  ["risk ≥ 76 asks", ctx({ risk: 80, grants: [grant()] }), "ASK", "high_risk"],
  ["risk exactly 76 asks", ctx({ risk: 76 }), "ASK", "high_risk"],
  ["ALWAYS grant, 5★ auto-runs", ctx({ grants: [grant()] }), "AUTO", "grant"],
  ["ALWAYS grant, 3★ is below minRating", ctx({ subject: { rating: 3 }, grants: [grant()] }), "ASK", "no_grant"],
  ["ALWAYS grant, unknown rating asks", ctx({ subject: {}, grants: [grant()] }), "ASK", "no_grant"],
  ["ALWAYS grant, daily cap reached", ctx({ todayCount: 20, grants: [grant()] }), "ASK", "no_grant"],
  ["ALWAYS grant, one under the cap", ctx({ todayCount: 19, grants: [grant()] }), "AUTO", "grant"],
  ["revoked ALWAYS grant asks", ctx({ grants: [grant({ revokedAt: new Date(NOW.getTime() - HOUR) })] }), "ASK", "no_grant"],
  ["expired ALWAYS grant asks", ctx({ grants: [grant({ expiresAt: new Date(NOW.getTime() - 1) })] }), "ASK", "no_grant"],
  ["unexpired ALWAYS grant auto-runs", ctx({ grants: [grant({ expiresAt: new Date(NOW.getTime() + HOUR) })] }), "AUTO", "grant"],
  ["TASK grant with the same taskKey", ctx({ taskKey: "reply-5-star", grants: [task("reply-5-star")] }), "AUTO", "grant"],
  ["TASK grant for another task", ctx({ taskKey: "reply-5-star", grants: [task("xmas-hours")] }), "ASK", "no_grant"],
  ["TASK grant but action has no taskKey", ctx({ grants: [task("reply-5-star")] }), "ASK", "no_grant"],
  [
    "expired TASK grant asks",
    ctx({ taskKey: "t", grants: [task("t", { expiresAt: new Date(NOW.getTime() - HOUR) })] }),
    "ASK",
    "no_grant",
  ],
  [
    "ALWAYS not offered for reply deletes",
    ctx({ actionType: "gbp.review.reply.delete", grants: [grant({ actionType: "gbp.review.reply.delete" })] }),
    "ASK",
    "no_grant",
  ],
  [
    "TASK grant on hours (risk 39) auto-runs",
    ctx({ actionType: "gbp.hours.regular.update", taskKey: "t", grants: [task("t", { actionType: "gbp.hours.regular.update" })] }),
    "AUTO",
    "grant",
  ],
  ["a grant never overrides the risk floor (risk 60)", ctx({ risk: 60, grants: [grant()] }), "ASK", "risk_floor"],
  ["grant but no reliability history", ctx({ reliability: null, grants: [grant()] }), "ASK", "reliability"],
  ["grant but only 4 verified runs", ctx({ reliability: { score: 0.99, sampleN: 4 }, grants: [grant()] }), "ASK", "reliability"],
  ["grant but insight band", ctx({ reliability: { score: 0.8, sampleN: 30 }, grants: [grant()] }), "ASK", "reliability"],
  ["grant but suggest band", ctx({ reliability: { score: 0.9, sampleN: 30 }, grants: [grant()] }), "ASK", "reliability"],
  ["grant but monthly cost cap reached", ctx({ costCapReached: true, grants: [grant()] }), "ASK", "cost_cap"],
  ["grant for a different action type", ctx({ grants: [grant({ actionType: "gbp.post.create" })] }), "ASK", "no_grant"],
  [
    "ALWAYS on guest replies (eligible) auto-runs",
    ctx({ actionType: "guest.reply.send", risk: 30, grants: [grant({ actionType: "guest.reply.send", limitsJson: {} })] }),
    "AUTO",
    "grant",
  ],
];

describe("policy.decide (Spec 1 §7.7)", () => {
  it("has at least 25 rows", () => expect(rows.length).toBeGreaterThanOrEqual(25));

  it.each(rows)("%s", (_name, context, decision, reason) => {
    const result = decide(context);
    expect(result.decision).toBe(decision);
    expect(result.reason).toBe(reason);
  });

  it("risk ≥ 76 needs web confirmation", () => {
    expect(decide(ctx({ risk: 90 })).confirm).toBe("web");
  });

  it("reports which grant allowed it", () => {
    expect(decide(ctx({ grants: [grant({ id: "grant-42" })] })).grantId).toBe("grant-42");
  });
});

describe("startOfLocalDay", () => {
  it("London midnight on the BST → GMT change day", () => {
    expect(startOfLocalDay("Europe/London", new Date("2026-10-25T10:00:00Z")).toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(startOfLocalDay("Europe/London", new Date("2026-10-26T10:00:00Z")).toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });

  it("New York midnight", () => {
    expect(startOfLocalDay("America/New_York", new Date("2026-07-01T03:00:00Z")).toISOString()).toBe("2026-06-30T04:00:00.000Z");
  });
});

describeDb("evaluatePolicy on Postgres", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let restaurantId: string;
  let userId: string;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    ({
      restaurant: { id: restaurantId },
      userId,
    } = await seedRestaurant(prisma));
  });
  afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  it("reads grants, subject and reliability from the DB and audits the decision", async () => {
    const { createProposal } = await import("@/lib/agent/ledger");
    const { evaluatePolicy } = await import("@/lib/agent/policy");
    const healthy = async () => true;
    const payload = { actionType: "gbp.review.reply", reviewId: "rv-1", replyText: "Thank you, see you soon!" };

    const first = await createProposal({ restaurantId, title: "Reply", payload, subject: { rating: 5, severity: 0 } });
    expect((await evaluatePolicy(first, { connectorHealthy: healthy })).reason).toBe("no_grant");

    await prisma.osPermissionGrant.create({
      data: {
        restaurantId,
        actionType: "gbp.review.reply",
        connector: "GBP",
        scope: "ALWAYS",
        limitsJson: { minRating: 4, maxPerDay: 20, excludeSeverityGte: 2 },
        grantedByUserId: userId,
      },
    });
    expect((await evaluatePolicy(first, { connectorHealthy: healthy })).reason).toBe("reliability");

    await prisma.osWorkflowReliability.create({
      data: { restaurantId, workflowId: "gbp.review.reply", score: 0.95, sampleN: 8 },
    });
    expect((await evaluatePolicy(first, { connectorHealthy: healthy })).decision).toBe("AUTO");

    const severe = await createProposal({
      restaurantId,
      title: "Reply",
      payload: { ...payload, reviewId: "rv-2" },
      subject: { rating: 5, severity: 3 },
    });
    expect((await evaluatePolicy(severe, { connectorHealthy: healthy })).reason).toBe("safety");

    const audits = await prisma.osAuditEvent.count({ where: { actionId: first.id, kind: "policy.decided" } });
    expect(audits).toBe(3);
  });

  it("GBP is not connected until the GBP connector exists", async () => {
    const { createProposal } = await import("@/lib/agent/ledger");
    const { evaluatePolicy } = await import("@/lib/agent/policy");
    const a = await createProposal({
      restaurantId,
      title: "Reply",
      payload: { actionType: "gbp.review.reply", reviewId: "rv-3", replyText: "Thanks!" },
    });
    expect(await evaluatePolicy(a)).toMatchObject({ decision: "DENY", reason: "needs_connection" });
  });
});
