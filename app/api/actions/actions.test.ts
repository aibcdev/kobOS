import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { describeDb, seedRestaurant } from "@/tests/helpers/db";

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  // These tests cover automatic posting (GBP_LIVE on); assisted mode has its own tests.
  process.env.GBP_LIVE = "1";
});

const state = vi.hoisted(() => ({ userId: null as string | null, send: vi.fn() }));

vi.mock("@/lib/auth/api-session", () => ({
  requireApiUser: async () =>
    state.userId ? { ok: true, userId: state.userId } : { ok: false, status: 401, message: "Unauthorized" },
}));
vi.mock("@/inngest/client", () => ({ inngest: { send: state.send } }));

const ORIGIN = "https://trykob.com";

function req(path: string, init: { method?: string; body?: unknown; origin?: string | null } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  return new Request(`${ORIGIN}${path}`, {
    method: init.method ?? "POST",
    headers,
    body: init.method === "GET" ? undefined : JSON.stringify(init.body ?? {}),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("/api/actions without a session", () => {
  it("returns 401", async () => {
    state.userId = null;
    const { GET } = await import("@/app/api/actions/[id]/route");
    expect((await GET(req("/api/actions/x", { method: "GET" }), params("x"))).status).toBe(401);
  });
});

describeDb("/api/actions on Postgres", () => {
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let ledger: typeof import("@/lib/agent/ledger");
  let own: { restaurantId: string; userId: string };
  let other: { restaurantId: string; userId: string };
  let n = 0;

  beforeAll(async () => {
    prisma = (await import("@/lib/db/prisma")).prisma;
    ledger = await import("@/lib/agent/ledger");
    const a = await seedRestaurant(prisma);
    const b = await seedRestaurant(prisma);
    own = { restaurantId: a.restaurant.id, userId: a.userId };
    other = { restaurantId: b.restaurant.id, userId: b.userId };
  });
  afterAll(async () => {
    await prisma.restaurant.deleteMany({ where: { id: { in: [own.restaurantId, other.restaurantId] } } });
    await prisma.$disconnect();
  });
  beforeEach(() => {
    state.userId = own.userId;
    state.send.mockClear();
  });

  const propose = (over: { taskKey?: string; restaurantId?: string } = {}) =>
    ledger.createProposal({
      restaurantId: over.restaurantId ?? own.restaurantId,
      title: "Reply to a 5★ review",
      taskKey: over.taskKey,
      payload: { actionType: "gbp.review.reply", reviewId: `rv-${++n}`, replyText: "Thanks for visiting!" },
    });

  it("GET returns the owner-facing status", async () => {
    const a = await propose();
    const { GET } = await import("@/app/api/actions/[id]/route");
    const res = await GET(req(`/api/actions/${a.id}`, { method: "GET" }), params(a.id));
    expect(res.status).toBe(200);
    expect((await res.json()).action).toMatchObject({ status: "AWAITING_APPROVAL", ownerStatus: "Draft only — needs your yes." });
  });

  it("approving twice is idempotent and enqueues once", async () => {
    const a = await propose();
    const { POST } = await import("@/app/api/actions/[id]/approve/route");
    const first = await POST(req(`/api/actions/${a.id}/approve`), params(a.id));
    const second = await POST(req(`/api/actions/${a.id}/approve`), params(a.id));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await second.json()).alreadyApproved).toBe(true);
    expect(state.send).toHaveBeenCalledTimes(1);
    expect(state.send.mock.calls[0][0]).toMatchObject({ name: "kob/action.approved", data: { actionId: a.id } });
    expect((await ledger.getAction(a.id))?.status).toBe("APPROVED");
  });

  it("another tenant gets 404 on every route", async () => {
    const a = await propose();
    state.userId = other.userId;
    const routes = {
      get: (await import("@/app/api/actions/[id]/route")).GET,
      approve: (await import("@/app/api/actions/[id]/approve/route")).POST,
      reject: (await import("@/app/api/actions/[id]/reject/route")).POST,
      undo: (await import("@/app/api/actions/[id]/undo/route")).POST,
    };
    expect((await routes.get(req("/x", { method: "GET" }), params(a.id))).status).toBe(404);
    expect((await routes.approve(req("/x"), params(a.id))).status).toBe(404);
    expect((await routes.reject(req("/x", { body: { reason: "no" } }), params(a.id))).status).toBe(404);
    expect((await routes.undo(req("/x"), params(a.id))).status).toBe(404);
    const { GET: list } = await import("@/app/api/actions/route");
    expect((await list(req(`/api/actions?restaurantId=${own.restaurantId}`, { method: "GET" }))).status).toBe(404);
    expect(state.send).not.toHaveBeenCalled();
    expect((await ledger.getAction(a.id))?.status).toBe("AWAITING_APPROVAL");
  });

  it("refuses a cross-origin approve", async () => {
    const a = await propose();
    const { POST } = await import("@/app/api/actions/[id]/approve/route");
    expect((await POST(req("/x", { origin: "https://evil.example" }), params(a.id))).status).toBe(403);
  });

  it("risk ≥ 51 needs slide-to-confirm", async () => {
    const a = await propose();
    await prisma.osAction.update({ where: { id: a.id }, data: { riskScore: 60 } });
    const { POST } = await import("@/app/api/actions/[id]/approve/route");
    const res = await POST(req("/x"), params(a.id));
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("slide_required");
    expect((await POST(req("/x", { body: { confirm: "slide" } }), params(a.id))).status).toBe(200);
  });

  it("TASK scope creates a 24h task grant; ALWAYS mirrors into OsActionPermission", async () => {
    const { POST } = await import("@/app/api/actions/[id]/approve/route");
    const t = await propose({ taskKey: "reply-all-5-star" });
    expect((await POST(req("/x", { body: { scope: "TASK" } }), params(t.id))).status).toBe(200);
    const taskGrant = await prisma.osPermissionGrant.findFirstOrThrow({ where: { restaurantId: own.restaurantId, scope: "TASK" } });
    expect(taskGrant.taskKey).toBe("reply-all-5-star");
    expect(taskGrant.expiresAt!.getTime() - taskGrant.grantedAt.getTime()).toBe(24 * 3_600_000);

    const noTask = await propose();
    expect((await POST(req("/x", { body: { scope: "TASK" } }), params(noTask.id))).status).toBe(422);

    const always = await propose();
    expect((await POST(req("/x", { body: { scope: "ALWAYS", limits: { minRating: 5 } } }), params(always.id))).status).toBe(200);
    const g = await prisma.osPermissionGrant.findFirstOrThrow({ where: { restaurantId: own.restaurantId, scope: "ALWAYS" } });
    expect(g.limitsJson).toMatchObject({ minRating: 5, maxPerDay: 20, excludeSeverityGte: 2 });
    const mirror = await prisma.osActionPermission.findFirstOrThrow({ where: { restaurantId: own.restaurantId } });
    expect(mirror.mode).toBe("AUTO_WITH_LIMITS");
  });

  it("ALWAYS is refused for action types that aren't eligible", async () => {
    const a = await ledger.createProposal({
      restaurantId: own.restaurantId,
      title: "Delete reply",
      payload: { actionType: "gbp.review.reply.delete", reviewId: "rv-del" },
    });
    const { POST } = await import("@/app/api/actions/[id]/approve/route");
    const res = await POST(req("/x", { body: { scope: "ALWAYS" } }), params(a.id));
    expect(res.status).toBe(422);
    expect((await ledger.getAction(a.id))?.status).toBe("AWAITING_APPROVAL");
  });

  it("reject needs a reason and is terminal", async () => {
    const a = await propose();
    const { POST } = await import("@/app/api/actions/[id]/reject/route");
    expect((await POST(req("/x", { body: {} }), params(a.id))).status).toBe(422);
    const res = await POST(req("/x", { body: { reason: "wrong tone" } }), params(a.id));
    expect((await res.json()).action.status).toBe("REJECTED");
    const { POST: approve } = await import("@/app/api/actions/[id]/approve/route");
    expect((await approve(req("/x"), params(a.id))).status).toBe(409);
  });

  it("undo proposes and approves the inverse action within the window", async () => {
    const a = await propose();
    await prisma.osAction.update({
      where: { id: a.id },
      data: {
        status: "VERIFIED",
        approvedAt: new Date(),
        verifiedAt: new Date(),
        undoUntil: new Date(Date.now() + 3_600_000),
        rollbackPayload: { actionType: "gbp.review.reply.delete", reviewId: "rv-undo" },
      },
    });
    const { POST } = await import("@/app/api/actions/[id]/undo/route");
    const res = await POST(req("/x"), params(a.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toMatchObject({ actionType: "gbp.review.reply.delete", status: "APPROVED" });
    const link = await prisma.osDecisionEvidence.findFirst({ where: { actionId: body.action.id, evidenceType: "rollback.of" } });
    expect(link?.sourceId).toBe(a.id);
    expect(state.send).toHaveBeenCalledTimes(1);

    await prisma.osAction.update({ where: { id: a.id }, data: { undoUntil: new Date(Date.now() - 1) } });
    expect((await POST(req("/x"), params(a.id))).status).toBe(409);
  });

  it("lists with status filters", async () => {
    const { GET } = await import("@/app/api/actions/route");
    const res = await GET(req(`/api/actions?restaurantId=${own.restaurantId}&status=needs_you`, { method: "GET" }));
    const { actions } = await res.json();
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((a: { status: string }) => a.status === "AWAITING_APPROVAL")).toBe(true);
  });
});
